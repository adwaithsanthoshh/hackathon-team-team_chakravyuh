const API_BASE = 'http://localhost:3001/api';

export async function fetchRegistrations() {
    const res = await fetch(`${API_BASE}/registrations`);
    if (!res.ok) throw new Error('Failed to fetch registrations');
    return res.json();
}

export async function createRegistration(data) {
    const res = await fetch(`${API_BASE}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create registration');
    return res.json();
}

export async function deleteRegistrations(ids) {
    const res = await fetch(`${API_BASE}/registrations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error('Failed to delete registrations');
    return res.json();
}

export async function fetchStats() {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
}

export async function searchFamily(name, village = '') {
    const params = new URLSearchParams({ name });
    if (village) params.set('village', village);
    const res = await fetch(`${API_BASE}/search?${params}`);
    if (!res.ok) throw new Error('Failed to search');
    return res.json();
}
