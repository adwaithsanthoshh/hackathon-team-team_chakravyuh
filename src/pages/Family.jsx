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
        <div className="min-h-screen bg-gradient-to-b from-fire-900 to-black flex flex-col">
            {/* Header */}
            <div className="bg-fire-800 border-b border-fire-600 px-4 sm:px-6 py-3 flex items-center justify-between">
                <Link to="/" className="text-orange-300/60 hover:text-white font-medium transition-colors">← Home</Link>
                <span className="text-sm font-bold text-white">Relief<span className="text-red-500">Link</span></span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-start px-4 sm:px-6 py-8 sm:py-12">
                <div className="w-full max-w-lg">
                    {/* Title */}
                    <div className="text-center mb-8 animate-fade-in-up">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-600 to-orange-700 rounded-2xl mb-4 shadow-lg shadow-red-900/40">
                            <span className="text-3xl">🔍</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Find Your Family Member</h1>
                        <p className="text-orange-300/60 mt-2 text-lg">Search if your relative has registered at any relief camp</p>
                    </div>

                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="space-y-4 mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <div>
                            <label className="block text-sm font-semibold text-orange-200 mb-1.5">Name of family member</label>
                            <input type="text" value={queryName} onChange={e => setQueryName(e.target.value)} placeholder="Enter their name..."
                                className="w-full text-lg p-4 border-2 border-fire-600 rounded-xl focus:border-red-500 focus:outline-none bg-fire-800 text-white placeholder-fire-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-orange-200 mb-1.5">
                                Village / Area <span className="text-orange-400/50 font-normal">(optional but helpful)</span>
                            </label>
                            <input type="text" value={queryVillage} onChange={e => setQueryVillage(e.target.value)} placeholder="Enter village name..."
                                className="w-full text-lg p-4 border-2 border-fire-600 rounded-xl focus:border-red-500 focus:outline-none bg-fire-800 text-white placeholder-fire-500" />
                        </div>
                        <div className="flex gap-3">
                            <button type="submit" disabled={searching}
                                className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-fire-600 disabled:to-fire-600 text-white text-lg font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-900/30">
                                {searching ? '⏳ Searching...' : '🔍 SEARCH'}
                            </button>
                            {searched && (
                                <button type="button" onClick={handleClear}
                                    className="px-6 bg-fire-700 hover:bg-fire-600 text-orange-200 text-lg font-bold py-4 rounded-xl transition-colors">Clear</button>
                            )}
                        </div>
                    </form>

                    {/* Results */}
                    {searched && (
                        <div className="animate-fade-in-up">
                            {results && results.length > 0 ? (
                                <div className="space-y-4">
                                    {results.map(r => (
                                        <div key={r.id} className="bg-green-900/30 border-2 border-green-700/50 rounded-xl p-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-lg">✓</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-green-400">{r.name} has been located</h3>
                                            </div>
                                            <div className="space-y-3 text-orange-100">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-orange-400/60 w-40 shrink-0 text-sm font-medium">Camp</span>
                                                    <span className="font-semibold">{r.camp}</span>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <span className="text-orange-400/60 w-40 shrink-0 text-sm font-medium">Registered at</span>
                                                    <span className="font-semibold">{formatTime(r.timestamp)}</span>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <span className="text-orange-400/60 w-40 shrink-0 text-sm font-medium">Family members with them</span>
                                                    <span className="font-semibold">{r.familyCount}</span>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <span className="text-orange-400/60 w-40 shrink-0 text-sm font-medium">Village they came from</span>
                                                    <span className="font-semibold">{r.village || 'Not specified'}</span>
                                                </div>
                                                {r.injured && (
                                                    <div className="flex items-start gap-3">
                                                        <span className="text-red-400 w-40 shrink-0 text-sm font-medium">⚠️ Injury reported</span>
                                                        <span className="font-semibold text-red-300">{r.injuryDescription}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-amber-900/20 border-2 border-amber-700/40 rounded-xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-lg font-bold">!</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-amber-400">Not yet registered at any relief camp</h3>
                                    </div>
                                    <p className="text-amber-300/70 mb-4">Camps are updated in real-time. Please check again in 15 minutes.</p>
                                    <div className="bg-black/30 rounded-lg p-4">
                                        <p className="text-sm font-semibold text-orange-300/60 mb-2">Active camps with registrations:</p>
                                        <div className="space-y-1.5">
                                            {Object.entries(campStats).map(([camp, stats]) => (
                                                <div key={camp} className="flex items-center justify-between text-sm">
                                                    <span className="text-orange-100">{camp}</span>
                                                    <span className="text-orange-400/60 font-medium">{stats.count} registered</span>
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
            <div className="bg-fire-800 border-t border-fire-600 px-4 py-4 text-center">
                <p className="text-orange-300/60 text-sm">
                    If emergency, call:{' '}
                    <a href="tel:1070" className="font-bold text-red-400 hover:text-red-300">1070 (NDRF Helpline)</a>
                </p>
            </div>
        </div>
    );
}
