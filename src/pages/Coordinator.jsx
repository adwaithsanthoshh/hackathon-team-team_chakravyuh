import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchRegistrations, fetchStats, deleteRegistrations } from '../utils/api';

const CAMPS = [
    'Meppadi Relief Camp',
    'Chooralmala School Camp',
    'Kalpetta Government Camp',
    'Mananthavady Town Camp',
    'Sulthan Bathery Camp',
];

const STOPWORDS = new Set([
    'the', 'a', 'an', 'is', 'in', 'at', 'to', 'of', 'and', 'or', 'my',
    'near', 'from', 'not', 'could', 'cannot', 'can', 'still', 'was', 'were',
    'has', 'have', 'had', 'are', 'am', 'be', 'been', 'do', 'did', 'does',
    'i', 'he', 'she', 'they', 'we', 'it', 'two', 'three', 'four', 'five',
    'its', 'his', 'her', 'their', 'our', 'this', 'that', 'with', 'for',
    'on', 'up', 'out', 'but', 'by', 'who', 'house', 'stuck', 'woman',
    'elderly', 'father', 'mother', 'brother', 'sister', 'neighbors',
]);

function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
        .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function clusterTrappedReports(registrations) {
    const trapped = registrations.filter(r => r.trapped && r.trappedDescription);
    if (trapped.length === 0) return [];
    const reports = trapped.map(r => ({ ...r, tokens: tokenize(r.trappedDescription) }));
    const used = new Set();
    const clusters = [];
    for (let i = 0; i < reports.length; i++) {
        if (used.has(i)) continue;
        const cluster = [reports[i]];
        used.add(i);
        const clusterTokens = new Set(reports[i].tokens);
        for (let j = i + 1; j < reports.length; j++) {
            if (used.has(j)) continue;
            if (reports[j].tokens.filter(t => clusterTokens.has(t)).length >= 2) {
                cluster.push(reports[j]);
                used.add(j);
                reports[j].tokens.forEach(t => clusterTokens.add(t));
            }
        }
        const freq = {};
        cluster.forEach(r => r.tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; }));
        const label = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t).join(' / ');
        clusters.push({ label, reports: cluster, count: cluster.length });
    }
    return clusters.sort((a, b) => b.count - a.count);
}

