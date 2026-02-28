import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { getDb, hashPassword } from './db.js';
import { sortByPriority, chatWithContext, isConfigured } from './groq.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ---- Session store ----
const sessions = new Map(); // token -> { username, createdAt }

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const token = header.slice(7);
    const session = sessions.get(token);
    if (!session) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.adminUser = session.username;
    next();
}

// --- Helper ---
function generateId() {
    const ts = Date.now().toString().slice(-8);
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `RL-${ts}-${rand}`;
}

function rowToJson(row) {
    return {
        id: row.id,
        name: row.name,
        village: row.village,
        camp: row.camp,
        familyCount: row.family_count,
        injured: !!row.injured,
        injuryDescription: row.injury_description,
        trapped: !!row.trapped,
        trappedDescription: row.trapped_description,
        needs: JSON.parse(row.needs || '[]'),
        timestamp: row.timestamp,
        rescueDispatched: !!row.rescue_dispatched,
        medicalDispatched: !!row.medical_dispatched,
    };
}

// --- Levenshtein for search ---
function levenshtein(a, b) {
    const la = a.length, lb = b.length;
    const dp = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));
    for (let i = 0; i <= la; i++) dp[i][0] = i;
    for (let j = 0; j <= lb; j++) dp[0][j] = j;
    for (let i = 1; i <= la; i++) {
        for (let j = 1; j <= lb; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[la][lb];
}

// ============================
// ROUTES
// ============================

// GET /api/registrations — all registrations
app.get('/api/registrations', (req, res) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM registrations ORDER BY timestamp DESC').all();
    res.json(rows.map(rowToJson));
});

