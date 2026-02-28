import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchRegistrations, fetchStats, deleteRegistrations, fetchDispatches, createDispatch, fetchResources, markDispatched, fetchCamps } from '../utils/api';

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
    const trapped = registrations.filter(r => r.trapped && r.trappedDescription && !r.rescueDispatched);
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
        <div className="min-h-screen bg-hud-black hud-grid text-hud-white hud-scrollbar">
            <div className="border-b border-hud-500 px-4 sm:px-6 py-3 flex items-center gap-4 bg-hud-900">
                <button onClick={onBack} className="font-mono text-xs text-hud-300 hover:text-neon-cyan transition-colors tracking-wider uppercase">
                    ← Back
                </button>
                <h1 className="font-display text-base font-bold flex-1 uppercase tracking-wide flex items-center gap-2">
                    <span className="text-lg">🏕️</span>{campName}
                </h1>
                <span className="font-mono text-[10px] text-hud-400 tracking-wider">[{entries.length} ENTRIES]</span>
            </div>

            <div className="max-w-4xl mx-auto p-4 sm:p-6">
                {entries.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="font-mono text-sm text-hud-400">No registrations in this camp yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {entries.map((r, i) => (
                            <div key={r.id} className={`p-5 border animate-fade-in-up ${r.injured ? 'bg-alert-red-dim border-alert-red/30' :
                                r.trapped ? 'bg-warn-orange-dim border-warn-orange/30' :
                                    'bg-hud-900 border-hud-500'
                                }`} style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-display text-base font-bold text-hud-white uppercase">{r.name}</h3>
                                        <p className="font-mono text-[10px] text-hud-400 tracking-wider">ID: {r.id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono text-[10px] text-hud-400">{formatFullTime(r.timestamp)}</p>
                                        <p className="font-mono text-[10px] text-hud-400">{timeAgo(r.timestamp)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <span className="mono-label block">Village</span>
                                        <span className="font-mono text-xs text-hud-200 font-medium">{r.village || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="mono-label block">Family</span>
                                        <span className="font-mono text-xs text-hud-200 font-medium">{r.familyCount}</span>
                                    </div>
                                    {r.needs && r.needs.length > 0 && (
                                        <div>
                                            <span className="mono-label block">Needs</span>
                                            <span className="font-mono text-xs text-warn-amber font-medium">{r.needs.join(', ')}</span>
                                        </div>
                                    )}
                                </div>

                                {r.injured && (
                                    <div className="mt-3 bg-alert-red-dim border border-alert-red/20 p-3">
                                        <span className="font-mono text-[10px] text-alert-red font-bold tracking-wider">🚨 INJURY:</span>
                                        <span className="font-mono text-xs text-alert-red ml-2">{r.injuryDescription}</span>
                                    </div>
                                )}
                                {r.trapped && (
                                    <div className="mt-3 bg-warn-orange-dim border border-warn-orange/20 p-3">
                                        <span className="font-mono text-[10px] text-warn-orange font-bold tracking-wider">⚠️ TRAPPED:</span>
                                        <span className="font-mono text-xs text-warn-orange ml-2">{r.trappedDescription}</span>
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
function ClearModal({ registrations, camps, onClose, onDeleted }) {
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-hud-900 border border-hud-500 w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-hud-500 flex items-center justify-between shrink-0">
                    <h2 className="font-display text-lg font-bold text-hud-white uppercase tracking-wide flex items-center gap-2">
                        <span className="text-alert-red">🗑️</span> Clear Database
                    </h2>
                    <button onClick={onClose} className="text-hud-400 hover:text-hud-white text-xl font-mono">×</button>
                </div>
                <div className="p-5 border-b border-hud-500 shrink-0">
                    <label className="mono-label block mb-2">SELECT_CAMP</label>
                    <select value={selectedCamp} onChange={e => { setSelectedCamp(e.target.value); setSelectedIds(new Set()); }}
                        className="w-full p-3 hud-input">
                        <option value="">— CHOOSE A CAMP —</option>
                        {camps.map(c => <option key={c} value={c}>{c} ({registrations.filter(r => r.camp === c).length} entries)</option>)}
                    </select>
                </div>
                <div className="flex-1 overflow-y-auto hud-scrollbar p-5">
                    {!selectedCamp ? <p className="font-mono text-xs text-hud-400 text-center py-8">Select a camp to view entries</p> :
                        campEntries.length === 0 ? <p className="font-mono text-xs text-hud-400 text-center py-8">No entries in this camp</p> : (
                            <>
                                <button onClick={toggleAll} className="mb-3 font-mono text-[10px] font-bold text-alert-red hover:text-alert-red/80 transition-colors tracking-wider uppercase">
                                    {selectedIds.size === campEntries.length ? '☑ DESELECT ALL' : '☐ SELECT ALL'} ({campEntries.length} entries)
                                </button>
                                <div className="space-y-2">
                                    {campEntries.map(r => (
                                        <label key={r.id} className={`flex items-start gap-3 p-3 cursor-pointer transition-colors border ${selectedIds.has(r.id) ? 'bg-alert-red-dim border-alert-red/30' : 'bg-hud-800 border-hud-500 hover:border-hud-400'}`}>
                                            <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleId(r.id)} className="mt-1 w-4 h-4 shrink-0 accent-red-500" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-hud-white font-semibold">{r.name}</span>
                                                    <span className="text-hud-500 text-xs">•</span>
                                                    <span className="font-mono text-[10px] text-hud-400">{r.village}</span>
                                                    {r.injured && <span className="text-alert-red text-xs">🚨</span>}
                                                    {r.trapped && <span className="text-warn-orange text-xs">⚠️</span>}
                                                </div>
                                                <div className="font-mono text-[10px] text-hud-400 mt-0.5">
                                                    ID: {r.id} • Family: {r.familyCount} • {formatFullTime(r.timestamp)}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}
                </div>
                <div className="p-5 border-t border-hud-500 flex items-center justify-between shrink-0">
                    <span className="font-mono text-[10px] text-hud-400 tracking-wider">{selectedIds.size > 0 ? `${selectedIds.size} SELECTED` : 'NO ENTRIES SELECTED'}</span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 btn-outline text-xs">CANCEL</button>
                        <button onClick={handleDelete} disabled={selectedIds.size === 0 || deleting}
                            className="px-5 py-2.5 text-xs font-mono font-bold text-hud-white bg-alert-red hover:bg-alert-red/80 disabled:bg-hud-600 disabled:text-hud-400 border border-alert-red disabled:border-hud-500 transition-colors uppercase tracking-wider">
                            {deleting ? 'DELETING...' : `DELETE ${selectedIds.size} ENTRY(S)`}
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
function ReportModal({ registrations, camps, onClose }) {
    const [selectedCamps, setSelectedCamps] = useState(new Set());

    const toggleCamp = (camp) => { setSelectedCamps(prev => { const n = new Set(prev); n.has(camp) ? n.delete(camp) : n.add(camp); return n; }); };
    const toggleAll = () => { setSelectedCamps(selectedCamps.size === camps.length ? new Set() : new Set(camps)); };

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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-hud-900 border border-hud-500 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-hud-500 flex items-center justify-between">
                    <h2 className="font-display text-lg font-bold text-hud-white uppercase tracking-wide flex items-center gap-2">
                        <span className="text-neon-cyan">📄</span> Download Report
                    </h2>
                    <button onClick={onClose} className="text-hud-400 hover:text-hud-white text-xl font-mono">×</button>
                </div>
                <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="mono-label">SELECT_CAMPS</span>
                        <button onClick={toggleAll} className="font-mono text-[10px] font-bold text-neon-cyan hover:text-neon-cyan/80 transition-colors tracking-wider uppercase">
                            {selectedCamps.size === camps.length ? 'DESELECT ALL' : 'SELECT ALL'}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {camps.map(camp => (
                            <label key={camp} className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border ${selectedCamps.has(camp) ? 'bg-neon-cyan-dim border-neon-cyan/30' : 'bg-hud-800 border-hud-500 hover:border-hud-400'}`}>
                                <input type="checkbox" checked={selectedCamps.has(camp)} onChange={() => toggleCamp(camp)} className="w-4 h-4 accent-cyan-400" />
                                <span className="font-mono text-xs text-hud-white font-medium flex-1">{camp}</span>
                                <span className="font-mono text-[10px] text-hud-400">[{registrations.filter(r => r.camp === camp).length}]</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="p-5 border-t border-hud-500 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-hud-400 tracking-wider">
                        {selectedCamps.size > 0 ? `${registrations.filter(r => selectedCamps.has(r.camp)).length} ENTRIES` : 'NO CAMPS SELECTED'}
                    </span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 btn-outline text-xs">CANCEL</button>
                        <button onClick={handleDownload} disabled={selectedCamps.size === 0}
                            className="px-5 py-2.5 btn-primary text-xs">
                            📥 DOWNLOAD .TXT
                        </button>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-hud-900 border border-hud-500 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-hud-500">
                    <h2 className="font-display text-lg font-bold text-hud-white uppercase tracking-wide flex items-center gap-2">
                        <span className="text-alert-red">🚨</span> Dispatch Rescue Team
                    </h2>
                </div>
                <div className="p-5 space-y-4">
                    <div className="bg-alert-red-dim border border-alert-red/20 p-4 space-y-3">
                        <div className="flex justify-between">
                            <span className="mono-label">REPORTED_BY</span>
                            <span className="font-mono text-xs text-hud-white font-semibold">{report.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="mono-label">CAMP</span>
                            <span className="font-mono text-xs text-neon-cyan font-medium">{report.camp}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="mono-label">VILLAGE</span>
                            <span className="font-mono text-xs text-hud-200 font-medium">{report.village || 'N/A'}</span>
                        </div>
                    </div>
                    <div>
                        <div className="mono-label mb-2">
                            {report.trapped ? 'TRAPPED_DETAILS' : 'MEDICAL_DETAILS'}
                        </div>
                        <p className="font-mono text-xs text-hud-200 bg-hud-800 border border-hud-500 p-3 leading-relaxed">
                            "{report.trapped ? report.trappedDescription : report.injuryDescription}"
                        </p>
                    </div>

                    {dispatching && (
                        <div className="text-center py-2 animate-fade-in-up">
                            <div className="inline-flex items-center gap-2 font-mono text-xs text-status-green font-bold tracking-wider">
                                <span className="w-2 h-2 bg-status-green animate-status-pulse" />
                                DISPATCHING RESCUE TEAM...
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-5 border-t border-hud-500 flex gap-3 justify-end">
                    <button onClick={onClose} disabled={dispatching} className="px-5 py-2.5 btn-outline text-xs">CANCEL</button>
                    <button onClick={handleDispatch} disabled={dispatching}
                        className="px-5 py-2.5 text-xs font-mono font-bold text-hud-white bg-alert-red hover:bg-alert-red/80 disabled:bg-hud-600 disabled:text-hud-400 border border-alert-red disabled:border-hud-500 transition-colors uppercase tracking-wider">
                        {dispatching ? '⏳ SENDING...' : '🚁 SEND RESCUE TEAM'}
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
    const [dispatches, setDispatches] = useState([]);
    const [resources, setResources] = useState([]);
    const [campNames, setCampNames] = useState([]);
    const [rescueDateFilter, setRescueDateFilter] = useState('ALL_TIME');
    const [medicalDateFilter, setMedicalDateFilter] = useState('ALL_TIME');

    const load = async () => {
        try {
            const [regs, st, disp, res, campData] = await Promise.all([
                fetchRegistrations(), fetchStats(), fetchDispatches(), fetchResources(), fetchCamps()
            ]);
            setRegistrations(regs);
            setStats(st);
            setDispatches(disp);
            setResources(res);
            setCampNames(campData.map(c => c.name));
        } catch { }
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleDispatched = async (id) => {
        const ismedical = id.startsWith('med-');
        const realId = ismedical ? id.replace('med-', '') : id;
        const report = registrations.find(r => r.id === realId);
        if (report) {
            try {
                // Mark as dispatched in DB (persistent)
                await markDispatched(realId, ismedical ? 'medical' : 'rescue');
                // Create dispatch log entry
                await createDispatch({
                    type: ismedical ? 'medical' : 'rescue',
                    camp_name: report.camp,
                    team_member_name: '',
                    dispatch_location: report.village || report.camp,
                    dispatch_reason: ismedical ? (report.injuryDescription || 'Medical emergency') : (report.trappedDescription || 'Trapped person'),
                    reported_by: report.name,
                });
                // Reload all data
                await load();
            } catch { }
        }
    };

    const filterDispatches = (type, dateFilter) => {
        let entries = dispatches.filter(d => d.type === type);
        if (dateFilter === 'TODAY') {
            const today = new Date().toDateString();
            entries = entries.filter(d => new Date(d.dispatch_time).toDateString() === today);
        } else if (dateFilter === 'LAST_24H') {
            const cutoff = Date.now() - 24 * 60 * 60 * 1000;
            entries = entries.filter(d => new Date(d.dispatch_time).getTime() > cutoff);
        }
        return entries;
    };

    // If viewing a specific camp
    if (selectedCampView) {
        return <CampDetailView campName={selectedCampView} registrations={registrations} onBack={() => setSelectedCampView(null)} />;
    }

    const rescueClusters = clusterTrappedReports(registrations);
    const campStats = stats.campStats || {};

    const resourceByCamp = {};
    campNames.forEach(c => { resourceByCamp[c] = { FOOD: 0, WATER: 0, MEDICINE: 0 }; });
    registrations.forEach(r => {
        if (resourceByCamp[r.camp]) r.needs?.forEach(n => {
            const upper = n.toUpperCase();
            if (upper.includes('FOOD')) resourceByCamp[r.camp].FOOD++;
            if (upper.includes('WATER')) resourceByCamp[r.camp].WATER++;
            if (upper.includes('MEDICINE')) resourceByCamp[r.camp].MEDICINE++;
        });
    });

    const allNeeds = ['FOOD', 'WATER', 'MEDICINE'];

    function getCampColor(camp) {
        const s = campStats[camp];
        if (!s || !s.lastTime) return 'bg-hud-400';
        const mins = (Date.now() - new Date(s.lastTime).getTime()) / 60000;
        if (mins < 30) return 'bg-status-green';
        if (mins < 60) return 'bg-warn-amber';
        return 'bg-alert-red';
    }

    const liveFeed = [...registrations].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);
    const priorityLabels = ['P1', 'P2', 'P3'];
    const priorityColors = ['border-alert-red/40 bg-alert-red-dim', 'border-warn-orange/40 bg-warn-orange-dim', 'border-warn-amber/40 bg-warn-amber-dim'];

    const medicalReports = registrations.filter(r => r.injured && r.injuryDescription && !r.medicalDispatched);

    return (
        <div className="min-h-screen bg-hud-black hud-grid text-hud-white hud-scrollbar">
            {showClearModal && <ClearModal registrations={registrations} camps={campNames} onClose={() => setShowClearModal(false)} onDeleted={load} />}
            {showReportModal && <ReportModal registrations={registrations} camps={campNames} onClose={() => setShowReportModal(false)} />}
            {rescueTarget && <RescueModal report={rescueTarget} onClose={() => setRescueTarget(null)} onDispatched={handleDispatched} />}

            {/* Top Bar */}
            <div className="border-b border-hud-500 px-4 sm:px-6 py-3 flex items-center justify-between bg-hud-900">
                <Link to="/" className="font-mono text-xs text-hud-300 hover:text-neon-cyan transition-colors tracking-wider uppercase">← Home</Link>
                <h1 className="font-mono text-xs text-hud-white tracking-wider uppercase">
                    RELIEF<span className="text-neon-cyan">LINK</span> // <span className="text-hud-400">COORDINATOR</span>
                </h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowReportModal(true)} className="px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase border border-hud-500 hover:border-neon-cyan text-hud-300 hover:text-neon-cyan transition-colors">
                        📄 REPORT
                    </button>
                    <button onClick={() => setShowClearModal(true)} className="px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase border border-alert-red/40 hover:border-alert-red text-alert-red/70 hover:text-alert-red transition-colors">
                        🗑️ CLEAR
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 sm:p-6">
                {[
                    { label: 'TOTAL_SURVIVORS', value: stats.totalSurvivors, color: 'text-alert-red' },
                    { label: 'CAMPS_ACTIVE', value: stats.activeCamps, color: 'text-neon-cyan' },
                    { label: 'RESCUE_ALERTS', value: stats.trappedCount, color: 'text-warn-orange' },
                    { label: 'MEDICAL_EMERGENCIES', value: stats.medicalCount, color: 'text-alert-red' },
                ].map(stat => (
                    <div key={stat.label} className="border border-hud-500 bg-hud-900 p-4">
                        <p className="mono-label">{stat.label}</p>
                        <p className={`font-mono text-3xl sm:text-4xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 sm:p-6 pt-0 sm:pt-0">
                {/* Panel 1: Rescue Priorities */}
                <div className="border border-hud-500 bg-hud-900 p-5 min-h-[500px]">
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-alert-red animate-status-pulse" /> RESCUE_PRIORITIES
                    </h2>
                    {rescueClusters.length === 0 && medicalReports.length === 0 ? (
                        <p className="font-mono text-xs text-hud-400">No trapped person reports</p>
                    ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto hud-scrollbar pr-1">
                            {rescueClusters.map((cluster, i) => (
                                <div key={i} className={`p-4 border ${priorityColors[Math.min(i, 2)]}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-mono text-[10px] font-bold tracking-widest text-hud-white bg-hud-600 px-2 py-0.5">
                                            {priorityLabels[Math.min(i, 2)]}
                                        </span>
                                        <span className="font-mono text-[10px] text-hud-400 ml-auto tracking-wider">
                                            [{cluster.count} REPORT{cluster.count > 1 ? 'S' : ''}]
                                        </span>
                                    </div>
                                    <p className="font-mono text-xs font-semibold text-hud-200 mb-2 capitalize">{cluster.label}</p>
                                    <div className="space-y-2">
                                        {cluster.reports.map(r => (
                                            <div key={r.id} className="font-mono text-[10px] text-hud-400 bg-hud-800 border border-hud-500 p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <span className="text-hud-200 font-medium">{r.name}</span>
                                                        <span className="text-hud-500 mx-1">•</span>
                                                        <span className="text-hud-400">{r.camp}</span>
                                                        <p className="mt-1 text-hud-300">"{r.trappedDescription}"</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setRescueTarget(r)}
                                                        className="shrink-0 px-3 py-1.5 font-mono text-[10px] font-bold bg-alert-red hover:bg-alert-red/80 text-hud-white border border-alert-red transition-colors tracking-wider"
                                                    >
                                                        🚁 SEND RESCUE
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Medical emergencies — rendered independently of rescue clusters */}
                            {medicalReports.length > 0 && (
                                <div className="p-4 border border-alert-red/40 bg-alert-red-dim">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-mono text-[10px] font-bold tracking-widest text-hud-white bg-alert-red px-2 py-0.5">MED</span>
                                        <span className="font-display text-xs font-bold uppercase tracking-wider">Medical Emergencies</span>
                                        <span className="font-mono text-[10px] text-hud-400 ml-auto tracking-wider">[{medicalReports.length}]</span>
                                    </div>
                                    <div className="space-y-2">
                                        {medicalReports.map(r => (
                                            <div key={`med-${r.id}`} className="font-mono text-[10px] text-hud-400 bg-hud-800 border border-hud-500 p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <span className="text-hud-200 font-medium">{r.name}</span>
                                                        <span className="text-hud-500 mx-1">•</span>
                                                        <span className="text-hud-400">{r.camp}</span>
                                                        <p className="mt-1 text-alert-red">🚨 {r.injuryDescription}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setRescueTarget({ ...r, id: `med-${r.id}` })}
                                                        className="shrink-0 px-3 py-1.5 font-mono text-[10px] font-bold bg-alert-red hover:bg-alert-red/80 text-hud-white border border-alert-red transition-colors tracking-wider"
                                                    >
                                                        🏥 SEND MEDICAL
                                                    </button>
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
                <div className="border border-hud-500 bg-hud-900 p-5 min-h-[500px]">
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="text-base">📦</span> RESOURCE_MATCHING
                    </h2>

                    {/* Resource Allocation Summary from DB */}
                    <div className="mb-4">
                        <p className="mono-label mb-3">RESOURCE_ALLOCATION_SUMMARY</p>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {['FOOD', 'WATER', 'MEDICINE'].map(need => {
                                const key = need.toLowerCase();
                                const totalAvail = resources.reduce((s, r) => s + (r[`${key}_total`] || 0), 0);
                                const totalAlloc = resources.reduce((s, r) => s + (r[`${key}_allocated`] || 0), 0);
                                const remaining = totalAvail - totalAlloc;
                                return (
                                    <div key={need} className="border border-hud-500 bg-hud-800 p-3">
                                        <p className="font-mono text-[10px] text-hud-400 tracking-wider font-bold mb-2">
                                            {need === 'FOOD' ? '🍚' : need === 'WATER' ? '💧' : '💊'} {need}
                                        </p>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between">
                                                <span className="font-mono text-[9px] text-hud-400">TOTAL</span>
                                                <span className="font-mono text-xs font-bold text-hud-200">{totalAvail}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-mono text-[9px] text-hud-400">ALLOC</span>
                                                <span className="font-mono text-xs font-bold text-neon-cyan">{totalAlloc}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-mono text-[9px] text-hud-400">REM</span>
                                                <span className={`font-mono text-xs font-bold ${remaining > 30 ? 'text-status-green' : remaining > 0 ? 'text-warn-amber' : 'text-alert-red'}`}>{remaining}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Per-Camp Allocation from DB */}
                    <p className="mono-label mb-2">ALLOCATION_PER_CAMP</p>
                    <div className="overflow-x-auto">
                        <table className="w-full font-mono text-xs">
                            <thead>
                                <tr className="text-hud-400 text-[10px] uppercase tracking-widest border-b border-hud-500">
                                    <th className="pb-2 text-left font-medium">CAMP</th>
                                    <th className="pb-2 text-center font-medium">FOOD</th>
                                    <th className="pb-2 text-center font-medium">WATER</th>
                                    <th className="pb-2 text-center font-medium">MED</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resources.map(r => {
                                    const campLabel = (r.camp_name || '').replace(' Camp', '').replace(' Relief', '');
                                    return (
                                        <tr key={r.camp_id} className="border-b border-hud-500/50">
                                            <td className="py-2 text-hud-200 text-[10px] font-medium max-w-[100px] truncate">{campLabel}</td>
                                            {['food', 'water', 'medicine'].map(k => {
                                                const total = r[`${k}_total`] || 0;
                                                const alloc = r[`${k}_allocated`] || 0;
                                                const rem = total - alloc;
                                                return (
                                                    <td key={k} className="py-2 text-center">
                                                        <div className="font-mono text-[10px]">
                                                            <span className={`px-1.5 py-0.5 font-bold border ${rem > 20 ? 'bg-status-green-dim text-status-green border-status-green/30' : rem > 0 ? 'bg-warn-amber-dim text-warn-amber border-warn-amber/30' : 'bg-alert-red-dim text-alert-red border-alert-red/30'}`}>
                                                                {alloc}/{total}
                                                            </span>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Panel 3: Camp Status */}
                <div className="border border-hud-500 bg-hud-900 p-5">
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="text-base">🏕️</span> CAMP_STATUS
                    </h2>
                    <div className="space-y-2">
                        {campNames.map(camp => {
                            const s = campStats[camp] || {};
                            const color = getCampColor(camp);
                            return (
                                <button
                                    key={camp}
                                    onClick={() => setSelectedCampView(camp)}
                                    className="w-full bg-hud-800 hover:bg-hud-700 border border-hud-500 hover:border-neon-cyan p-3 flex items-center gap-3 text-left transition-all group"
                                >
                                    <div className={`w-2.5 h-2.5 ${color} shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-mono text-xs font-semibold text-hud-200 truncate group-hover:text-neon-cyan transition-colors">{camp}</p>
                                        <div className="flex items-center gap-3 font-mono text-[10px] text-hud-400 mt-0.5 tracking-wider flex-wrap">
                                            <span>[{s.count || 0} registered]</span>
                                            {s.lastTime && <span>Last: {timeAgo(s.lastTime)}</span>}
                                            {s.medicalEmergencies > 0 && <span className="text-alert-red font-medium">🚨 {s.medicalEmergencies} medical</span>}
                                        </div>
                                        <div className="flex items-center gap-3 font-mono text-[10px] mt-1 tracking-wider flex-wrap">
                                            {s.foodRemaining !== undefined && (
                                                <span className={s.foodRemaining > 20 ? 'text-status-green' : s.foodRemaining > 0 ? 'text-warn-amber' : 'text-alert-red'}>🍚 {s.foodRemaining}</span>
                                            )}
                                            {s.waterRemaining !== undefined && (
                                                <span className={s.waterRemaining > 20 ? 'text-status-green' : s.waterRemaining > 0 ? 'text-warn-amber' : 'text-alert-red'}>💧 {s.waterRemaining}</span>
                                            )}
                                            {s.medicineRemaining !== undefined && (
                                                <span className={s.medicineRemaining > 20 ? 'text-status-green' : s.medicineRemaining > 0 ? 'text-warn-amber' : 'text-alert-red'}>💊 {s.medicineRemaining}</span>
                                            )}
                                            {(s.activeRescue || 0) > 0 && <span className="text-warn-orange font-medium">🚁 {s.activeRescue} rescue</span>}
                                            {(s.activeMedical || 0) > 0 && <span className="text-alert-red font-medium">🏥 {s.activeMedical} medical</span>}
                                        </div>
                                    </div>
                                    <span className="text-hud-500 group-hover:text-neon-cyan transition-colors font-mono text-xs">→</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Panel 4: Live Feed */}
                <div className="border border-hud-500 bg-hud-900 p-5">
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-status-green animate-status-pulse" /> LIVE_FEED
                    </h2>
                    <div className="space-y-1.5 max-h-[400px] overflow-y-auto hud-scrollbar pr-1">
                        {liveFeed.length === 0 ? <p className="font-mono text-xs text-hud-400">No registrations yet</p> : liveFeed.map(r => {
                            const isMedical = r.injured && r.injuryDescription;
                            const isTrapped = r.trapped;
                            return (
                                <div key={r.id} className={`p-3 font-mono text-[10px] border ${isMedical ? 'bg-alert-red-dim border-alert-red/20' : isTrapped ? 'bg-warn-orange-dim border-warn-orange/20' : 'bg-hud-800 border-hud-500/50'}`}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-hud-400">{formatTime(r.timestamp)}</span>
                                        <span className="font-semibold text-hud-200">{r.name}</span>
                                        <span className="text-hud-500">•</span>
                                        <span className="text-hud-400">{r.village}</span>
                                        <span className="text-hud-500">•</span>
                                        <span className="text-hud-400 truncate max-w-[120px]">{r.camp.replace(' Camp', '')}</span>
                                        {r.needs?.length > 0 && <><span className="text-hud-500">•</span><span className="text-warn-amber">{r.needs.join(', ')}</span></>}
                                        {isMedical && <span className="text-alert-red font-bold ml-auto">🚨 MEDICAL</span>}
                                        {isTrapped && <span className="text-warn-orange font-bold ml-auto">⚠️ TRAPPED</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Dispatch History Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 sm:p-6 pt-0 sm:pt-0">
                {/* Panel 5: Rescue Team Dispatched */}
                <div className="border border-hud-500 bg-hud-900 p-5">
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="text-base">🚁</span> RESCUE_TEAM_DISPATCHED
                        <span className="font-mono text-[10px] text-hud-400 ml-auto tracking-wider">[{dispatches.filter(d => d.type === 'rescue').length}]</span>
                    </h2>
                    <div className="flex gap-2 mb-3 flex-wrap">
                        <select value={rescueDateFilter} onChange={e => setRescueDateFilter(e.target.value)}
                            className="px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider hud-input bg-hud-800 border-hud-500">
                            <option value="ALL_TIME">ALL TIME</option>
                            <option value="TODAY">TODAY</option>
                            <option value="LAST_24H">LAST 24H</option>
                        </select>
                    </div>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto hud-scrollbar pr-1">
                        {filterDispatches('rescue', rescueDateFilter).length === 0 ? (
                            <p className="font-mono text-xs text-hud-400 text-center py-6">No rescue teams dispatched yet</p>
                        ) : filterDispatches('rescue', rescueDateFilter).map(d => (
                            <div key={d.id} className="bg-hud-800 border border-hud-500 p-3 font-mono text-[10px]">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-neon-cyan">RSC-{String(d.id).padStart(3, '0')}</span>
                                        <span className="text-hud-500">•</span>
                                        <span className="text-hud-200">{d.reported_by}</span>
                                    </div>
                                    <span className={`shrink-0 px-2 py-1 font-bold tracking-wider border ${d.status === 'Dispatched' ? 'bg-status-green-dim text-status-green border-status-green/30' : 'bg-warn-amber-dim text-warn-amber border-warn-amber/30'}`}>
                                        {d.status === 'Dispatched' ? '✓' : '⏳'} {d.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-hud-400">
                                    <div><span className="text-hud-500">LOC:</span> <span className="text-hud-200">{d.dispatch_location}</span></div>
                                    <div><span className="text-hud-500">CAMP:</span> <span className="text-hud-200">{(d.camp_name || '').replace(' Camp', '')}</span></div>
                                    <div className="col-span-2"><span className="text-hud-500">REASON:</span> <span className="text-hud-300">{d.dispatch_reason}</span></div>
                                    <div><span className="text-hud-500">TIME:</span> <span className="text-hud-200">{formatFullTime(d.dispatch_time)}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Panel 6: Medical Team Dispatched */}
                <div className="border border-hud-500 bg-hud-900 p-5">
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="text-base">🏥</span> MEDICAL_TEAM_DISPATCHED
                        <span className="font-mono text-[10px] text-hud-400 ml-auto tracking-wider">[{dispatches.filter(d => d.type === 'medical').length}]</span>
                    </h2>
                    <div className="flex gap-2 mb-3 flex-wrap">
                        <select value={medicalDateFilter} onChange={e => setMedicalDateFilter(e.target.value)}
                            className="px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider hud-input bg-hud-800 border-hud-500">
                            <option value="ALL_TIME">ALL TIME</option>
                            <option value="TODAY">TODAY</option>
                            <option value="LAST_24H">LAST 24H</option>
                        </select>
                    </div>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto hud-scrollbar pr-1">
                        {filterDispatches('medical', medicalDateFilter).length === 0 ? (
                            <p className="font-mono text-xs text-hud-400 text-center py-6">No medical teams dispatched yet</p>
                        ) : filterDispatches('medical', medicalDateFilter).map(d => (
                            <div key={d.id} className="bg-hud-800 border border-hud-500 p-3 font-mono text-[10px]">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-alert-red">MED-{String(d.id).padStart(3, '0')}</span>
                                        <span className="text-hud-500">•</span>
                                        <span className="text-hud-200">{d.reported_by}</span>
                                    </div>
                                    <span className={`shrink-0 px-2 py-1 font-bold tracking-wider border ${d.status === 'Dispatched' ? 'bg-status-green-dim text-status-green border-status-green/30' : 'bg-warn-amber-dim text-warn-amber border-warn-amber/30'}`}>
                                        {d.status === 'Dispatched' ? '✓' : '⏳'} {d.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-hud-400">
                                    <div><span className="text-hud-500">LOC:</span> <span className="text-hud-200">{d.dispatch_location}</span></div>
                                    <div><span className="text-hud-500">CAMP:</span> <span className="text-hud-200">{(d.camp_name || '').replace(' Camp', '')}</span></div>
                                    <div className="col-span-2"><span className="text-hud-500">REASON:</span> <span className="text-alert-red">🚨 {d.dispatch_reason}</span></div>
                                    <div><span className="text-hud-500">TIME:</span> <span className="text-hud-200">{formatFullTime(d.dispatch_time)}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