function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFullTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m ago`;
}

// ============================
// CAMP DETAIL VIEW
// ============================
function CampDetailView({ campName, registrations, onBack }) {
    const entries = registrations.filter(r => r.camp === campName);

    return (
        <div className="min-h-screen bg-navy-900 text-white dark-scrollbar">
            <div className="bg-navy-800 border-b border-slate-700 px-4 sm:px-6 py-3 flex items-center gap-4">
                <button onClick={onBack} className="text-orange-400 hover:text-orange-300 font-medium transition-colors text-lg">
                    ← Back
                </button>
                <h1 className="text-lg font-bold flex-1">
                    <span className="text-xl mr-2">🏕️</span>{campName}
                </h1>
                <span className="text-sm text-slate-400">{entries.length} entries</span>
            </div>

            <div className="max-w-4xl mx-auto p-4 sm:p-6">
                {entries.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-slate-500 text-lg">No registrations in this camp yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {entries.map((r, i) => (
                            <div key={r.id} className={`rounded-xl p-5 border animate-fade-in-up ${r.injured ? 'bg-red-500/10 border-red-500/30' :
                                    r.trapped ? 'bg-orange-500/10 border-orange-500/30' :
                                        'bg-white/5 border-slate-700'
                                }`} style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{r.name}</h3>
                                        <p className="text-sm text-slate-400">ID: {r.id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">{formatFullTime(r.timestamp)}</p>
                                        <p className="text-xs text-slate-500">{timeAgo(r.timestamp)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <span className="text-slate-500 text-xs block">Village</span>
                                        <span className="text-orange-200 font-medium">{r.village || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 text-xs block">Family Members</span>
                                        <span className="text-orange-200 font-medium">{r.familyCount}</span>
                                    </div>
                                    {r.needs && r.needs.length > 0 && (
                                        <div>
                                            <span className="text-slate-500 text-xs block">Needs</span>
                                            <span className="text-amber-400 font-medium">{r.needs.join(', ')}</span>
                                        </div>
                                    )}
                                </div>

                                {r.injured && (
                                    <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                        <span className="text-red-400 text-xs font-bold">🚨 INJURY:</span>
                                        <span className="text-red-300 text-sm ml-2">{r.injuryDescription}</span>
                                    </div>
                                )}
                                {r.trapped && (
                                    <div className="mt-3 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                                        <span className="text-orange-400 text-xs font-bold">⚠️ TRAPPED:</span>
                                        <span className="text-orange-300 text-sm ml-2">{r.trappedDescription}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================
// CLEAR DATABASE MODAL
// ============================
function ClearModal({ registrations, onClose, onDeleted }) {
    const [selectedCamp, setSelectedCamp] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deleting, setDeleting] = useState(false);

    const campEntries = selectedCamp ? registrations.filter(r => r.camp === selectedCamp) : [];

    const toggleId = (id) => {
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const toggleAll = () => {
        setSelectedIds(selectedIds.size === campEntries.length ? new Set() : new Set(campEntries.map(r => r.id)));
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} registration(s)? This cannot be undone.`)) return;
        setDeleting(true);
        try { await deleteRegistrations([...selectedIds]); onDeleted(); onClose(); }
        catch { alert('Failed to delete.'); }
        finally { setDeleting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-navy-800 border border-slate-600 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-700 flex items-center justify-between shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><span className="text-red-400">🗑️</span> Clear Database</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
                </div>
                <div className="p-5 border-b border-slate-700 shrink-0">
                    <label className="block text-sm font-medium text-slate-400 mb-2">Select Camp</label>
                    <select value={selectedCamp} onChange={e => { setSelectedCamp(e.target.value); setSelectedIds(new Set()); }}
                        className="w-full p-3 bg-navy-900 border border-slate-600 rounded-xl text-white focus:border-red-500 focus:outline-none">
                        <option value="">— Choose a camp —</option>
                        {CAMPS.map(c => <option key={c} value={c}>{c} ({registrations.filter(r => r.camp === c).length} entries)</option>)}
                    </select>
                </div>
                <div className="flex-1 overflow-y-auto dark-scrollbar p-5">
                    {!selectedCamp ? <p className="text-slate-500 text-center py-8">Select a camp to view entries</p> :
                        campEntries.length === 0 ? <p className="text-slate-500 text-center py-8">No entries in this camp</p> : (
                            <>
                                <button onClick={toggleAll} className="mb-3 text-sm font-medium text-red-400 hover:text-red-300 transition-colors">
                                    {selectedIds.size === campEntries.length ? '☑ Deselect All' : '☐ Select All'} ({campEntries.length} entries)
                                </button>
                                <div className="space-y-2">
                                    {campEntries.map(r => (
                                        <label key={r.id} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedIds.has(r.id) ? 'bg-red-500/15 border border-red-500/30' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}>
                                            <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleId(r.id)} className="mt-1 w-4 h-4 shrink-0 accent-red-500" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-semibold text-sm">{r.name}</span>
                                                    <span className="text-slate-500 text-xs">•</span>
                                                    <span className="text-slate-400 text-xs">{r.village}</span>
                                                    {r.injured && <span className="text-red-400 text-xs font-medium">🚨</span>}
                                                    {r.trapped && <span className="text-orange-400 text-xs font-medium">⚠️</span>}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">ID: {r.id} • Family: {r.familyCount} • {formatFullTime(r.timestamp)}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}
                </div>
                <div className="p-5 border-t border-slate-700 flex items-center justify-between shrink-0">
                    <span className="text-sm text-slate-400">{selectedIds.size > 0 ? `${selectedIds.size} selected` : 'No entries selected'}</span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancel</button>
                        <button onClick={handleDelete} disabled={selectedIds.size === 0 || deleting}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors">
                            {deleting ? 'Deleting...' : `Delete ${selectedIds.size} Entry(s)`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================
// DOWNLOAD REPORT MODAL
// ============================
function ReportModal({ registrations, onClose }) {
    const [selectedCamps, setSelectedCamps] = useState(new Set());

    const toggleCamp = (camp) => { setSelectedCamps(prev => { const n = new Set(prev); n.has(camp) ? n.delete(camp) : n.add(camp); return n; }); };
    const toggleAll = () => { setSelectedCamps(selectedCamps.size === CAMPS.length ? new Set() : new Set(CAMPS)); };

    const handleDownload = () => {
        if (selectedCamps.size === 0) return;
        const filtered = registrations.filter(r => selectedCamps.has(r.camp));
        const lines = [];
        lines.push('═'.repeat(70), '  RELIEFLINK — DISASTER RELIEF REPORT', `  Generated: ${new Date().toLocaleString()}`, `  Camps: ${selectedCamps.size} selected`, `  Total Entries: ${filtered.length}`, '═'.repeat(70), '');
        [...selectedCamps].sort().forEach(camp => {
            const regs = filtered.filter(r => r.camp === camp);
            if (regs.length === 0) return;
            lines.push('─'.repeat(70), `  📍 ${camp.toUpperCase()}`, `     ${regs.length} registration(s)`, '─'.repeat(70), '');
            regs.forEach((r, i) => {
                lines.push(`  ${i + 1}. ${r.name}`, `     ID: ${r.id}`, `     Village: ${r.village || 'N/A'}`, `     Family Members: ${r.familyCount}`, `     Registered: ${formatFullTime(r.timestamp)}`);
                if (r.injured) lines.push(`     ⚠️  INJURED: ${r.injuryDescription}`);
                if (r.trapped) lines.push(`     🔴 TRAPPED: ${r.trappedDescription}`);
                if (r.needs?.length > 0) lines.push(`     Needs: ${r.needs.join(', ')}`);
                lines.push('');
            });
        });
        lines.push('═'.repeat(70), '  SUMMARY', '═'.repeat(70));
        lines.push(`  Total Survivors: ${filtered.reduce((s, r) => s + (r.familyCount || 1), 0)}`, `  Injured: ${filtered.filter(r => r.injured).length}`, `  Trapped: ${filtered.filter(r => r.trapped).length}`, '', '  End of Report', '═'.repeat(70));
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `ReliefLink_Report_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click(); URL.revokeObjectURL(a.href); onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-navy-800 border border-slate-600 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-700 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><span className="text-blue-400">📄</span> Download Report</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
                </div>
                <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-slate-400">Select Camp(s)</label>
                        <button onClick={toggleAll} className="text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors">
                            {selectedCamps.size === CAMPS.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {CAMPS.map(camp => (
                            <label key={camp} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedCamps.has(camp) ? 'bg-orange-500/15 border border-orange-500/30' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}>
                                <input type="checkbox" checked={selectedCamps.has(camp)} onChange={() => toggleCamp(camp)} className="w-4 h-4 accent-orange-500" />
                                <span className="text-white font-medium text-sm flex-1">{camp}</span>
                                <span className="text-slate-400 text-xs">{registrations.filter(r => r.camp === camp).length}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="p-5 border-t border-slate-700 flex items-center justify-between">
                    <span className="text-sm text-slate-400">{selectedCamps.size > 0 ? `${registrations.filter(r => selectedCamps.has(r.camp)).length} entries` : 'No camps selected'}</span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancel</button>
                        <button onClick={handleDownload} disabled={selectedCamps.size === 0}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors">📥 Download .txt</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================
// RESCUE DISPATCH CONFIRMATION
// ============================
function RescueModal({ report, onClose, onDispatched }) {
    const [dispatching, setDispatching] = useState(false);

    const handleDispatch = () => {
        setDispatching(true);
        setTimeout(() => {
            onDispatched(report.id);
            onClose();
        }, 1200);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-navy-800 border border-slate-600 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-red-400">🚨</span> Dispatch Rescue Team
                    </h2>
                </div>
                <div className="p-5 space-y-4">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-slate-400 text-sm">Reported by</span>
                            <span className="text-white font-semibold">{report.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400 text-sm">Camp</span>
                            <span className="text-orange-300 font-medium text-sm">{report.camp}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400 text-sm">Village</span>
                            <span className="text-orange-300 font-medium text-sm">{report.village || 'N/A'}</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">
                            {report.trapped ? 'Trapped Person Details' : 'Medical Emergency Details'}
                        </p>
                        <p className="text-orange-100 bg-white/5 rounded-lg p-3 text-sm leading-relaxed">
                            "{report.trapped ? report.trappedDescription : report.injuryDescription}"
                        </p>
                    </div>

                    {dispatching && (
                        <div className="text-center py-2 animate-fade-in-up">
                            <div className="inline-flex items-center gap-2 text-green-400 font-semibold">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-status-pulse"></span>
                                Dispatching rescue team...
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-5 border-t border-slate-700 flex gap-3 justify-end">
                    <button onClick={onClose} disabled={dispatching}
                        className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancel</button>
                    <button onClick={handleDispatch} disabled={dispatching}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-slate-600 disabled:to-slate-600 rounded-lg transition-all">
                        {dispatching ? '⏳ Sending...' : '🚁 Send Rescue Team'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================
// COORDINATOR DASHBOARD
// ============================
export default function Coordinator() {
    const [registrations, setRegistrations] = useState([]);
    const [stats, setStats] = useState({ totalSurvivors: 0, activeCamps: 0, trappedCount: 0, medicalCount: 0, campStats: {} });
    const [showClearModal, setShowClearModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedCampView, setSelectedCampView] = useState(null);
    const [rescueTarget, setRescueTarget] = useState(null);
    const [dispatchedIds, setDispatchedIds] = useState(new Set());

    const load = async () => {
        try {
            const [regs, st] = await Promise.all([fetchRegistrations(), fetchStats()]);
            setRegistrations(regs);
            setStats(st);
        } catch { }
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleDispatched = (id) => {
        setDispatchedIds(prev => new Set(prev).add(id));
    };

    // If viewing a specific camp
    if (selectedCampView) {
        return <CampDetailView campName={selectedCampView} registrations={registrations} onBack={() => setSelectedCampView(null)} />;
    }

    const rescueClusters = clusterTrappedReports(registrations);
    const campStats = stats.campStats || {};

    const resourceByCamp = {};
    CAMPS.forEach(c => { resourceByCamp[c] = { FOOD: 0, WATER: 0, MEDICINE: 0, SHELTER: 0 }; });
    registrations.forEach(r => {
        if (resourceByCamp[r.camp]) r.needs?.forEach(n => { resourceByCamp[r.camp][n] = (resourceByCamp[r.camp][n] || 0) + 1; });
    });

    const suggestions = [];
    const allNeeds = ['FOOD', 'WATER', 'MEDICINE', 'SHELTER'];
    allNeeds.forEach(need => {
        const withN = CAMPS.filter(c => resourceByCamp[c][need] > 0);
        const without = CAMPS.filter(c => resourceByCamp[c][need] === 0 && campStats[c]?.count > 0);
        if (withN.length > 0 && without.length > 0) {
            const heaviest = withN.sort((a, b) => resourceByCamp[b][need] - resourceByCamp[a][need])[0];
            without.forEach(from => suggestions.push({ need, from, to: heaviest, count: resourceByCamp[heaviest][need] }));
        }
    });

    function getCampColor(camp) {
        const s = campStats[camp];
        if (!s || !s.lastTime) return 'bg-slate-700';
        const mins = (Date.now() - new Date(s.lastTime).getTime()) / 60000;
        if (mins < 30) return 'bg-green-600';
        if (mins < 60) return 'bg-yellow-500';
        return 'bg-red-600';
    }

    const liveFeed = [...registrations].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);
    const priorityColors = ['🔴', '🟠', '🟡'];

    // Collect all rescue-worthy reports for dispatch buttons
    const medicalReports = registrations.filter(r => r.injured && r.injuryDescription);

    return (
        <div className="min-h-screen bg-navy-900 text-white dark-scrollbar">
            {showClearModal && <ClearModal registrations={registrations} onClose={() => setShowClearModal(false)} onDeleted={load} />}
            {showReportModal && <ReportModal registrations={registrations} onClose={() => setShowReportModal(false)} />}
            {rescueTarget && <RescueModal report={rescueTarget} onClose={() => setRescueTarget(null)} onDispatched={handleDispatched} />}

            {/* Top Bar */}
            <div className="bg-navy-800 border-b border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between">
                <Link to="/" className="text-slate-400 hover:text-white font-medium transition-colors">← Home</Link>
                <h1 className="text-lg font-bold">Relief<span className="text-red-400">Link</span> <span className="text-slate-400 font-normal">Coordinator</span></h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowReportModal(true)} className="px-3 py-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">📄 Report</button>
                    <button onClick={() => setShowClearModal(true)} className="px-3 py-1.5 text-xs font-semibold bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors">🗑️ Clear</button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 sm:p-6">
                {[
                    { label: 'Total Survivors', value: stats.totalSurvivors, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                    { label: 'Camps Active', value: stats.activeCamps, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
                    { label: 'Rescue Alerts', value: stats.trappedCount, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                    { label: 'Medical Emergencies', value: stats.medicalCount, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                ].map(stat => (
                    <div key={stat.label} className={`${stat.bg} border rounded-xl p-4`}>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{stat.label}</p>
                        <p className={`text-3xl font-extrabold ${stat.color} mt-1`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 sm:p-6 pt-0 sm:pt-0">
                {/* Panel 1: Rescue Priorities */}
                <div className="bg-navy-800 border border-slate-700 rounded-xl p-5">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-status-pulse"></span> Rescue Priorities
                    </h2>
                    {rescueClusters.length === 0 ? (
                        <p className="text-slate-500 text-sm">No trapped person reports</p>
                    ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto dark-scrollbar pr-1">
                            {rescueClusters.map((cluster, i) => (
                                <div key={i} className={`rounded-lg p-4 border ${i === 0 ? 'bg-red-500/10 border-red-500/30' : i === 1 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-yellow-500/10 border-yellow-500/30'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">{priorityColors[Math.min(i, 2)]}</span>
                                        <span className="font-bold text-sm uppercase tracking-wider">Priority {i + 1}</span>
                                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full ml-auto">{cluster.count} report{cluster.count > 1 ? 's' : ''}</span>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-300 mb-2 capitalize">{cluster.label}</p>
                                    <div className="space-y-2">
                                        {cluster.reports.map(r => (
                                            <div key={r.id} className="text-xs text-slate-400 bg-white/5 rounded-lg p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <span className="text-slate-300 font-medium">{r.name}</span>
                                                        <span className="text-slate-500 mx-1">•</span>
                                                        <span className="text-slate-500">{r.camp}</span>
                                                        <p className="mt-1 text-slate-400">"{r.trappedDescription}"</p>
                                                    </div>
                                                    {dispatchedIds.has(r.id) ? (
                                                        <span className="shrink-0 px-3 py-1.5 text-xs font-bold bg-green-600/20 text-green-400 border border-green-500/30 rounded-lg">
                                                            ✓ Dispatched
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => setRescueTarget(r)}
                                                            className="shrink-0 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-lg transition-all shadow-sm"
                                                        >
                                                            🚁 Send Rescue
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Medical emergencies with dispatch */}
                            {medicalReports.length > 0 && (
                                <div className="rounded-lg p-4 border bg-red-500/10 border-red-500/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">🏥</span>
                                        <span className="font-bold text-sm uppercase tracking-wider">Medical Emergencies</span>
                                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full ml-auto">{medicalReports.length}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {medicalReports.map(r => (
                                            <div key={`med-${r.id}`} className="text-xs text-slate-400 bg-white/5 rounded-lg p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <span className="text-slate-300 font-medium">{r.name}</span>
                                                        <span className="text-slate-500 mx-1">•</span>
                                                        <span className="text-slate-500">{r.camp}</span>
                                                        <p className="mt-1 text-red-300">🚨 {r.injuryDescription}</p>
                                                    </div>
                                                    {dispatchedIds.has(`med-${r.id}`) ? (
                                                        <span className="shrink-0 px-3 py-1.5 text-xs font-bold bg-green-600/20 text-green-400 border border-green-500/30 rounded-lg">
                                                            ✓ Dispatched
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => setRescueTarget({ ...r, id: `med-${r.id}` })}
                                                            className="shrink-0 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-lg transition-all shadow-sm"
                                                        >
                                                            🏥 Send Medical
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Panel 2: Resource Matching */}
                <div className="bg-navy-800 border border-slate-700 rounded-xl p-5">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span className="text-xl">📦</span> Resource Matching</h2>
                    <div className="overflow-x-auto mb-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                                    <th className="pb-2 text-left font-medium">Camp</th>
                                    <th className="pb-2 text-center font-medium">Food</th>
                                    <th className="pb-2 text-center font-medium">Water</th>
                                    <th className="pb-2 text-center font-medium">Med</th>
                                    <th className="pb-2 text-center font-medium">Shelter</th>
                                </tr>
                            </thead>
                            <tbody>
                                {CAMPS.map(camp => {
                                    const needs = resourceByCamp[camp];
                                    return (
                                        <tr key={camp} className="border-b border-slate-700/50">
                                            <td className="py-2 text-slate-300 text-xs font-medium max-w-[120px] truncate">{camp.replace(' Camp', '').replace(' Relief', '')}</td>
                                            {allNeeds.map(n => (
                                                <td key={n} className="py-2 text-center">
                                                    {needs[n] > 0 ? <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full font-bold">{needs[n]}</span> : <span className="text-slate-600">—</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {suggestions.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">Redistribution Suggestions</p>
                            {suggestions.slice(0, 4).map((s, i) => (
                                <div key={i} className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-xs">
                                    <span className="text-orange-400 font-medium">💡</span> <span className="text-white font-bold">{s.need}</span>{' '}
                                    <span className="text-slate-400">from</span> <span className="text-slate-200">{s.from.replace(' Camp', '')}</span>{' '}
                                    <span className="text-slate-400">→</span> <span className="text-slate-200">{s.to.replace(' Camp', '')}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Panel 3: Camp Status — CLICKABLE */}
                <div className="bg-navy-800 border border-slate-700 rounded-xl p-5">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span className="text-xl">🏕️</span> Camp Status</h2>
                    <div className="space-y-2">
                        {CAMPS.map(camp => {
                            const s = campStats[camp] || {};
                            const color = getCampColor(camp);
                            return (
                                <button
                                    key={camp}
                                    onClick={() => setSelectedCampView(camp)}
                                    className="w-full bg-white/5 hover:bg-white/10 rounded-lg p-3 flex items-center gap-3 text-left transition-colors group"
                                >
                                    <div className={`w-3 h-3 ${color} rounded-full shrink-0`}></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{camp}</p>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                            <span>{s.count || 0} registered</span>
                                            {s.lastTime && <span>Last: {timeAgo(s.lastTime)}</span>}
                                            {s.medicalEmergencies > 0 && <span className="text-red-400 font-medium">🚨 {s.medicalEmergencies} medical</span>}
                                        </div>
                                    </div>
                                    <span className="text-slate-600 group-hover:text-orange-400 transition-colors text-sm">→</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Panel 4: Live Feed */}
                <div className="bg-navy-800 border border-slate-700 rounded-xl p-5">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full animate-status-pulse"></span> Live Feed
                    </h2>
                    <div className="space-y-1.5 max-h-[400px] overflow-y-auto dark-scrollbar pr-1">
                        {liveFeed.length === 0 ? <p className="text-slate-500 text-sm">No registrations yet</p> : liveFeed.map(r => {
                            const isMedical = r.injured && r.injuryDescription;
                            const isTrapped = r.trapped;
                            return (
                                <div key={r.id} className={`rounded-lg p-3 text-xs ${isMedical ? 'bg-red-500/10 border border-red-500/20' : isTrapped ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-white/5'}`}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-slate-500 font-mono">{formatTime(r.timestamp)}</span>
                                        <span className="font-semibold text-slate-200">{r.name}</span>
                                        <span className="text-slate-500">•</span>
                                        <span className="text-slate-400">{r.village}</span>
                                        <span className="text-slate-500">•</span>
                                        <span className="text-slate-400 truncate max-w-[120px]">{r.camp.replace(' Camp', '')}</span>
                                        {r.needs?.length > 0 && <><span className="text-slate-500">•</span><span className="text-amber-400">{r.needs.join(', ')}</span></>}
                                        {isMedical && <span className="text-red-400 font-bold ml-auto">🚨 MEDICAL</span>}
                                        {isTrapped && <span className="text-orange-400 font-bold ml-auto">⚠️ TRAPPED</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
