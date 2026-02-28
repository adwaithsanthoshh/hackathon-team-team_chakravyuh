import { Link } from 'react-router-dom';

const cards = [
    {
        title: 'Relief Camp Kiosk',
        desc: 'Register survivors arriving at your camp',
        path: '/kiosk',
        icon: '🏕️',
        gradient: 'from-red-700 to-red-900',
        hoverGradient: 'hover:from-red-600 hover:to-red-800',
    },
    {
        title: 'Coordinator Dashboard',
        desc: 'Monitor all camps, rescue priorities & resources',
        path: '/coordinator',
        icon: '📊',
        gradient: 'from-orange-700 to-red-900',
        hoverGradient: 'hover:from-orange-600 hover:to-red-800',
    },
    {
        title: 'Find My Family',
        desc: 'Search if your relative has been registered',
        path: '/family',
        icon: '🔍',
        gradient: 'from-amber-700 to-orange-900',
        hoverGradient: 'hover:from-amber-600 hover:to-orange-800',
    },
];

export default function Home() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                {cards.map((card, i) => (
                    <Link
                        key={card.path}
                        to={card.path}
                        className={`group block bg-gradient-to-br ${card.gradient} ${card.hoverGradient} text-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border border-white/5 animate-fade-in-up`}
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        <span className="text-4xl block mb-4">{card.icon}</span>
                        <h2 className="text-xl font-bold mb-2">{card.title}</h2>
                        <p className="text-sm opacity-70 leading-relaxed">{card.desc}</p>
                        <div className="mt-4 flex items-center text-sm font-medium opacity-50 group-hover:opacity-100 transition-opacity text-orange-300">
                            Open →
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
