import express from 'express';
import cors from 'cors';
import { getDb } from './db.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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

// Start server
app.listen(PORT, () => {
    getDb(); // Initialize DB on startup
    console.log(`\n🛟  ReliefLink API running at http://localhost:${PORT}`);
    console.log(`   Endpoints:`);
    console.log(`   GET    /api/registrations`);
    console.log(`   POST   /api/registrations`);
    console.log(`   DELETE /api/registrations`);
    console.log(`   GET    /api/stats`);
    console.log(`   GET    /api/search?name=&village=\n`);
});
