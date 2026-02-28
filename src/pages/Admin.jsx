import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchCamps, createCamp, updateCamp } from '../utils/api';

export default function Admin() {
    const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_auth') === 'true');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const [camps, setCamps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingCamp, setEditingCamp] = useState(null);
    const [showAddCamp, setShowAddCamp] = useState(false);
    const [newCampName, setNewCampName] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    const loadCamps = async () => {
        setLoading(true);
        try { setCamps(await fetchCamps()); } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { if (authed) loadCamps(); }, [authed]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (username === 'admin' && password === 'admin') {
            sessionStorage.setItem('admin_auth', 'true');
            setAuthed(true);
            setLoginError('');
        } else {
            setLoginError('Invalid credentials');
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('admin_auth');
        setAuthed(false);
    };

    const handleAddCamp = async () => {
        if (!newCampName.trim()) return;
        setSaving(true);
        try {
            await createCamp({ name: newCampName.trim() });
            setNewCampName('');
            setShowAddCamp(false);
            await loadCamps();
            setSaveMsg('Camp added successfully');
            setTimeout(() => setSaveMsg(''), 3000);
        } catch (err) { alert('Failed to add camp. It may already exist.'); }
        finally { setSaving(false); }
    };

    const handleSaveCamp = async (camp) => {
        setSaving(true);
        try {
            await updateCamp(camp.id, {
                medical_team_count: camp.medical_team_count,
                rescue_team_count: camp.rescue_team_count,
                food_total: camp.food_total,
                water_total: camp.water_total,
                medicine_total: camp.medicine_total,
            });
            setEditingCamp(null);
            await loadCamps();
            setSaveMsg('Camp updated successfully');
            setTimeout(() => setSaveMsg(''), 3000);
        } catch { alert('Failed to save changes.'); }
        finally { setSaving(false); }
    };

    const updateEditField = (field, value) => {
        setEditingCamp(prev => ({ ...prev, [field]: Math.max(0, parseInt(value) || 0) }));
    };

    // ========== LOGIN SCREEN ==========
    if (!authed) {
        return (
            <div className="min-h-screen bg-hud-black hud-grid flex items-center justify-center p-6">
                <div className="w-full max-w-sm animate-fade-in-up">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 border-2 border-neon-cyan flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">🔒</span>
                        </div>
                        <h1 className="font-display text-2xl font-black text-hud-white uppercase tracking-tight">
                            Admin<span className="text-neon-cyan">_</span>Panel
                        </h1>
                        <p className="font-mono text-xs text-hud-400 mt-2">Authorized access only</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="mono-label block mb-2">USERNAME</label>
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                                placeholder="Enter username" className="w-full p-4 hud-input text-sm" autoFocus />
                        </div>
                        <div>
                            <label className="mono-label block mb-2">PASSWORD</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="Enter password" className="w-full p-4 hud-input text-sm" />
                        </div>
                        {loginError && (
                            <p className="font-mono text-[10px] text-alert-red tracking-wider">⚠ {loginError.toUpperCase()}</p>
                        )}
                        <button type="submit" className="w-full py-4 btn-primary text-sm tracking-wider">
                            🔓 AUTHENTICATE
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link to="/" className="font-mono text-xs text-hud-400 hover:text-neon-cyan transition-colors tracking-wider">
                            ← BACK TO HOME
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ========== ADMIN DASHBOARD ==========
    return (
        <div className="min-h-screen bg-hud-black hud-grid text-hud-white hud-scrollbar">
            {/* Top Bar */}
            <div className="border-b border-hud-500 px-4 sm:px-6 py-3 flex items-center justify-between bg-hud-900">
                <Link to="/" className="font-mono text-xs text-hud-300 hover:text-neon-cyan transition-colors tracking-wider uppercase">← Home</Link>
                <h1 className="font-mono text-xs text-hud-white tracking-wider uppercase">
                    RELIEF<span className="text-neon-cyan">LINK</span> // <span className="text-hud-400">ADMIN</span>
                </h1>
                <button onClick={handleLogout} className="px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase border border-alert-red/40 hover:border-alert-red text-alert-red/70 hover:text-alert-red transition-colors">
                    🔒 LOGOUT
                </button>
            </div>

            {/* Success message */}
            {saveMsg && (
                <div className="mx-4 sm:mx-6 mt-4 bg-status-green-dim border border-status-green/30 p-3 font-mono text-xs text-status-green tracking-wider animate-fade-in-up">
                    ✓ {saveMsg.toUpperCase()}
                </div>
            )}

            <div className="p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="font-mono text-[10px] text-hud-400 tracking-[0.2em] uppercase mb-1">// SYSTEM ADMINISTRATION</div>
                        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Camp<span className="text-neon-cyan">_</span>Management</h2>
                    </div>
                    <button onClick={() => setShowAddCamp(!showAddCamp)}
                        className="px-4 py-2 font-mono text-xs font-bold tracking-wider uppercase border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 transition-colors">
                        + ADD CAMP
                    </button>
                </div>

                {/* Add Camp Form */}
                {showAddCamp && (
                    <div className="border border-neon-cyan/30 bg-hud-900 p-5 mb-6 animate-fade-in-up">
                        <h3 className="mono-label mb-3">NEW_CAMP</h3>
                        <div className="flex gap-3">
                            <input type="text" value={newCampName} onChange={e => setNewCampName(e.target.value)}
                                placeholder="Enter camp name..." className="flex-1 p-3 hud-input text-sm" />
                            <button onClick={handleAddCamp} disabled={saving || !newCampName.trim()}
                                className="px-5 py-3 btn-primary text-xs">
                                {saving ? '⏳...' : '✓ ADD'}
                            </button>
                            <button onClick={() => { setShowAddCamp(false); setNewCampName(''); }}
                                className="px-4 py-3 btn-outline text-xs">CANCEL</button>
                        </div>
                    </div>
                )}

                {/* Camp Cards */}
                {loading ? (
                    <p className="font-mono text-xs text-hud-400 text-center py-12">Loading camps...</p>
                ) : (
                    <div className="space-y-4">
                        {camps.map(camp => {
                            const isEditing = editingCamp?.id === camp.id;
                            const data = isEditing ? editingCamp : camp;

                            return (
                                <div key={camp.id} className={`border bg-hud-900 p-5 transition-colors ${isEditing ? 'border-neon-cyan' : 'border-hud-500'}`}>
                                    {/* Camp header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">🏕️</span>
                                            <h3 className="font-display text-base font-bold uppercase tracking-wide">{camp.name}</h3>
                                            <span className="font-mono text-[10px] text-hud-400 tracking-wider">ID:{camp.id}</span>
                                        </div>
                                        {!isEditing ? (
                                            <button onClick={() => setEditingCamp({ ...camp })}
                                                className="px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase border border-hud-500 hover:border-neon-cyan text-hud-300 hover:text-neon-cyan transition-colors">
                                                ✏️ EDIT
                                            </button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleSaveCamp(editingCamp)} disabled={saving}
                                                    className="px-3 py-1.5 btn-primary text-[10px]">
                                                    {saving ? '⏳' : '✓'} SAVE
                                                </button>
                                                <button onClick={() => setEditingCamp(null)}
                                                    className="px-3 py-1.5 btn-outline text-[10px]">CANCEL</button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Team Counts + Resources */}
                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                        {/* Teams */}
                                        <div className="border border-hud-500 bg-hud-800 p-3">
                                            <p className="font-mono text-[9px] text-hud-400 tracking-wider font-bold mb-1">🏥 MEDICAL TEAM</p>
                                            {isEditing ? (
                                                <input type="number" min="0" value={data.medical_team_count}
                                                    onChange={e => updateEditField('medical_team_count', e.target.value)}
                                                    className="w-full p-2 hud-input text-sm font-bold" />
                                            ) : (
                                                <p className="font-mono text-xl font-bold text-neon-cyan">{data.medical_team_count}</p>
                                            )}
                                        </div>
                                        <div className="border border-hud-500 bg-hud-800 p-3">
                                            <p className="font-mono text-[9px] text-hud-400 tracking-wider font-bold mb-1">🚁 RESCUE TEAM</p>
                                            {isEditing ? (
                                                <input type="number" min="0" value={data.rescue_team_count}
                                                    onChange={e => updateEditField('rescue_team_count', e.target.value)}
                                                    className="w-full p-2 hud-input text-sm font-bold" />
                                            ) : (
                                                <p className="font-mono text-xl font-bold text-neon-cyan">{data.rescue_team_count}</p>
                                            )}
                                        </div>

                                        {/* Resources */}
                                        {[
                                            { label: '🍚 FOOD', field: 'food_total', alloc: 'food_allocated' },
                                            { label: '💧 WATER', field: 'water_total', alloc: 'water_allocated' },
                                            { label: '💊 MEDICINE', field: 'medicine_total', alloc: 'medicine_allocated' },
                                        ].map(({ label, field, alloc }) => (
                                            <div key={field} className="border border-hud-500 bg-hud-800 p-3">
                                                <p className="font-mono text-[9px] text-hud-400 tracking-wider font-bold mb-1">{label}</p>
                                                {isEditing ? (
                                                    <input type="number" min="0" value={data[field]}
                                                        onChange={e => updateEditField(field, e.target.value)}
                                                        className="w-full p-2 hud-input text-sm font-bold" />
                                                ) : (
                                                    <div className="space-y-0.5">
                                                        <p className="font-mono text-lg font-bold text-hud-white">{data[field] ?? 100}</p>
                                                        <p className="font-mono text-[9px] text-hud-400">
                                                            ALLOC: <span className="text-warn-amber">{data[alloc] ?? 0}</span>
                                                            {' '} REM: <span className={`${(data[field] ?? 100) - (data[alloc] ?? 0) > 20 ? 'text-status-green' : 'text-alert-red'}`}>
                                                                {(data[field] ?? 100) - (data[alloc] ?? 0)}
                                                            </span>
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
