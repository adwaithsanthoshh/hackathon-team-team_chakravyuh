const API_BASE = 'http://localhost:3001/api';

function getAuthHeaders() {
    const token = sessionStorage.getItem('admin_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

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

export async function markDispatched(id, type) {
    const res = await fetch(`${API_BASE}/registrations/${id}/dispatch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
    });
    if (!res.ok) throw new Error('Failed to mark dispatched');
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

export async function loginAdmin(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(err.error || 'Login failed');
    }
    return res.json();
}

export async function fetchCamps() {
    const res = await fetch(`${API_BASE}/camps`);
    if (!res.ok) throw new Error('Failed to fetch camps');
    return res.json();
}

export async function createCamp(data) {
    const res = await fetch(`${API_BASE}/camps`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create camp' }));
        throw new Error(err.error || 'Failed to create camp');
    }
    return res.json();
}

export async function updateCamp(id, data) {
    const res = await fetch(`${API_BASE}/camps/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update camp' }));
        throw new Error(err.error || 'Failed to update camp');
    }
    return res.json();
}

export async function fetchDispatches() {
    const res = await fetch(`${API_BASE}/dispatches`);
    if (!res.ok) throw new Error('Failed to fetch dispatches');
    return res.json();
}

export async function createDispatch(data) {
    const res = await fetch(`${API_BASE}/dispatches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create dispatch');
    return res.json();
}

export async function fetchResources() {
    const res = await fetch(`${API_BASE}/resources`);
    if (!res.ok) throw new Error('Failed to fetch resources');
    return res.json();
}
