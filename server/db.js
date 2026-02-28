import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'relieflink.db');

let db;

export function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initSchema();
        // seedIfEmpty(); // Disabled — start with empty database
    }
    return db;
}

function initSchema() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      village TEXT DEFAULT '',
      camp TEXT NOT NULL,
      family_count INTEGER DEFAULT 1,
      injured INTEGER DEFAULT 0,
      injury_description TEXT DEFAULT '',
      trapped INTEGER DEFAULT 0,
      trapped_description TEXT DEFAULT '',
      needs TEXT DEFAULT '[]',
      timestamp TEXT NOT NULL
    )
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS camps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      medical_team_count INTEGER DEFAULT 3,
      rescue_team_count INTEGER DEFAULT 3
    )
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS camp_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      camp_id INTEGER NOT NULL,
      food_total INTEGER DEFAULT 100,
      food_allocated INTEGER DEFAULT 0,
      water_total INTEGER DEFAULT 100,
      water_allocated INTEGER DEFAULT 0,
      medicine_total INTEGER DEFAULT 100,
      medicine_allocated INTEGER DEFAULT 0,
      FOREIGN KEY (camp_id) REFERENCES camps(id)
    )
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS dispatch_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      camp_id INTEGER NOT NULL,
      team_member_name TEXT DEFAULT '',
      dispatch_time TEXT NOT NULL,
      dispatch_location TEXT NOT NULL,
      dispatch_reason TEXT NOT NULL,
      reported_by TEXT DEFAULT '',
      status TEXT NOT NULL,
      FOREIGN KEY (camp_id) REFERENCES camps(id)
    )
  `);

    // Seed camps if not already present
    const campCount = db.prepare('SELECT COUNT(*) as count FROM camps').get().count;
    if (campCount === 0) {
        const insertCamp = db.prepare('INSERT INTO camps (name) VALUES (?)');
        const insertResource = db.prepare('INSERT INTO camp_resources (camp_id) VALUES (?)');
        const defaultCamps = [
            'Meppadi Relief Camp',
            'Chooralmala School Camp',
            'Kalpetta Government Camp',
            'Mananthavady Town Camp',
            'Sulthan Bathery Camp',
        ];
        const seedCamps = db.transaction(() => {
            defaultCamps.forEach(name => {
                const result = insertCamp.run(name);
                insertResource.run(result.lastInsertRowid);
            });
        });
        seedCamps();
        console.log('✅ Seeded 5 default camps with resources');
    }
}

function generateId() {
    const ts = Date.now().toString().slice(-8);
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `RL-${ts}-${rand}`;
}

function makeTime(minutesAgo) {
    return new Date(Date.now() - minutesAgo * 60000).toISOString();
}

const SEED_DATA = [
    { name: 'Rajan K', village: 'Mundakkai', camp: 'Meppadi Relief Camp', family_count: 4, injured: 0, injury_description: '', trapped: 1, trapped_description: 'my brother is near the Mundakkai church, could not cross the valley', needs: '[]', timestamp: makeTime(120) },
    { name: 'Latha Suresh', village: 'Mundakkai', camp: 'Meppadi Relief Camp', family_count: 2, injured: 1, injury_description: 'leg fracture', trapped: 1, trapped_description: 'two neighbors stuck near the church in Mundakkai valley', needs: '[]', timestamp: makeTime(110) },
    { name: 'Biju Thomas', village: 'Chooralmala', camp: 'Chooralmala School Camp', family_count: 3, injured: 0, injury_description: '', trapped: 0, trapped_description: '', needs: '["MEDICINE"]', timestamp: makeTime(100) },
    { name: 'Anitha Ravi', village: 'Vellarimala', camp: 'Meppadi Relief Camp', family_count: 1, injured: 0, injury_description: '', trapped: 1, trapped_description: 'husband near Mundakkai valley bridge, cannot cross', needs: '[]', timestamp: makeTime(90) },
    { name: 'Suresh Kumar', village: 'Mananthavady', camp: 'Mananthavady Town Camp', family_count: 5, injured: 0, injury_description: '', trapped: 0, trapped_description: '', needs: '["FOOD","WATER"]', timestamp: makeTime(80) },
    { name: 'Mary Joseph', village: 'Chooralmala', camp: 'Chooralmala School Camp', family_count: 2, injured: 1, injury_description: 'head injury — MEDICAL EMERGENCY', trapped: 0, trapped_description: '', needs: '["MEDICINE"]', timestamp: makeTime(70) },
    { name: 'Pradeep Nair', village: 'Kalpetta', camp: 'Kalpetta Government Camp', family_count: 4, injured: 0, injury_description: '', trapped: 0, trapped_description: '', needs: '[]', timestamp: makeTime(55) },
    { name: 'Suma Krishnan', village: 'Vellarimala', camp: 'Meppadi Relief Camp', family_count: 3, injured: 0, injury_description: '', trapped: 1, trapped_description: 'elderly woman still in house near the valley road Mundakkai', needs: '[]', timestamp: makeTime(45) },
    { name: 'Arun Mohan', village: 'Mananthavady', camp: 'Mananthavady Town Camp', family_count: 2, injured: 0, injury_description: '', trapped: 0, trapped_description: '', needs: '["FOOD"]', timestamp: makeTime(35) },
    { name: 'Thankam Varghese', village: 'Sulthan Bathery', camp: 'Sulthan Bathery Camp', family_count: 6, injured: 0, injury_description: '', trapped: 0, trapped_description: '', needs: '["SHELTER"]', timestamp: makeTime(25) },
    { name: 'Vineeth P', village: 'Chooralmala', camp: 'Chooralmala School Camp', family_count: 1, injured: 0, injury_description: '', trapped: 1, trapped_description: 'father near the Mananthavady bridge road', needs: '[]', timestamp: makeTime(15) },
    { name: 'Rekha Babu', village: 'Kalpetta', camp: 'Kalpetta Government Camp', family_count: 3, injured: 0, injury_description: '', trapped: 0, trapped_description: '', needs: '["WATER","MEDICINE"]', timestamp: makeTime(5) },
];

function seedIfEmpty() {
    const count = db.prepare('SELECT COUNT(*) as count FROM registrations').get();
    if (count.count === 0) {
        const insert = db.prepare(`
      INSERT INTO registrations (id, name, village, camp, family_count, injured, injury_description, trapped, trapped_description, needs, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const insertMany = db.transaction((items) => {
            items.forEach((item, i) => {
                const id = `RL-0000100${i + 1}-100${i + 1}`;
                insert.run(id, item.name, item.village, item.camp, item.family_count, item.injured, item.injury_description, item.trapped, item.trapped_description, item.needs, item.timestamp);
            });
        });

        insertMany(SEED_DATA);
        console.log('✅ Seeded database with 12 registrations');
    }
}
