import { useState } from 'react';
import { Link } from 'react-router-dom';
import { searchFamily, fetchStats } from '../utils/api';

function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? `${timeStr} today` : `${timeStr} on ${d.toLocaleDateString()}`;
}

export default function Family() {
    const [queryName, setQueryName] = useState('');
    const [queryVillage, setQueryVillage] = useState('');
    const [results, setResults] = useState(null);
    const [searched, setSearched] = useState(false);
    const [searching, setSearching] = useState(false);
    const [campStats, setCampStats] = useState({});

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!queryName.trim() || searching) return;
        setSearching(true);
        try {
            const [matches, stats] = await Promise.all([searchFamily(queryName, queryVillage), fetchStats()]);
            setResults(matches);
            setCampStats(stats.campStats || {});
            setSearched(true);
        } catch { alert('Search failed. Please try again.'); }
        finally { setSearching(false); }
    };

    const handleClear = () => {
        setQueryName(''); setQueryVillage('');
        setResults(null); setSearched(false);
    };

    return (
        <div className="min-h-screen bg-hud-black hud-grid flex flex-col">
            {/* Header */}
            <div className="border-b border-hud-500 px-4 sm:px-6 py-3 flex items-center justify-between bg-hud-900">
                <Link to="/" className="font-mono text-xs text-hud-300 hover:text-neon-cyan transition-colors tracking-wider uppercase">
                    ← Home
                </Link>
                <span className="font-mono text-xs text-hud-white tracking-wider">
                    RELIEF<span className="text-neon-cyan">LINK</span>
                </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-start px-4 sm:px-6 py-8 sm:py-12">
                <div className="w-full max-w-lg">
                    {/* Title */}
                    <div className="text-center mb-8 animate-fade-in-up">
                        <div className="inline-flex items-center justify-center w-16 h-16 border border-neon-cyan mb-4">
                            <span className="text-3xl">🔍</span>
                        </div>
                        <h1 className="font-display text-3xl sm:text-4xl font-black text-hud-white uppercase tracking-tight">
                            Find<span className="text-neon-cyan">_</span>Your<span className="text-neon-cyan">_</span>Family
                        </h1>
                        <p className="font-mono text-xs text-hud-300 mt-3">
                            Search if your relative has registered at any relief camp
                        </p>
                    </div>

                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="space-y-4 mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <div>
                            <label className="mono-label block mb-2">FAMILY_MEMBER_NAME</label>
                            <input type="text" value={queryName} onChange={e => setQueryName(e.target.value)}
                                placeholder="Enter their name..."
                                className="w-full text-base p-4 hud-input" />
                        </div>
                        <div>
                            <label className="mono-label block mb-2">
                                VILLAGE_AREA <span className="text-hud-400 font-normal tracking-normal">(optional)</span>
                            </label>
                            <input type="text" value={queryVillage} onChange={e => setQueryVillage(e.target.value)}
                                placeholder="Enter village name..."
                                className="w-full text-base p-4 hud-input" />
                        </div>
                        <div className="flex gap-3">
                            <button type="submit" disabled={searching}
                                className="flex-1 py-4 btn-primary text-sm tracking-wider">
                                {searching ? '⏳ SEARCHING...' : '🔍 SEARCH'}
                            </button>
                            {searched && (
                                <button type="button" onClick={handleClear}
                                    className="px-6 py-4 btn-outline text-sm tracking-wider">
                                    CLEAR
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Results */}
                    {searched && (
                        <div className="animate-fade-in-up">
                            {results && results.length > 0 ? (
                                <div className="space-y-4">
                                    {results.map(r => (
                                        <div key={r.id} className="border border-status-green bg-status-green-dim p-6">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="w-10 h-10 border border-status-green flex items-center justify-center">
                                                    <span className="text-status-green text-lg font-mono font-bold">✓</span>
                                                </div>
                                                <h3 className="font-display text-lg font-bold text-status-green uppercase tracking-wide">
                                                    {r.name} has been located
                                                </h3>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-start gap-3">
                                                    <span className="mono-label w-40 shrink-0 pt-0.5">CAMP</span>
                                                    <span className="font-mono text-sm font-semibold text-hud-white">{r.camp}</span>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <span className="mono-label w-40 shrink-0 pt-0.5">REGISTERED_AT</span>
                                                    <span className="font-mono text-sm font-semibold text-hud-white">{formatTime(r.timestamp)}</span>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <span className="mono-label w-40 shrink-0 pt-0.5">FAMILY_MEMBERS</span>
                                                    <span className="font-mono text-sm font-semibold text-hud-white">{r.familyCount}</span>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <span className="mono-label w-40 shrink-0 pt-0.5">VILLAGE_ORIGIN</span>
                                                    <span className="font-mono text-sm font-semibold text-hud-white">{r.village || 'Not specified'}</span>
                                                </div>
                                                {r.injured && (
                                                    <div className="flex items-start gap-3 mt-2 pt-3 border-t border-alert-red/30">
                                                        <span className="mono-label w-40 shrink-0 pt-0.5 text-alert-red">⚠️ INJURY_REPORTED</span>
                                                        <span className="font-mono text-sm font-semibold text-alert-red">{r.injuryDescription}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="border border-warn-amber bg-warn-amber-dim p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 border border-warn-amber flex items-center justify-center">
                                            <span className="text-warn-amber text-lg font-mono font-bold">!</span>
                                        </div>
                                        <h3 className="font-display text-lg font-bold text-warn-amber uppercase tracking-wide">
                                            Not Yet Registered
                                        </h3>
                                    </div>
                                    <p className="font-mono text-xs text-hud-200 mb-5">
                                        Camps are updated in real-time. Please check again in 15 minutes.
                                    </p>
                                    <div className="border-t border-hud-500 pt-4">
                                        <div className="mono-label mb-3">ACTIVE_CAMPS</div>
                                        <div className="space-y-2">
                                            {Object.entries(campStats).map(([camp, stats]) => (
                                                <div key={camp} className="flex items-center justify-between font-mono text-xs py-1.5 border-b border-hud-500/50 last:border-0">
                                                    <span className="text-hud-200">{camp}</span>
                                                    <span className="text-hud-400">[{stats.count} registered]</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-hud-500 px-4 py-4 text-center bg-hud-900">
                <p className="font-mono text-[10px] text-hud-300 tracking-wider">
                    EMERGENCY:{' '}
                    <a href="tel:1070" className="font-bold text-alert-red hover:underline">1070</a>
                    {' '}(NDRF HELPLINE)
                </p>
            </div>
        </div>
    );
}
