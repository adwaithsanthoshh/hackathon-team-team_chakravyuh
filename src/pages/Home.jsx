import { Link } from 'react-router-dom';

const cards = [
    {
        title: 'Relief Camp Kiosk',
        desc: 'Register survivors arriving at your camp',
        path: '/kiosk',
        icon: '🏕️',
        code: 'SYS.01',
    },
    {
        title: 'Coordinator Dashboard',
        desc: 'Monitor all camps, rescue priorities & resources',
        path: '/coordinator',
        icon: '📊',
        code: 'SYS.02',
    },
    {
        title: 'Find My Family',
        desc: 'Search if your relative has been registered',
        path: '/family',
        icon: '🔍',
        code: 'SYS.03',
    },
];

export default function Home() {
    return (
        <div className="min-h-screen bg-hud-black hud-grid relative overflow-hidden">
            {/* Scan line effect */}
            <div className="scan-line absolute inset-0 pointer-events-none" />

            {/* Top status bar */}
            <div className="border-b border-hud-500 px-6 py-3 flex items-center justify-between">
                <span className="font-mono text-xs text-hud-300 tracking-[0.15em] uppercase">
                    ReliefLink
                </span>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-status-green rounded-full animate-status-pulse" />
                        <span className="font-mono text-xs text-status-green tracking-wider">
                            [CONNECTED]
                        </span>
                    </div>
                    <Link to="/admin" className="px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase border border-hud-500 hover:border-neon-cyan text-hud-400 hover:text-neon-cyan transition-colors">
                        🔒 ADMIN
                    </Link>
                </div>
            </div>

            {/* HUD ambient metadata */}
            <div className="absolute top-20 left-6 font-mono text-[10px] text-hud-400 opacity-40 leading-relaxed hidden md:block animate-glitch">
                <div>LAT: 11.5886°N</div>
                <div>LNG: 76.0825°E</div>
                <div className="mt-2">WAYANAD_DISTRICT</div>
            </div>
            <div className="absolute top-20 right-6 font-mono text-[10px] text-hud-400 opacity-40 text-right leading-relaxed hidden md:block">
                <div>[SYSTEM ONLINE]</div>
                <div>[5 CAMPS ACTIVE]</div>
                <div className="mt-2 text-neon-cyan opacity-60">PROTOCOL: ACTIVE</div>
            </div>

            {/* Crosshair */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-1 opacity-30">
                <div className="w-px h-6 bg-hud-white" />
                <div className="w-3 h-3 border border-hud-white rounded-full" />
                <div className="w-px h-6 bg-hud-white" />
            </div>

            {/* Main content */}
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-52px)] px-4 sm:px-8">
                {/* Title block */}
                <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
                    <div className="font-mono text-[10px] text-hud-400 tracking-[0.3em] uppercase mb-4">
                        // DISASTER RESPONSE OPERATING SYSTEM
                    </div>
                    <h1 className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-hud-white uppercase tracking-tight leading-none">
                        RELIEF
                        <span className="text-neon-cyan">LINK</span>
                    </h1>
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <span className="w-8 h-px bg-hud-500" />
                        <span className="font-mono text-[10px] text-hud-400 tracking-[0.2em]">
                            WAYANAD FLOOD RESPONSE v2.0
                        </span>
                        <span className="w-8 h-px bg-hud-500" />
                    </div>
                </div>

                {/* Navigation cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 w-full max-w-5xl">
                    {cards.map((card, i) => (
                        <Link
                            key={card.path}
                            to={card.path}
                            className="group block folder-tab border border-hud-500 bg-hud-900/80 hover:border-neon-cyan hover:bg-hud-800 transition-all duration-300 animate-fade-in-up"
                            style={{ animationDelay: `${i * 100 + 200}ms` }}
                        >
                            <div className="p-6 sm:p-8">
                                {/* System code */}
                                <div className="font-mono text-[10px] text-hud-400 tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-neon-cyan group-hover:animate-status-pulse" />
                                    {card.code}
                                </div>

                                {/* Icon */}
                                <span className="text-3xl sm:text-4xl block mb-4">{card.icon}</span>

                                {/* Title */}
                                <h2 className="font-display text-xl sm:text-2xl font-bold text-hud-white uppercase tracking-wide mb-2 group-hover:text-neon-cyan transition-colors">
                                    {card.title}
                                </h2>

                                {/* Description */}
                                <p className="font-mono text-xs text-hud-300 leading-relaxed mb-6">
                                    {card.desc}
                                </p>

                                {/* Action */}
                                <div className="flex items-center gap-2 font-mono text-xs text-hud-400 group-hover:text-neon-cyan transition-colors uppercase tracking-wider">
                                    <span>Open</span>
                                    <span className="transition-transform group-hover:translate-x-1">→</span>
                                </div>
                            </div>

                            {/* Bottom border accent */}
                            <div className="h-px bg-hud-500 group-hover:bg-neon-cyan transition-colors" />
                        </Link>
                    ))}
                </div>
            </div>

            {/* Bottom HUD */}
            <div className="absolute bottom-6 right-6 font-mono text-[10px] text-hud-400 opacity-40 hidden md:block">
                SCROLL ↓
            </div>
            <div className="absolute bottom-6 left-6 font-mono text-[10px] text-hud-400 opacity-30 hidden md:block">
                PAGE 001
            </div>
        </div>
    );
}