// POST /api/registrations — create new registration
app.post('/api/registrations', (req, res) => {
    const db = getDb();
    const { name, village, camp, familyCount, injured, injuryDescription, trapped, trappedDescription, needs } = req.body;

    if (!name || !camp) {
        return res.status(400).json({ error: 'Name and camp are required' });
    }

    const id = generateId();
    const timestamp = new Date().toISOString();

    db.prepare(`
    INSERT INTO registrations (id, name, village, camp, family_count, injured, injury_description, trapped, trapped_description, needs, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        id,
        name,
        village || '',
        camp,
        familyCount || 1,
        injured ? 1 : 0,
        injuryDescription || '',
        trapped ? 1 : 0,
        trappedDescription || '',
        JSON.stringify(needs || []),
        timestamp
    );

    // Update resource allocation for the camp
    const campRow = db.prepare('SELECT id FROM camps WHERE name = ?').get(camp);
    if (campRow && needs && needs.length > 0) {
        const parsedNeeds = Array.isArray(needs) ? needs : JSON.parse(needs);
        const updates = [];
        parsedNeeds.forEach(n => {
            const upper = n.toUpperCase();
            if (upper === 'FOOD' || upper.includes('FOOD')) updates.push('food_allocated = food_allocated + 1');
            if (upper === 'WATER' || upper.includes('WATER')) updates.push('water_allocated = water_allocated + 1');
            if (upper === 'MEDICINE' || upper.includes('MEDICINE')) updates.push('medicine_allocated = medicine_allocated + 1');
        });
        if (updates.length > 0) {
            db.prepare(`UPDATE camp_resources SET ${updates.join(', ')} WHERE camp_id = ?`).run(campRow.id);
        }
    }

    res.status(201).json(rowToJson(
        db.prepare('SELECT * FROM registrations WHERE id = ?').get(id)
    ));
});

// GET /api/stats — summary statistics
app.get('/api/stats', (req, res) => {
    const db = getDb();

    const totalSurvivors = db.prepare('SELECT COALESCE(SUM(family_count), 0) as total FROM registrations').get().total;
    const totalRegistrations = db.prepare('SELECT COUNT(*) as count FROM registrations').get().count;
    const trappedCount = db.prepare('SELECT COUNT(*) as count FROM registrations WHERE trapped = 1').get().count;
    const medicalCount = db.prepare('SELECT COUNT(*) as count FROM registrations WHERE injured = 1').get().count;

    const campRows = db.prepare(`
    SELECT camp, COUNT(*) as count, MAX(timestamp) as last_time,
           SUM(CASE WHEN injured = 1 THEN 1 ELSE 0 END) as medical
    FROM registrations GROUP BY camp
  `).all();

    const campStats = {};
    campRows.forEach(r => {
        campStats[r.camp] = {
            count: r.count,
            lastTime: r.last_time,
            medicalEmergencies: r.medical,
        };
    });

    // Add resource and dispatch data per camp
    const campResources = db.prepare(`
        SELECT c.name, cr.food_total, cr.food_allocated, cr.water_total, cr.water_allocated,
               cr.medicine_total, cr.medicine_allocated
        FROM camps c LEFT JOIN camp_resources cr ON cr.camp_id = c.id
    `).all();
    campResources.forEach(cr => {
        if (!campStats[cr.name]) campStats[cr.name] = { count: 0, lastTime: null, medicalEmergencies: 0 };
        campStats[cr.name].foodRemaining = (cr.food_total || 0) - (cr.food_allocated || 0);
        campStats[cr.name].waterRemaining = (cr.water_total || 0) - (cr.water_allocated || 0);
        campStats[cr.name].medicineRemaining = (cr.medicine_total || 0) - (cr.medicine_allocated || 0);
    });

    const campDispatches = db.prepare(`
        SELECT c.name, d.type, COUNT(*) as cnt
        FROM dispatch_log d JOIN camps c ON c.id = d.camp_id
        WHERE d.status = 'Dispatched'
        GROUP BY c.name, d.type
    `).all();
    campDispatches.forEach(d => {
        if (!campStats[d.name]) campStats[d.name] = { count: 0, lastTime: null, medicalEmergencies: 0 };
        if (d.type === 'rescue') campStats[d.name].activeRescue = d.cnt;
        if (d.type === 'medical') campStats[d.name].activeMedical = d.cnt;
    });

    res.json({
        totalSurvivors,
        totalRegistrations,
        trappedCount,
        medicalCount,
        activeCamps: campRows.length,
        campStats,
    });
});

// GET /api/search?name=&village= — fuzzy search
app.get('/api/search', (req, res) => {
    const { name, village } = req.query;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name query is required' });
    }

    const db = getDb();
    const rows = db.prepare('SELECT * FROM registrations').all();
    const nameQ = name.toLowerCase().trim();
    const villageQ = (village || '').toLowerCase().trim();

    const results = [];

    rows.forEach(row => {
        const reg = rowToJson(row);
        const regName = reg.name.toLowerCase();
        let score = 0;
        let matched = false;

        // Exact substring match
        if (regName.includes(nameQ) || nameQ.includes(regName)) {
            score += 100;
            matched = true;
        }

        // Levenshtein on full name
        const dist = levenshtein(nameQ, regName);
        if (dist < 3) {
            score += (50 - dist * 15);
            matched = true;
        }

        // Token-level matching
        const queryTokens = nameQ.split(/\s+/);
        const regTokens = regName.split(/\s+/);
        queryTokens.forEach(qt => {
            regTokens.forEach(rt => {
                if (rt.includes(qt) || qt.includes(rt)) {
                    score += 30;
                    matched = true;
                } else if (levenshtein(qt, rt) < 3) {
                    score += 20;
                    matched = true;
                }
            });
        });

        // Village matching bonus
        if (villageQ && reg.village) {
            const regVillage = reg.village.toLowerCase();
            if (regVillage.includes(villageQ) || villageQ.includes(regVillage)) {
                score += 40;
                matched = true;
            } else if (levenshtein(villageQ, regVillage) < 3) {
                score += 20;
                matched = true;
            }
        }

        if (matched) results.push({ ...reg, score });
    });

    results.sort((a, b) => b.score - a.score);
    res.json(results);
});

// DELETE /api/registrations — delete by IDs
app.delete('/api/registrations', (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Array of IDs is required' });
    }

    const db = getDb();
    const placeholders = ids.map(() => '?').join(',');
    const result = db.prepare(`DELETE FROM registrations WHERE id IN (${placeholders})`).run(...ids);

    res.json({ deleted: result.changes });
});

// PUT /api/registrations/:id/dispatch — mark as dispatched (one type only)
app.put('/api/registrations/:id/dispatch', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { type } = req.body; // 'rescue' or 'medical'

    if (!type || !['rescue', 'medical'].includes(type)) {
        return res.status(400).json({ error: 'type must be "rescue" or "medical"' });
    }

    const reg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(id);
    if (!reg) return res.status(404).json({ error: 'Registration not found' });

    // Only update the specific dispatch column for this row
    const column = type === 'rescue' ? 'rescue_dispatched' : 'medical_dispatched';
    db.prepare(`UPDATE registrations SET ${column} = 1 WHERE id = ?`).run(id);
    res.json({ success: true, id, type, [column]: 1 });
});

// ============================
// AUTH ROUTES
// ============================

// POST /api/auth/login — authenticate admin
app.post('/api/auth/login', (req, res) => {
    const db = getDb();
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const inputHash = hashPassword(password);
    if (inputHash !== admin.password_hash) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken();
    sessions.set(token, { username: admin.username, createdAt: Date.now() });

    res.json({ token, username: admin.username });
});

// ============================
// CAMPS & ADMIN ROUTES
// ============================

// GET /api/camps — list all camps with team counts (public — needed by kiosk)
app.get('/api/camps', (req, res) => {
    const db = getDb();
    const rows = db.prepare(`
        SELECT c.*, cr.food_total, cr.food_allocated, cr.water_total, cr.water_allocated,
               cr.medicine_total, cr.medicine_allocated
        FROM camps c
        LEFT JOIN camp_resources cr ON cr.camp_id = c.id
        ORDER BY c.name
    `).all();
    res.json(rows);
});

// POST /api/camps — create a new camp (protected)
app.post('/api/camps', authMiddleware, (req, res) => {
    const db = getDb();
    const { name, medical_team_count, rescue_team_count } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Camp name is required' });

    const trimmedName = name.trim();

    // Explicit case-insensitive duplicate check
    const existing = db.prepare('SELECT id FROM camps WHERE LOWER(TRIM(name)) = LOWER(?)').get(trimmedName);
    if (existing) {
        return res.status(409).json({ error: 'Camp name already exists' });
    }

    try {
        const result = db.prepare('INSERT INTO camps (name, medical_team_count, rescue_team_count) VALUES (?, ?, ?)').run(
            trimmedName, medical_team_count || 3, rescue_team_count || 3
        );
        const campId = result.lastInsertRowid;
        db.prepare('INSERT INTO camp_resources (camp_id) VALUES (?)').run(campId);
        const camp = db.prepare(`
            SELECT c.*, cr.food_total, cr.food_allocated, cr.water_total, cr.water_allocated,
                   cr.medicine_total, cr.medicine_allocated
            FROM camps c LEFT JOIN camp_resources cr ON cr.camp_id = c.id WHERE c.id = ?
        `).get(campId);
        res.status(201).json(camp);
    } catch (e) {
        if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Camp name already exists' });
        throw e;
    }
});

// PUT /api/camps/:id — update camp settings (protected)
app.put('/api/camps/:id', authMiddleware, (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { medical_team_count, rescue_team_count, food_total, water_total, medicine_total } = req.body;

    const camp = db.prepare('SELECT * FROM camps WHERE id = ?').get(id);
    if (!camp) return res.status(404).json({ error: 'Camp not found' });

    if (medical_team_count !== undefined || rescue_team_count !== undefined) {
        db.prepare('UPDATE camps SET medical_team_count = ?, rescue_team_count = ? WHERE id = ?').run(
            medical_team_count ?? camp.medical_team_count,
            rescue_team_count ?? camp.rescue_team_count,
            id
        );
    }

    if (food_total !== undefined || water_total !== undefined || medicine_total !== undefined) {
        const cr = db.prepare('SELECT * FROM camp_resources WHERE camp_id = ?').get(id);
        db.prepare('UPDATE camp_resources SET food_total = ?, water_total = ?, medicine_total = ? WHERE camp_id = ?').run(
            food_total ?? cr.food_total,
            water_total ?? cr.water_total,
            medicine_total ?? cr.medicine_total,
            id
        );
    }

    const updated = db.prepare(`
        SELECT c.*, cr.food_total, cr.food_allocated, cr.water_total, cr.water_allocated,
               cr.medicine_total, cr.medicine_allocated
        FROM camps c LEFT JOIN camp_resources cr ON cr.camp_id = c.id WHERE c.id = ?
    `).get(id);
    res.json(updated);
});

// DELETE /api/camps/:id — delete camp and ALL related data (protected)
app.delete('/api/camps/:id', authMiddleware, (req, res) => {
    const db = getDb();
    const { id } = req.params;

    const camp = db.prepare('SELECT * FROM camps WHERE id = ?').get(id);
    if (!camp) return res.status(404).json({ error: 'Camp not found' });

    // Transaction: delete all related data then the camp itself
    const deleteCampTransaction = db.transaction(() => {
        // 1. Delete registrations referencing this camp by name
        db.prepare('DELETE FROM registrations WHERE camp = ?').run(camp.name);
        // 2. Delete camp_resources (also handled by CASCADE)
        db.prepare('DELETE FROM camp_resources WHERE camp_id = ?').run(id);
        // 3. Delete dispatch_log (also handled by CASCADE)
        db.prepare('DELETE FROM dispatch_log WHERE camp_id = ?').run(id);
        // 4. Delete the camp itself
        db.prepare('DELETE FROM camps WHERE id = ?').run(id);
    });

    try {
        deleteCampTransaction();
        res.json({ success: true, deleted: camp.name });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete camp: ' + e.message });
    }
});

// GET /api/resources — all camp resources
app.get('/api/resources', (req, res) => {
    const db = getDb();
    const rows = db.prepare(`
        SELECT c.name as camp_name, c.id as camp_id,
               cr.food_total, cr.food_allocated, cr.water_total, cr.water_allocated,
               cr.medicine_total, cr.medicine_allocated
        FROM camps c
        LEFT JOIN camp_resources cr ON cr.camp_id = c.id
        ORDER BY c.name
    `).all();
    res.json(rows);
});

// GET /api/dispatches — all dispatch entries
app.get('/api/dispatches', (req, res) => {
    const db = getDb();
    const rows = db.prepare(`
        SELECT d.*, c.name as camp_name
        FROM dispatch_log d
        LEFT JOIN camps c ON c.id = d.camp_id
        ORDER BY d.dispatch_time DESC
    `).all();
    res.json(rows);
});

// POST /api/dispatches — create a dispatch entry
app.post('/api/dispatches', (req, res) => {
    const db = getDb();
    const { type, camp_name, team_member_name, dispatch_location, dispatch_reason, reported_by } = req.body;

    if (!type || !camp_name || !dispatch_location || !dispatch_reason) {
        return res.status(400).json({ error: 'type, camp_name, dispatch_location, dispatch_reason are required' });
    }

    const camp = db.prepare('SELECT * FROM camps WHERE name = ?').get(camp_name);
    if (!camp) return res.status(404).json({ error: 'Camp not found' });

    const teamSize = type === 'medical' ? camp.medical_team_count : camp.rescue_team_count;
    const activeCount = db.prepare(
        'SELECT COUNT(*) as count FROM dispatch_log WHERE camp_id = ? AND type = ? AND status = ?'
    ).get(camp.id, type, 'Dispatched').count;

    const status = activeCount < teamSize ? 'Dispatched' : 'Waiting for People';
    const dispatch_time = new Date().toISOString();

    const result = db.prepare(`
        INSERT INTO dispatch_log (type, camp_id, team_member_name, dispatch_time, dispatch_location, dispatch_reason, reported_by, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(type, camp.id, team_member_name || '', dispatch_time, dispatch_location, dispatch_reason, reported_by || '', status);

    const entry = db.prepare(`
        SELECT d.*, c.name as camp_name FROM dispatch_log d
        LEFT JOIN camps c ON c.id = d.camp_id WHERE d.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(entry);
});

// ============================
// AI ENDPOINTS (Groq)
// ============================

// POST /api/ai/sort-priorities — AI-based priority sorting
app.post('/api/ai/sort-priorities', async (req, res) => {
    try {
        if (!isConfigured()) {
            return res.status(503).json({ error: 'AI not configured', fallback: true });
        }
        const { cases } = req.body;
        if (!cases || !Array.isArray(cases)) {
            return res.status(400).json({ error: 'cases array is required' });
        }
        const sorted = await sortByPriority(cases);
        res.json({ sorted });
    } catch (e) {
        res.status(500).json({ error: e.message, fallback: true });
    }
});

// POST /api/ai/chat — AI chatbot with DB context
app.post('/api/ai/chat', async (req, res) => {
    try {
        if (!isConfigured()) {
            return res.status(503).json({ error: 'AI not configured. Please add GROQ_API_KEY to .env file.' });
        }
        const { question } = req.body;
        if (!question || !question.trim()) {
            return res.status(400).json({ error: 'Question is required' });
        }

        // Build DB context for the AI
        const db = getDb();
        const registrations = db.prepare('SELECT * FROM registrations').all();
        const camps = db.prepare(`
            SELECT c.*, cr.food_total, cr.food_allocated, cr.water_total, cr.water_allocated,
                   cr.medicine_total, cr.medicine_allocated
            FROM camps c LEFT JOIN camp_resources cr ON cr.camp_id = c.id
        `).all();
        const dispatches = db.prepare(`
            SELECT d.*, c.name as camp_name FROM dispatch_log d
            LEFT JOIN camps c ON c.id = d.camp_id
        `).all();

        const dbContext = {
            totalRegistrations: registrations.length,
            totalSurvivors: registrations.reduce((s, r) => s + (r.family_count || 1), 0),
            trappedCases: registrations.filter(r => r.trapped).length,
            trappedPending: registrations.filter(r => r.trapped && !r.rescue_dispatched).length,
            injuredCases: registrations.filter(r => r.injured).length,
            injuredPending: registrations.filter(r => r.injured && !r.medical_dispatched).length,
            camps: camps.map(c => ({
                name: c.name,
                registrations: registrations.filter(r => r.camp === c.name).length,
                trapped: registrations.filter(r => r.camp === c.name && r.trapped).length,
                injured: registrations.filter(r => r.camp === c.name && r.injured).length,
                medicalTeam: c.medical_team_count,
                rescueTeam: c.rescue_team_count,
                foodRemaining: (c.food_total || 0) - (c.food_allocated || 0),
                waterRemaining: (c.water_total || 0) - (c.water_allocated || 0),
                medicineRemaining: (c.medicine_total || 0) - (c.medicine_allocated || 0),
            })),
            activeDispatches: dispatches.filter(d => d.status === 'Dispatched').length,
            recentRegistrations: registrations.slice(0, 10).map(r => ({
                name: r.name, camp: r.camp, village: r.village,
                injured: !!r.injured, trapped: !!r.trapped,
                injuryDescription: r.injury_description,
                trappedDescription: r.trapped_description,
            })),
        };

        const answer = await chatWithContext(question, dbContext);
        res.json({ answer });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Start server
app.listen(PORT, () => {
    getDb(); // Initialize DB on startup
    console.log(`\n🛟  ReliefLink API running at http://localhost:${PORT}`);
    console.log(`   AI: ${isConfigured() ? '✅ Groq configured' : '⚠️  GROQ_API_KEY not set in .env'}`);
    console.log(`   Endpoints:`);
    console.log(`   GET    /api/registrations`);
    console.log(`   POST   /api/registrations`);
    console.log(`   DELETE /api/registrations`);
    console.log(`   GET    /api/stats`);
    console.log(`   GET    /api/search?name=&village=`);
    console.log(`   GET    /api/camps`);
    console.log(`   POST   /api/camps`);
    console.log(`   PUT    /api/camps/:id`);
    console.log(`   DELETE /api/camps/:id`);
    console.log(`   GET    /api/resources`);
    console.log(`   GET    /api/dispatches`);
    console.log(`   POST   /api/dispatches`);
    console.log(`   PUT    /api/registrations/:id/dispatch`);
    console.log(`   POST   /api/auth/login`);
    console.log(`   POST   /api/ai/sort-priorities`);
    console.log(`   POST   /api/ai/chat\n`);
});
