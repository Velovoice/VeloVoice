/**
 * 🚗 VeloVoice Setup Wizard
 * First-launch experience: lets the user select their car brand and model.
 * Persists selection to localStorage — shown only once per device.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VEHICLE_PROFILES from '../data/vehicleProfiles';
import useVehicleStore from '../store/useVehicleStore';
import { bluetoothManager } from '../utils/BluetoothManager';

const BRAND_KEYS = Object.keys(VEHICLE_PROFILES);

export default function SetupWizard() {
    const [step, setStep] = useState(1); // 1 = select brand, 2 = select model, 3 = confirm
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedModel, setSelectedModel] = useState(null);
    const [obdStatus, setObdStatus] = useState('idle'); // idle, connecting, connected, failed
    const {
        setVehicleProfile,
        completeSetupLimitedMode,
        setConnectionState,
        setConnectionError,
        setPreferredDevice,
        setAutoReconnect
    } = useVehicleStore();

    const profile = selectedBrand ? VEHICLE_PROFILES[selectedBrand] : null;
    const modelKeys = profile ? Object.keys(profile.models) : [];
    const modelData = selectedModel && profile ? profile.models[selectedModel] : null;

    const handleBrandSelect = (brandKey) => {
        setSelectedBrand(brandKey);
        setSelectedModel(null);
        setStep(2);
    };

    const handleModelSelect = (modelKey) => {
        setSelectedModel(modelKey);
        setStep(3);
    };

    const handleConfirm = () => {
        setVehicleProfile(selectedBrand, selectedModel);

        if (obdStatus === 'connected') {
            setConnectionState('connected');
        } else {
            setConnectionState('disconnected');
        }
    };

    const handleStartLimited = async () => {
        if (obdStatus === 'connected') {
            await bluetoothManager.disconnect();
        }

        setObdStatus('idle');
        setConnectionState('disconnected');
        setVehicleProfile(selectedBrand, selectedModel);
    };

    const handleSkipSetup = async () => {
        if (obdStatus === 'connected') {
            await bluetoothManager.disconnect();
        }

        setObdStatus('idle');
        setConnectionState('disconnected');
        completeSetupLimitedMode();
    };

    const handleTestOBDConnection = async () => {
        if (obdStatus === 'connected') {
            await bluetoothManager.disconnect();
            setObdStatus('idle');
            setConnectionState('disconnected');
            return;
        }

        setObdStatus('connecting');
        setConnectionState('pairing');

        try {
            const success = await bluetoothManager.connect();
            if (success) {
                setObdStatus('connected');
                setConnectionState('connected');
                if (bluetoothManager.device?.id) {
                    setPreferredDevice(bluetoothManager.device.id);
                }
            }
        } catch (error) {
            setObdStatus('failed');
            setConnectionError(error?.message || 'Unable to connect to OBD adapter');
        }
    };

    const TypeBadge = ({ type }) => {
        const colors = { EV: '#34C759', Hybrid: '#FF9500', ICE: '#636366' };
        return (
            <span style={{
                background: colors[type] || '#636366',
                color: '#fff',
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                letterSpacing: '1px'
            }}>
                {type}
            </span>
        );
    };

    return (
        <div className="setup-overlay" style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse at 30% 50%, #0a0a20 0%, #000 70%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            overflow: 'hidden'
        }}>
            {/* Background grid */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'linear-gradient(rgba(10,132,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(10,132,255,0.04) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                zIndex: 'var(--z-layer-0)'
            }} />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ textAlign: 'center', marginBottom: '32px', zIndex: 'var(--z-layer-1)' }}
            >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏎️</div>
                <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0 }}>VeloVoice Setup</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '15px' }}>
                    {step === 1 && 'Select your car brand to get started'}
                    {step === 2 && `Select your ${profile?.brand} model`}
                    {step === 3 && 'Confirm your vehicle profile and test connection (optional)'}
                </p>

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
                    {[1, 2, 3].map(s => (
                        <motion.div
                            key={s}
                            animate={{
                                width: s === step ? 24 : 8,
                                background: s <= step ? 'var(--accent-color)' : 'var(--surface-secondary)'
                            }}
                            transition={{ duration: 0.3 }}
                            style={{ height: '8px', borderRadius: '4px' }}
                        />
                    ))}
                </div>
            </motion.div>

            {/* Content Panel */}
            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            maxWidth: '720px',
                            width: '100%',
                            zIndex: 'var(--z-layer-1)'
                        }}
                    >
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '12px',
                            width: '100%'
                        }}>
                            {BRAND_KEYS.map(key => {
                                const b = VEHICLE_PROFILES[key];
                                return (
                                    <motion.button
                                        key={key}
                                        onClick={() => handleBrandSelect(key)}
                                        whileHover={{ scale: 1.04, y: -2 }}
                                        whileTap={{ scale: 0.97 }}
                                        style={{
                                            background: 'var(--surface-primary)',
                                            border: `1px solid rgba(255,255,255,0.08)`,
                                            borderRadius: 'var(--border-radius-lg)',
                                            padding: '24px 16px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '10px',
                                            color: '#fff',
                                            transition: 'border-color 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = b.color}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                                    >
                                        <span style={{ fontSize: '28px' }}>{b.logo}</span>
                                        <span style={{ fontSize: '13px', fontWeight: '600' }}>{b.brand}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            {Object.keys(b.models).length} model{Object.keys(b.models).length > 1 ? 's' : ''}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>

                        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center' }}>
                            <button
                                onClick={handleSkipSetup}
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.16)',
                                    borderRadius: '999px',
                                    padding: '10px 16px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                }}
                            >
                                Skip Setup and Continue in Limited Mode
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '400px', zIndex: 'var(--z-layer-1)' }}
                    >
                        {modelKeys.map(key => {
                            const m = profile.models[key];
                            return (
                                <motion.button
                                    key={key}
                                    onClick={() => handleModelSelect(key)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        background: 'var(--surface-primary)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: 'var(--border-radius-md)',
                                        padding: '20px 24px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        color: '#fff',
                                        gap: '16px'
                                    }}
                                >
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontWeight: '700', fontSize: '17px', marginBottom: '4px' }}>
                                            {profile.brand} {m.name}
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            {m.year} · {m.seats} seats · {m.climateZones} climate zone{m.climateZones > 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    <TypeBadge type={m.type} />
                                </motion.button>
                            );
                        })}

                        <button
                            onClick={() => setStep(1)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', marginTop: '8px' }}
                        >
                            ← Back to brands
                        </button>
                    </motion.div>
                )}

                {step === 3 && modelData && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.35 }}
                        style={{
                            background: 'var(--surface-primary)',
                            borderRadius: 'var(--border-radius-xl)',
                            padding: '32px',
                            maxWidth: '440px',
                            width: '100%',
                            zIndex: 'var(--z-layer-1)',
                            border: `1px solid ${profile.color}44`
                        }}
                    >
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{ fontSize: '40px', marginBottom: '8px' }}>{profile.logo}</div>
                            <div style={{ fontSize: '22px', fontWeight: '800' }}>{profile.brand} {modelData.name}</div>
                            <div style={{ marginTop: '8px' }}><TypeBadge type={modelData.type} /></div>
                        </div>

                        {/* Profile details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                            {[
                                ['🪑 Seats', modelData.seats],
                                ['🌡️ Climate Zones', modelData.climateZones],
                                ['📡 OBD Protocol', modelData.obdProtocol],
                                ['📟 Active PIDs', modelData.supportedPIDs.length],
                            ].map(([label, value]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{label}</span>
                                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{value}</span>
                                </div>
                            ))}

                            {/* Supported Features */}
                            <div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Features Enabled</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {Object.entries(modelData.features)
                                        .filter(([, v]) => v === true)
                                        .map(([key]) => (
                                            <span key={key} style={{
                                                background: 'var(--surface-secondary)',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                textTransform: 'capitalize'
                                            }}>
                                                {key.replace(/([A-Z])/g, ' $1')}
                                            </span>
                                        ))}
                                </div>
                            </div>
                        </div>

                        {modelData.note && (
                            <div style={{
                                background: 'rgba(255, 149, 0, 0.1)',
                                border: '1px solid rgba(255,149,0,0.3)',
                                borderRadius: 'var(--border-radius-sm)',
                                padding: '10px 14px',
                                fontSize: '12px',
                                color: '#FF9500',
                                marginBottom: '20px'
                            }}>
                                ⚠️ {modelData.note}
                            </div>
                        )}

                        <div style={{
                            background: 'rgba(10,132,255,0.08)',
                            border: '1px solid rgba(10,132,255,0.2)',
                            borderRadius: 'var(--border-radius-md)',
                            padding: '12px 14px',
                            marginBottom: '12px'
                        }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                                Optional: Test OBD-II Connection
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                You can start in Limited Mode now and connect adapter later from Settings.
                            </div>
                            <button
                                onClick={handleTestOBDConnection}
                                style={{
                                    width: '100%',
                                    background: obdStatus === 'connected' ? 'rgba(52,199,89,0.2)' : 'var(--surface-secondary)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '10px 12px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                }}
                            >
                                {obdStatus === 'connecting' && 'Connecting to adapter...'}
                                {obdStatus === 'connected' && 'Connected (Tap to disconnect)'}
                                {obdStatus === 'failed' && 'Retry OBD connection'}
                                {obdStatus === 'idle' && 'Test OBD connection'}
                            </button>

                            {obdStatus === 'failed' && (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#FF9500' }}>
                                    Check: adapter powered on, phone/laptop Bluetooth enabled, and adapter is discoverable.
                                </div>
                            )}

                            <label style={{
                                marginTop: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    defaultChecked
                                    onChange={(e) => setAutoReconnect(e.target.checked)}
                                    style={{ accentColor: 'var(--accent-color)' }}
                                />
                                Auto reconnect on next launch
                            </label>
                        </div>

                        <div style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 'var(--border-radius-sm)',
                            padding: '10px 12px',
                            marginBottom: '18px',
                            fontSize: '12px',
                            color: 'var(--text-secondary)'
                        }}>
                            If setup feels complex, tap <strong>Start in Limited Mode</strong>. Voice, navigation, and media remain fully usable.
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setStep(2)}
                                style={{ flex: 1, background: 'var(--surface-secondary)', border: 'none', borderRadius: 'var(--border-radius-md)', padding: '14px', color: '#fff', cursor: 'pointer', fontSize: '15px' }}
                            >
                                ← Change
                            </button>
                            <motion.button
                                onClick={handleStartLimited}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                style={{ flex: 1.6, background: 'var(--accent-color)', border: 'none', borderRadius: 'var(--border-radius-md)', padding: '14px', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}
                            >
                                Start in Limited Mode
                            </motion.button>
                            <motion.button
                                onClick={handleConfirm}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                style={{ flex: 1.6, background: '#34C759', border: 'none', borderRadius: 'var(--border-radius-md)', padding: '14px', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}
                            >
                                Start VeloVoice →
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
