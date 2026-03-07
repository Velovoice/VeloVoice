import React, { useState, useEffect } from 'react';
import { LayoutGrid, Map, Phone, Music, Car, Settings, Gauge, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useVehicleStore from '../store/useVehicleStore';
import { useCoPilot } from '../hooks/useCoPilot';

export default function NavigationBar() {
    const { activeView, setActiveView, aiPersona } = useVehicleStore();
    const { status } = useCoPilot(aiPersona);
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    const navItems = [
        { id: 'home', icon: LayoutGrid, label: 'Home' },
        { id: 'status', icon: Car, label: 'Vehicle' },
        { id: 'controls', icon: Gauge, label: 'Controls' },
        { id: 'phone', icon: Phone, label: 'Phone' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <aside className="nav-bar" data-testid="nav-bar">
            {/* Top: Time and Status */}
            <div className="nav-top-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: '600', color: '#fff' }}>{formatTime(time)}</span>
                <div className="nav-signal-bars" style={{ display: 'flex', gap: '2px', height: '12px', alignItems: 'flex-end', opacity: 0.6 }}>
                    <div style={{ width: '3px', height: '4px', background: '#fff', borderRadius: '1px' }}></div>
                    <div style={{ width: '3px', height: '6px', background: '#fff', borderRadius: '1px' }}></div>
                    <div style={{ width: '3px', height: '9px', background: '#fff', borderRadius: '1px' }}></div>
                    <div style={{ width: '3px', height: '12px', background: '#fff', borderRadius: '1px' }}></div>
                </div>
            </div>

            {/* Middle: Mode Switcher */}
            <div className="dock-items">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id)}
                            data-testid={`nav-${item.id}`}
                            className="nav-item-btn"
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '12px',
                                cursor: 'pointer',
                                position: 'relative',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="nav-glow"
                                    className="nav-glow-layer"
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: '12px'
                                    }}
                                />
                            )}
                            <Icon
                                size={28}
                                color={isActive ? 'var(--accent-color)' : '#8E8E93'}
                                strokeWidth={isActive ? 2.5 : 1.5}
                            />
                        </button>
                    );
                })}
            </div>

            {/* Bottom: VeloVoice Brand / Wake Indicator */}
            <div className="nav-brand-indicator" style={{ position: 'relative', marginBottom: '10px' }}>
                <AnimatePresence>
                    {status === 'listening' && (
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="nav-listening-ring"
                            style={{
                                position: 'absolute',
                                inset: -10,
                                borderRadius: '50%',
                                border: '2px solid var(--accent-color)',
                                boxShadow: '0 0 15px var(--accent-color)'
                            }}
                        />
                    )}
                </AnimatePresence>

                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--border-radius-sm)',
                    background: status === 'listening' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: status === 'listening' ? '0 0 20px var(--accent-color)' : 'none',
                    transition: 'all 0.3s ease'
                }}>
                    <Zap size={24} color={status === 'listening' ? '#fff' : '#8E8E93'} fill={status === 'listening' ? '#fff' : 'none'} />
                </div>
            </div>
        </aside>
    );
}
