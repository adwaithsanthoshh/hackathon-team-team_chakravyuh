import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createRegistration, fetchStats } from '../utils/api';

const CAMPS = [
    'Meppadi Relief Camp',
    'Chooralmala School Camp',
    'Kalpetta Government Camp',
    'Mananthavady Town Camp',
    'Sulthan Bathery Camp',
];

const NEED_OPTIONS = ['FOOD', 'WATER', 'MEDICINE', 'OTHER'];
const NEED_ICONS = { FOOD: '🍚', WATER: '💧', MEDICINE: '💊', OTHER: '✏️' };
const CAMP_STORAGE_KEY = 'relieflink_selected_camp';

export default function Kiosk() {
    const [camp, setCamp] = useState('');
    const [step, setStep] = useState('camp');
    const [regCount, setRegCount] = useState(0);
    const [lastEntry, setLastEntry] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [name, setName] = useState('');
    const [village, setVillage] = useState('');
    const [familyCount, setFamilyCount] = useState(1);
    const [injured, setInjured] = useState(false);
    const [injuryDesc, setInjuryDesc] = useState('');
    const [trapped, setTrapped] = useState(false);
    const [trappedDesc, setTrappedDesc] = useState('');
    const [needs, setNeeds] = useState([]);
    const [otherNeedText, setOtherNeedText] = useState('');
    const [otherNeedError, setOtherNeedError] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(CAMP_STORAGE_KEY);
        if (saved) setCamp(saved);
        fetchStats().then(data => setRegCount(data.totalRegistrations)).catch(() => { });
    }, []);

    const handleCampSelect = () => {
        if (!camp) return;
        localStorage.setItem(CAMP_STORAGE_KEY, camp);
        setStep('form');
    };

    const toggleNeed = (need) => {
        setNeeds(prev => prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]);
        if (need === 'OTHER') {
            setOtherNeedError(false);
            if (needs.includes('OTHER')) setOtherNeedText('');
        }
    };

    const resetForm = () => {
        setName(''); setVillage(''); setFamilyCount(1);
        setInjured(false); setInjuryDesc('');
        setTrapped(false); setTrappedDesc(''); setNeeds([]);
        setOtherNeedText(''); setOtherNeedError(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || submitting) return;
        // Validate OTHER need
        if (needs.includes('OTHER') && !otherNeedText.trim()) {
            setOtherNeedError(true);
            return;
        }
        setOtherNeedError(false);
        setSubmitting(true);
        // Build final needs array: replace 'OTHER' with 'OTHER: <text>'
        const finalNeeds = needs.map(n => n === 'OTHER' ? `OTHER: ${otherNeedText.trim()}` : n);
        try {
            const entry = await createRegistration({
                name: name.trim(), village: village.trim(), camp, familyCount,
                injured, injuryDescription: injured ? injuryDesc.trim() : '',
                trapped, trappedDescription: trapped ? trappedDesc.trim() : '', needs: finalNeeds,
            });
            setLastEntry(entry);
            const stats = await fetchStats();
            setRegCount(stats.totalRegistrations);
            setStep('success');
        } catch { alert('Failed to save registration. Please try again.'); }
        finally { setSubmitting(false); }
    };

    const StatusBar = () => (
        <div className="border-b border-hud-500 px-4 sm:px-6 py-3 flex items-center justify-between bg-hud-900">
            <Link to="/" className="font-mono text-xs text-hud-300 hover:text-neon-cyan transition-colors tracking-wider uppercase">
                ← Home
            </Link>
            <div className="font-mono text-[10px] text-hud-400 tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-neon-cyan animate-status-pulse" />
                [{regCount} REGISTERED]
            </div>
        </div>
    );

    // ========== CAMP SELECT ==========
    if (step === 'camp') {
        return (
            <div className="min-h-screen bg-hud-black hud-grid">
                <StatusBar />
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-52px)] p-6">
                    <div className="w-full max-w-lg animate-fade-in-up">
                        <div className="font-mono text-[10px] text-hud-400 tracking-[0.2em] uppercase mb-3">
                            // KIOSK INITIALIZATION
                        </div>
                        <h1 className="font-display text-3xl sm:text-5xl font-black text-hud-white uppercase tracking-tight mb-2">
                            Camp<span className="text-neon-cyan">_</span>Select
                        </h1>
                        <p className="font-mono text-xs text-hud-300 mb-10">
                            Select which camp this kiosk is located at
                        </p>

                        <label className="mono-label block mb-2">CAMP_LOCATION</label>
                        <select
                            value={camp}
                            onChange={(e) => setCamp(e.target.value)}
                            className="w-full text-base p-4 hud-input appearance-none"
                        >
                            <option value="">— SELECT A CAMP —</option>
                            {CAMPS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <button
                            onClick={handleCampSelect}
                            disabled={!camp}
                            className="w-full mt-6 py-4 btn-primary text-base tracking-wider"
                        >
                            CONTINUE →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ========== SUCCESS ==========
    if (step === 'success' && lastEntry) {
        return (
            <div className="min-h-screen bg-hud-black hud-grid">
                <StatusBar />
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-52px)] p-6">
                    <div className="text-center animate-fade-in-up w-full max-w-lg">
                        <div className="w-20 h-20 border-2 border-status-green flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl text-status-green">✓</span>
                        </div>
                        <h1 className="font-display text-3xl sm:text-4xl font-black text-hud-white uppercase tracking-tight mb-4">
                            Registered
                        </h1>

                        <div className="border border-hud-500 bg-hud-900 p-6 mb-6">
                            <div className="mono-label mb-2">REGISTRATION_ID</div>
                            <p className="font-mono text-2xl sm:text-3xl font-bold text-neon-cyan tracking-wider">
                                {lastEntry.id}
                            </p>
                        </div>

                        <p className="font-mono text-xs text-hud-300 mb-8">
                            Show this ID to camp staff if needed
                        </p>

                        <button
                            onClick={() => { resetForm(); setStep('form'); }}
                            className="w-full py-4 btn-primary text-base tracking-wider"
                        >
                            REGISTER ANOTHER PERSON
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ========== REGISTRATION FORM ==========
    return (
        <div className="min-h-screen bg-hud-black hud-grid">
            <StatusBar />
            <div className="max-w-xl mx-auto p-6 pb-12">
                {/* Header */}
                <div className="mb-8 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <div className="font-mono text-[10px] text-hud-400 tracking-[0.2em] uppercase mb-2">
                                // SURVIVOR REGISTRATION
                            </div>
                            <h1 className="font-display text-2xl sm:text-3xl font-black text-hud-white uppercase tracking-tight">
                                Register<span className="text-neon-cyan">_</span>Survivor
                            </h1>
                        </div>
                        <button onClick={() => setStep('camp')} className="font-mono text-[10px] text-hud-300 hover:text-neon-cyan transition-colors border border-hud-500 hover:border-neon-cyan px-3 py-1.5 uppercase tracking-wider">
                            Change Camp
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="w-1.5 h-1.5 bg-neon-cyan animate-status-pulse" />
                        <span className="font-mono text-xs text-neon-cyan">{camp}</span>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div>
                        <label className="mono-label block mb-2">
                            FULL_NAME <span className="text-alert-red">*</span>
                        </label>
                        <input
                            type="text" value={name} onChange={e => setName(e.target.value)}
                            placeholder="Enter full name" required
                            className="w-full text-base p-4 hud-input"
                        />
                    </div>

                    {/* Village */}
                    <div>
                        <label className="mono-label block mb-2">VILLAGE_ORIGIN</label>
                        <input
                            type="text" value={village} onChange={e => setVillage(e.target.value)}
                            placeholder="Enter village or area name"
                            className="w-full text-base p-4 hud-input"
                        />
                    </div>

                    {/* Family count */}
                    <div>
                        <label className="mono-label block mb-3">FAMILY_COUNT</label>
                        <div className="flex items-center gap-4">
                            <button type="button" onClick={() => setFamilyCount(Math.max(1, familyCount - 1))}
                                className="w-14 h-14 border border-hud-500 hover:border-neon-cyan text-hud-white font-mono text-xl font-bold transition-colors bg-hud-900">
                                −
                            </button>
                            <span className="font-mono text-4xl font-bold text-hud-white min-w-[3rem] text-center">
                                {familyCount}
                            </span>
                            <button type="button" onClick={() => setFamilyCount(Math.min(20, familyCount + 1))}
                                className="w-14 h-14 border border-hud-500 hover:border-neon-cyan text-hud-white font-mono text-xl font-bold transition-colors bg-hud-900">
                                +
                            </button>
                        </div>
                    </div>

                    {/* Injured */}
                    <div>
                        <label className="mono-label block mb-3">INJURY_STATUS</label>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setInjured(true)}
                                className={`flex-1 py-4 font-mono text-sm font-bold uppercase tracking-wider border transition-all ${injured
                                    ? 'bg-alert-red/20 border-alert-red text-alert-red'
                                    : 'bg-hud-900 border-hud-500 text-hud-300 hover:border-alert-red'
                                    }`}>YES</button>
                            <button type="button" onClick={() => { setInjured(false); setInjuryDesc(''); }}
                                className={`flex-1 py-4 font-mono text-sm font-bold uppercase tracking-wider border transition-all ${!injured
                                    ? 'bg-status-green/10 border-status-green text-status-green'
                                    : 'bg-hud-900 border-hud-500 text-hud-300 hover:border-status-green'
                                    }`}>NO</button>
                        </div>
                        {injured && (
                            <textarea value={injuryDesc} onChange={e => setInjuryDesc(e.target.value)}
                                placeholder="Describe the injury..."
                                className="w-full mt-3 text-sm p-4 hud-input min-h-[100px] border-alert-red/50 focus:border-alert-red" />
                        )}
                    </div>

                    {/* Trapped */}
                    <div>
                        <label className="mono-label block mb-3">TRAPPED_REPORT</label>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setTrapped(true)}
                                className={`flex-1 py-4 font-mono text-sm font-bold uppercase tracking-wider border transition-all ${trapped
                                    ? 'bg-warn-orange/20 border-warn-orange text-warn-orange'
                                    : 'bg-hud-900 border-hud-500 text-hud-300 hover:border-warn-orange'
                                    }`}>YES</button>
                            <button type="button" onClick={() => { setTrapped(false); setTrappedDesc(''); }}
                                className={`flex-1 py-4 font-mono text-sm font-bold uppercase tracking-wider border transition-all ${!trapped
                                    ? 'bg-status-green/10 border-status-green text-status-green'
                                    : 'bg-hud-900 border-hud-500 text-hud-300 hover:border-status-green'
                                    }`}>NO</button>
                        </div>
                        {trapped && (
                            <textarea value={trappedDesc} onChange={e => setTrappedDesc(e.target.value)}
                                placeholder="Describe exactly where they are trapped..."
                                className="w-full mt-3 text-sm p-4 hud-input min-h-[140px] border-warn-orange/50 focus:border-warn-orange" />
                        )}
                    </div>

                    {/* Needs */}
                    <div>
                        <label className="mono-label block mb-3">IMMEDIATE_NEEDS</label>
                        <div className="grid grid-cols-2 gap-3">
                            {NEED_OPTIONS.map(need => (
                                <button key={need} type="button" onClick={() => toggleNeed(need)}
                                    className={`py-4 font-mono text-sm font-bold uppercase tracking-wider border transition-all ${needs.includes(need)
                                        ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan'
                                        : 'bg-hud-900 border-hud-500 text-hud-300 hover:border-neon-cyan'
                                        }`}>
                                    {NEED_ICONS[need]} {need}
                                </button>
                            ))}
                        </div>
                        {/* Other need text input */}
                        {needs.includes('OTHER') && (
                            <div className="mt-3">
                                <input
                                    type="text"
                                    value={otherNeedText}
                                    onChange={e => { setOtherNeedText(e.target.value); setOtherNeedError(false); }}
                                    placeholder="Describe your specific need..."
                                    className={`w-full text-sm p-4 hud-input ${otherNeedError ? 'border-alert-red focus:border-alert-red' : ''}`}
                                />
                                {otherNeedError && (
                                    <p className="font-mono text-[10px] text-alert-red mt-1.5 tracking-wider">
                                        ⚠ PLEASE DESCRIBE THE CUSTOM NEED
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={submitting}
                        className="w-full py-5 btn-primary text-base tracking-wider mt-4">
                        {submitting ? '⏳ SAVING...' : '✓ REGISTER_SURVIVOR'}
                    </button>
                </form>

                {/* Bottom HUD */}
                <div className="mt-8 pt-4 border-t border-hud-500 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-hud-400 tracking-wider">SYS.KIOSK</span>
                    <span className="font-mono text-[10px] text-neon-cyan tracking-wider flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-neon-cyan animate-status-pulse" />
                        [ACTIVE]
                    </span>
                </div>
            </div>
        </div>
    );
}
