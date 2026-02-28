import { useState, useRef, useEffect } from 'react';
import { aiChat } from '../utils/api';

export default function AIChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! I\'m the ReliefLink AI assistant. Ask me anything about the current relief operations — camp status, injured cases, trapped reports, resources, and more.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    const handleSend = async () => {
        const q = input.trim();
        if (!q || loading) return;

        setMessages(prev => [...prev, { role: 'user', text: q }]);
        setInput('');
        setLoading(true);

        try {
            const { answer } = await aiChat(q);
            setMessages(prev => [...prev, { role: 'assistant', text: answer }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${err.message}`, isError: true }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const suggestedQuestions = [
        'How many trapped cases are pending?',
        'Which camp needs the most help?',
        'Show resource summary',
    ];

    return (
        <>
            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-neon-cyan hover:bg-neon-cyan/80 text-hud-black flex items-center justify-center shadow-lg shadow-neon-cyan/20 transition-all hover:scale-110 active:scale-95"
                style={{ borderRadius: '14px' }}
                title="AI Assistant"
            >
                {isOpen ? (
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <span className="text-2xl">🤖</span>
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[520px] border border-hud-500 bg-hud-900 shadow-2xl shadow-black/50 flex flex-col animate-fade-in-up"
                    style={{ borderRadius: '12px', overflow: 'hidden' }}>

                    {/* Header */}
                    <div className="bg-hud-800 border-b border-hud-500 px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 bg-neon-cyan/20 border border-neon-cyan/40 flex items-center justify-center" style={{ borderRadius: '8px' }}>
                            <span className="text-sm">🤖</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-mono text-xs font-bold text-hud-white tracking-wider">RELIEFLINK_AI</h3>
                            <p className="font-mono text-[9px] text-neon-cyan tracking-wider">ONLINE • GROQ POWERED</p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-hud-400 hover:text-hud-white transition-colors">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto hud-scrollbar p-4 space-y-3" style={{ maxHeight: '340px', minHeight: '200px' }}>
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-3 py-2.5 font-mono text-[11px] leading-relaxed ${msg.role === 'user'
                                        ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-hud-white'
                                        : msg.isError
                                            ? 'bg-alert-red/10 border border-alert-red/30 text-alert-red'
                                            : 'bg-hud-800 border border-hud-500 text-hud-200'
                                    }`} style={{ borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-hud-800 border border-hud-500 px-4 py-3 font-mono text-[11px] text-hud-400" style={{ borderRadius: '8px' }}>
                                    <span className="animate-pulse">● ● ●</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggested questions (only show when few messages) */}
                    {messages.length <= 2 && !loading && (
                        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                            {suggestedQuestions.map((q, i) => (
                                <button key={i} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                                    className="px-2.5 py-1 font-mono text-[9px] text-neon-cyan/70 border border-hud-500 hover:border-neon-cyan/40 hover:text-neon-cyan transition-colors tracking-wider"
                                    style={{ borderRadius: '6px' }}>
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="border-t border-hud-500 p-3 flex gap-2 items-center bg-hud-800">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about relief operations..."
                            className="flex-1 px-3 py-2.5 hud-input text-[11px] font-mono"
                            disabled={loading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            className="shrink-0 w-9 h-9 bg-neon-cyan hover:bg-neon-cyan/80 disabled:bg-hud-600 disabled:text-hud-400 text-hud-black flex items-center justify-center transition-colors"
                            style={{ borderRadius: '8px' }}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
