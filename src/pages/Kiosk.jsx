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

const NEED_OPTIONS = ['FOOD', 'WATER', 'MEDICINE', 'SHELTER'];
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
    };

    const resetForm = () => {
        setName(''); setVillage(''); setFamilyCount(1);
        setInjured(false); setInjuryDesc('');
        setTrapped(false); setTrappedDesc(''); setNeeds([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || submitting) return;
        setSubmitting(true);
        try {
            const entry = await createRegistration({
                name: name.trim(), village: village.trim(), camp, familyCount,
                injured, injuryDescription: injured ? injuryDesc.trim() : '',
                trapped, trappedDescription: trapped ? trappedDesc.trim() : '', needs,
            });
            setLastEntry(entry);
            const stats = await fetchStats();
            setRegCount(stats.totalRegistrations);
            setStep('success');
        } catch { alert('Failed to save registration. Please try again.'); }
        finally { setSubmitting(false); }
    };

    const StatusBar = () => (
        <div className="bg-gradient-to-r from-red-700 to-orange-700 text-white py-3 px-6 flex items-center justify-between">
            <Link to="/" className="text-white/80 hover:text-white font-medium text-lg transition-colors">← Home</Link>
            <div className="text-sm font-medium">{regCount} registrations in database</div>
        </div>
    );

    if (step === 'camp') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-fire-900 to-black">
                <StatusBar />
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-52px)] p-6">
                    <div className="w-full max-w-lg animate-fade-in-up">
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-white text-center mb-2">Relief Camp Kiosk</h1>
                        <p className="text-lg text-orange-300/60 text-center mb-10">Select which camp this kiosk is located at</p>
                        <label className="block text-xl font-semibold text-orange-200 mb-3">Camp Location</label>
                        <select value={camp} onChange={(e) => setCamp(e.target.value)}
                            className="w-full text-xl p-4 border-2 border-fire-600 rounded-xl focus:border-red-500 focus:outline-none bg-fire-800 text-white appearance-none">
                            <option value="">— Select a Camp —</option>
                            {CAMPS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button onClick={handleCampSelect} disabled={!camp}
                            className="w-full mt-6 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-fire-600 disabled:to-fire-600 disabled:cursor-not-allowed text-white text-xl font-bold py-5 rounded-xl transition-all shadow-lg shadow-red-900/30">
                            Continue →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'success' && lastEntry) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-fire-900 to-black">
                <StatusBar />
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-52px)] p-6">
                    <div className="text-center animate-fade-in-up w-full max-w-lg">
                        <div className="w-24 h-24 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-900/30">
                            <span className="text-5xl text-white">✓</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Registered Successfully</h1>
                        <div className="bg-fire-800 border border-fire-600 rounded-xl p-6 mb-6">
                            <p className="text-sm text-orange-300/60 mb-1 font-medium">Your ID</p>
                            <p className="text-2xl sm:text-3xl font-mono font-bold text-red-400 tracking-wide">{lastEntry.id}</p>
                        </div>
                        <p className="text-lg text-orange-200/60 mb-8">Show this to camp staff if needed</p>
                        <button onClick={() => { resetForm(); setStep('form'); }}
                            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-xl font-bold py-5 rounded-xl transition-all shadow-lg shadow-red-900/30">
                            Register Another Person
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-fire-900 to-black">
            <StatusBar />
            <div className="max-w-lg mx-auto p-6 pb-12">
                <div className="mb-8 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-1">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Register Survivor</h1>
                        <button onClick={() => setStep('camp')} className="text-red-400 hover:text-red-300 text-sm font-semibold">Change Camp</button>
                    </div>
                    <p className="text-orange-400 font-semibold text-lg">{camp}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-lg font-bold text-orange-200 mb-2">Full Name <span className="text-red-500">*</span></label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter full name" required
                            className="w-full text-xl p-4 border-2 border-fire-600 rounded-xl focus:border-red-500 focus:outline-none bg-fire-800 text-white placeholder-fire-500" />
                    </div>

                    <div>
                        <label className="block text-lg font-bold text-orange-200 mb-2">Village / Area you came from</label>
                        <input type="text" value={village} onChange={e => setVillage(e.target.value)} placeholder="Enter village or area name"
                            className="w-full text-xl p-4 border-2 border-fire-600 rounded-xl focus:border-red-500 focus:outline-none bg-fire-800 text-white placeholder-fire-500" />
                    </div>

                    <div>
                        <label className="block text-lg font-bold text-orange-200 mb-2">Number of family members WITH you</label>
                        <div className="flex items-center gap-4">
                            <button type="button" onClick={() => setFamilyCount(Math.max(1, familyCount - 1))}
                                className="w-14 h-14 bg-fire-700 hover:bg-fire-600 text-white rounded-xl text-2xl font-bold transition-colors">−</button>
                            <span className="text-3xl font-bold text-white min-w-[3rem] text-center">{familyCount}</span>
                            <button type="button" onClick={() => setFamilyCount(Math.min(20, familyCount + 1))}
                                className="w-14 h-14 bg-fire-700 hover:bg-fire-600 text-white rounded-xl text-2xl font-bold transition-colors">+</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-lg font-bold text-orange-200 mb-3">Is anyone in your group injured?</label>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setInjured(true)}
                                className={`flex-1 py-4 text-xl font-bold rounded-xl border-2 transition-all ${injured ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-fire-800 border-fire-600 text-orange-200 hover:border-red-500'}`}>YES</button>
                            <button type="button" onClick={() => { setInjured(false); setInjuryDesc(''); }}
                                className={`flex-1 py-4 text-xl font-bold rounded-xl border-2 transition-all ${!injured ? 'bg-green-700 border-green-700 text-white shadow-lg' : 'bg-fire-800 border-fire-600 text-orange-200 hover:border-green-500'}`}>NO</button>
                        </div>
                        {injured && (
                            <textarea value={injuryDesc} onChange={e => setInjuryDesc(e.target.value)} placeholder="Describe the injury..."
                                className="w-full mt-3 text-lg p-4 border-2 border-red-700 rounded-xl focus:border-red-500 focus:outline-none bg-fire-800 text-white placeholder-fire-500 min-h-[100px]" />
                        )}
                    </div>

                    <div>
                        <label className="block text-lg font-bold text-orange-200 mb-3">Is anyone still TRAPPED at your location?</label>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setTrapped(true)}
                                className={`flex-1 py-4 text-xl font-bold rounded-xl border-2 transition-all ${trapped ? 'bg-orange-600 border-orange-600 text-white shadow-lg' : 'bg-fire-800 border-fire-600 text-orange-200 hover:border-orange-500'}`}>YES</button>
                            <button type="button" onClick={() => { setTrapped(false); setTrappedDesc(''); }}
                                className={`flex-1 py-4 text-xl font-bold rounded-xl border-2 transition-all ${!trapped ? 'bg-green-700 border-green-700 text-white shadow-lg' : 'bg-fire-800 border-fire-600 text-orange-200 hover:border-green-500'}`}>NO</button>
                        </div>
                        {trapped && (
                            <textarea value={trappedDesc} onChange={e => setTrappedDesc(e.target.value)} placeholder="Describe exactly where they are trapped..."
                                className="w-full mt-3 text-lg p-4 border-2 border-orange-700 rounded-xl focus:border-orange-500 focus:outline-none bg-fire-800 text-white placeholder-fire-500 min-h-[140px]" />
                        )}
                    </div>

                    <div>
                        <label className="block text-lg font-bold text-orange-200 mb-3">What do you need right now?</label>
                        <div className="grid grid-cols-2 gap-3">
                            {NEED_OPTIONS.map(need => (
                                <button key={need} type="button" onClick={() => toggleNeed(need)}
                                    className={`py-4 text-lg font-bold rounded-xl border-2 transition-all ${needs.includes(need) ? 'bg-gradient-to-r from-red-600 to-orange-600 border-red-600 text-white shadow-lg' : 'bg-fire-800 border-fire-600 text-orange-200 hover:border-orange-500'}`}>
                                    {need === 'FOOD' && '🍚 '}{need === 'WATER' && '💧 '}{need === 'MEDICINE' && '💊 '}{need === 'SHELTER' && '🏠 '}{need}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button type="submit" disabled={submitting}
                        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-fire-600 disabled:to-fire-600 text-white text-xl font-bold py-5 rounded-xl transition-all shadow-lg shadow-red-900/30 mt-4">
                        {submitting ? '⏳ Saving...' : '✓ Register Survivor'}
                    </button>
                </form>
            </div>
        </div>
    );
}
