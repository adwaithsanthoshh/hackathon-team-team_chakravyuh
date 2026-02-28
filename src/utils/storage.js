const STORAGE_KEY = 'relieflink_registrations';
const CAMP_KEY = 'relieflink_selected_camp';

export const CAMPS = [
    'Meppadi Relief Camp',
    'Chooralmala School Camp',
    'Kalpetta Government Camp',
    'Mananthavady Town Camp',
    'Sulthan Bathery Camp',
];

function generateId() {
    const ts = Date.now().toString().slice(-8);
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `RL-${ts}-${rand}`;
}

export function getRegistrations() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function addRegistration(data) {
    const registrations = getRegistrations();
    const entry = {
        id: generateId(),
        ...data,
        timestamp: new Date().toISOString(),
    };
    registrations.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
    return entry;
}

export function getSelectedCamp() {
    return localStorage.getItem(CAMP_KEY) || '';
}

export function setSelectedCamp(camp) {
    localStorage.setItem(CAMP_KEY, camp);
}

export function getCampStats() {
    const registrations = getRegistrations();
    const campMap = {};
    CAMPS.forEach(c => { campMap[c] = { count: 0, lastTime: null, medicalEmergencies: 0 }; });

    registrations.forEach(r => {
        if (campMap[r.camp]) {
            campMap[r.camp].count++;
            const t = new Date(r.timestamp);
            if (!campMap[r.camp].lastTime || t > campMap[r.camp].lastTime) {
                campMap[r.camp].lastTime = t;
            }
            if (r.injured && r.injuryDescription) {
                campMap[r.camp].medicalEmergencies++;
            }
        }
    });

    return campMap;
}

export function getTotalSurvivors() {
    const registrations = getRegistrations();
    return registrations.reduce((sum, r) => sum + (r.familyCount || 1), 0);
}

export function getActiveCamps() {
    const stats = getCampStats();
    return Object.keys(stats).filter(c => stats[c].count > 0).length;
}
