import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';

// --- Particle Engine ---
function ParticleCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = Array.from({ length: 120 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.6 + 0.2
        }));

        let animId;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(10, 132, 255, ${p.opacity})`;
                ctx.fill();
            });

            // Draw connection lines
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(10, 132, 255, ${0.12 * (1 - dist / 100)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(animId);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="startup-layer-0"
            style={{ position: 'absolute', inset: 0, opacity: 0.7 }}
        />
    );
}

// --- System Check Steps ---
const BOOT_STEPS = [
    { id: 'gps', label: 'GPS Signal', delay: 600 },
    { id: 'obd', label: 'OBD-II Telemetry', delay: 1100 },
    { id: 'map', label: 'Maps & Routing', delay: 1600 },
    { id: 'brain', label: 'AI Brain Online', delay: 2100 },
    { id: 'bt', label: 'Bluetooth Ready', delay: 2600 },
];

export default function StartupView({ onFinish }) {
    const [checkedIds, setCheckedIds] = useState([]);
    const [showLogo, setShowLogo] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Logo entrance
        setTimeout(() => setShowLogo(true), 200);

        // Sequential check reveals
        BOOT_STEPS.forEach(step => {
            setTimeout(() => {
                setCheckedIds(prev => [...prev, step.id]);
            }, step.delay);
        });

        // Speed-blur exit
        setTimeout(() => setIsExiting(true), 3300);
        setTimeout(() => onFinish(), 3800);
    }, [onFinish]);

    return (
        <motion.div
            className="startup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, filter: isExiting ? 'blur(20px)' : 'blur(0px)', scale: isExiting ? 1.08 : 1 }}
            transition={{ duration: isExiting ? 0.5 : 0.4, ease: 'easeInOut' }}
            style={{
                width: '100vw',
                height: '100vh',
                background: 'radial-gradient(ellipse at center, #0a0a0f 0%, #000 70%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'fixed',
                inset: 0,
                overflow: 'hidden'
            }}
        >
            <ParticleCanvas />

            {/* Radial glow behind logo */}
            <motion.div
                className="startup-layer-1"
                animate={{ opacity: showLogo ? 1 : 0, scale: showLogo ? 1 : 0.5 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                style={{
                    position: 'absolute',
                    width: '400px',
                    height: '400px',
                    background: 'radial-gradient(circle, rgba(10,132,255,0.15) 0%, transparent 70%)',
                    borderRadius: '50%'
                }}
            />

            {/* Logo */}
            <AnimatePresence>
                {showLogo && (
                    <motion.div
                        initial={{ scale: 0.6, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="startup-layer-2"
                        style={{ position: 'relative', marginBottom: '48px' }}
                    >
                        <img
                            src={logo}
                            alt="VeloVoice"
                            onError={(e) => {
                                // Fallback text logo if image missing
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }}
                            style={{
                                width: '200px',
                                filter: 'drop-shadow(0 0 32px rgba(10, 132, 255, 0.8))'
                            }}
                        />
                        {/* Text fallback */}
                        <div style={{
                            display: 'none',
                            fontSize: '48px',
                            fontWeight: '800',
                            letterSpacing: '-1px',
                            background: 'linear-gradient(135deg, #fff 40%, var(--accent-color))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            VeloVoice
                        </div>

                        {/* Scanning line */}
                        <motion.div
                            animate={{ top: ['0%', '100%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            style={{
                                position: 'absolute',
                                left: '-10px',
                                right: '-10px',
                                height: '1px',
                                background: 'linear-gradient(90deg, transparent, var(--accent-color), transparent)',
                                boxShadow: '0 0 12px var(--accent-color)',
                                opacity: 0.7
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* System Check Ticker */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 'var(--z-layer-2)',
                minWidth: '240px'
            }}>
                {BOOT_STEPS.map((step) => {
                    const isChecked = checkedIds.includes(step.id);
                    return (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: isChecked ? 1 : 0, x: isChecked ? 0 : -16 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                            }}
                        >
                            {/* Dot / Checkmark */}
                            <motion.div
                                animate={{
                                    background: isChecked ? '#34C759' : 'var(--accent-color)',
                                    scale: isChecked ? [1, 1.4, 1] : 1
                                }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    boxShadow: isChecked ? '0 0 8px #34C759' : '0 0 8px var(--accent-color)',
                                    flexShrink: 0
                                }}
                            />
                            <span style={{
                                fontSize: '13px',
                                fontFamily: 'monospace',
                                letterSpacing: '1.5px',
                                color: isChecked ? '#fff' : '#555',
                                textTransform: 'uppercase',
                                transition: 'color 0.3s ease'
                            }}>
                                {step.label}
                            </span>
                            {isChecked && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 300 }}
                                    style={{ color: '#34C759', fontSize: '13px', fontFamily: 'monospace' }}
                                >
                                    ✓
                                </motion.span>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Bottom version tag */}
            <motion.div
                className="startup-layer-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: showLogo ? 0.35 : 0 }}
                transition={{ delay: 0.8, duration: 1 }}
                style={{
                    position: 'absolute',
                    bottom: '32px',
                    fontSize: '11px',
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    color: '#fff',
                    fontFamily: 'monospace'
                }}
            >
                VeloVoice v1.0 · AI Co-Pilot
            </motion.div>
        </motion.div>
    );
}
