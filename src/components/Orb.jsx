import React, { useRef, useEffect } from 'react';

export default function Orb({ state, onClick }) {
    const canvasRef = useRef(null);

    const getOrbSize = () => {
        const shortest = Math.min(window.innerWidth, window.innerHeight);
        return Math.max(84, Math.min(120, Math.floor(shortest * 0.12)));
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // Set canvas resolution
        const width = 200;
        const height = 200;
        canvas.width = width;
        canvas.height = height;

        // Particle settings
        const particles = [];
        const numParticles = 800; // Dense sphere
        const radius = 70;

        // Initialize particles on a sphere surface using golden spiral method
        for (let i = 0; i < numParticles; i++) {
            const phi = Math.acos(1 - 2 * (i + 0.5) / numParticles);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;

            const x = Math.cos(theta) * Math.sin(phi);
            const y = Math.cos(phi);
            const z = Math.sin(theta) * Math.sin(phi);

            particles.push({
                x, y, z,
                baseX: x, baseY: y, baseZ: z,
                randomOffsets: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 2 - 1 }
            });
        }

        let time = 0;
        let rotationY = 0;

        const render = () => {
            time += 0.05;

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            // State modifiers
            let rotationSpeed = 0.01;
            let waveSpeed = 1;
            let waveAmplitude = 0;
            let scaleModifier = 1;

            if (state === 'listening') {
                rotationSpeed = 0.03;
                waveSpeed = 3;
                waveAmplitude = 0.15;
                scaleModifier = 1.1;
            } else if (state === 'speaking') {
                rotationSpeed = 0.02;
                waveSpeed = 4;
                waveAmplitude = 0.2 + Math.sin(time * 2) * 0.05; // Pulsing
                scaleModifier = 1.05 + Math.sin(time * 4) * 0.05;
            } else {
                // idle
                rotationSpeed = 0.003;
                waveSpeed = 1;
                waveAmplitude = 0.05; // gentle, fluid waves
                scaleModifier = 1 + Math.sin(time * 0.5) * 0.02;
            }

            rotationY += rotationSpeed;

            const cosY = Math.cos(rotationY);
            const sinY = Math.sin(rotationY);

            const cx = width / 2;
            const cy = height / 2;

            // Draw particles
            for (let i = 0; i < numParticles; i++) {
                const p = particles[i];

                // Procedural 3D fluid wave
                const displacement = Math.sin(p.baseX * 5 + time * waveSpeed * 0.5) *
                    Math.cos(p.baseY * 5 - time * waveSpeed * 0.3) *
                    Math.sin(p.baseZ * 5 + time * waveSpeed * 0.4);

                const fluidScale = 1 + displacement * waveAmplitude;

                let px = p.baseX * fluidScale;
                let py = p.baseY * fluidScale;
                let pz = p.baseZ * fluidScale;

                // Rotate around Y axis
                const rx = px * cosY - pz * sinY;
                const rz = px * sinY + pz * cosY;
                const ry = py; // No X/Z rotation to keep poles top/bottom

                // 3D projection
                const perspective = 300 / (300 + rz * radius);
                const screenX = cx + rx * radius * scaleModifier * perspective;
                const screenY = cy + ry * radius * scaleModifier * perspective;

                // Determine color based on Y position to match image (blue top, red bottom)
                // ry goes from -1 (top) to 1 (bottom)
                let r, g, b;
                if (ry < 0) {
                    // Top half: Blueish to purple
                    const factor = -ry; // 0 to 1
                    r = Math.floor(100 + factor * 50);
                    g = Math.floor(150 + factor * 50);
                    b = 255;
                } else {
                    // Bottom half: Purple to orange/red
                    const factor = ry; // 0 to 1
                    r = 255;
                    g = Math.floor(100 - factor * 50);
                    b = Math.floor(150 - factor * 100);
                }

                // Fading for particles in the back
                const alpha = Math.min(1, Math.max(0.1, (rz + 1) / 2));
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

                // Draw point
                const ptSize = Math.max(0.5, 1.5 * perspective);
                ctx.beginPath();
                ctx.arc(screenX, screenY, ptSize, 0, Math.PI * 2);
                ctx.fill();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [state]);

    const containerStyle = {
        width: `${getOrbSize()}px`,
        height: `${getOrbSize()}px`,
    };

    return (
        <div
            onClick={onClick}
            className="orb-container"
            style={containerStyle}
            title="Tap to toggle AI state (Listening/Idle)"
        >
            <canvas
                ref={canvasRef}
                style={{
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    filter: state === 'listening' ? 'drop-shadow(0 0 20px rgba(10,132,255,0.6))' : 'none',
                }}
            />
        </div>
    );
}
