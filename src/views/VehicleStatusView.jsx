import React from 'react';
import { Gauge, Battery, Thermometer, Zap, AlertTriangle, Fuel, Droplets, Wind, BarChart3 } from 'lucide-react';
import useVehicleStore from '../store/useVehicleStore';
import VEHICLE_PROFILES from '../data/vehicleProfiles';

// ── Spec cards shown per fuel type ──────────────────────────────────────────
const SPEC_MAP = {
    EV: [
        { key: 'battery', label: 'HV Battery', icon: Battery, color: '#34C759', unit: '%', defaultVal: 84 },
        { key: 'motorTemp', label: 'Motor Temp', icon: Thermometer, color: '#FF9500', unit: '°C', defaultVal: 42 },
        { key: 'efficiency', label: 'Efficiency', icon: Zap, color: '#0A84FF', unit: 'Wh/km', defaultVal: 164 },
        { key: 'range', label: 'Est. Range', icon: Gauge, color: '#5856D6', unit: 'km', defaultVal: 280 },
    ],
    ICE: [
        { key: 'fuel', label: 'Fuel Level', icon: Fuel, color: '#FF9500', unit: '%', defaultVal: 72 },
        { key: 'coolant', label: 'Coolant Temp', icon: Thermometer, color: '#FF3B30', unit: '°C', defaultVal: 88 },
        { key: 'rpm', label: 'Engine RPM', icon: Gauge, color: '#0A84FF', unit: 'rpm', defaultVal: 1200 },
        { key: 'engineLoad', label: 'Engine Load', icon: BarChart3, color: '#5856D6', unit: '%', defaultVal: 34 },
    ],
    Hybrid: [
        { key: 'battery', label: 'HV Battery', icon: Battery, color: '#34C759', unit: '%', defaultVal: 60 },
        { key: 'fuel', label: 'Fuel Level', icon: Fuel, color: '#FF9500', unit: '%', defaultVal: 72 },
        { key: 'coolant', label: 'Coolant Temp', icon: Thermometer, color: '#FF3B30', unit: '°C', defaultVal: 85 },
        { key: 'efficiency', label: 'Efficiency', icon: Zap, color: '#0A84FF', unit: 'km/L', defaultVal: 22 },
    ],
    Diesel: [
        { key: 'fuel', label: 'Diesel Level', icon: Fuel, color: '#FF9500', unit: '%', defaultVal: 65 },
        { key: 'coolant', label: 'Coolant Temp', icon: Thermometer, color: '#FF3B30', unit: '°C', defaultVal: 90 },
        { key: 'rpm', label: 'Engine RPM', icon: Gauge, color: '#0A84FF', unit: 'rpm', defaultVal: 900 },
        { key: 'dpf', label: 'DPF Soot Level', icon: Wind, color: '#636366', unit: '%', defaultVal: 18 },
    ],
};

// Map values from store telemetry where available, else use defaults
function resolveValue(key, telemetry) {
    const map = {
        battery: telemetry.battery,
        motorTemp: telemetry.motorTemp,
        efficiency: '164',
        range: Math.round((telemetry.battery / 100) * 400),
        fuel: telemetry.battery, // reuse battery as fuel proxy until real OBD
        coolant: 88,
        rpm: telemetry.rpm,
        engineLoad: 34,
        dpf: 18,
    };
    return map[key] ?? '—';
}

export default function VehicleStatusView() {
    const { telemetry, vehicleProfile, connection, telemetryMeta, isLimitedMode } = useVehicleStore();

    // Resolve the car type from the profile, fallback to EV
    const modelData = vehicleProfile?.data;
    const carType = modelData?.type || 'EV';
    const specs = SPEC_MAP[carType] || SPEC_MAP['EV'];

    // Brand info for the header
    const brandKey = vehicleProfile?.brand;
    const brandData = brandKey ? VEHICLE_PROFILES[brandKey] : null;

    // Tire data from telemetry
    const tires = [
        { pos: 'FL', psi: telemetry.tirePressure?.fl ?? 32, status: (telemetry.tirePressure?.fl ?? 32) < 31 ? 'low' : 'ok' },
        { pos: 'FR', psi: telemetry.tirePressure?.fr ?? 32, status: (telemetry.tirePressure?.fr ?? 32) < 31 ? 'low' : 'ok' },
        { pos: 'RL', psi: telemetry.tirePressure?.rl ?? 30, status: (telemetry.tirePressure?.rl ?? 30) < 31 ? 'low' : 'ok' },
        { pos: 'RR', psi: telemetry.tirePressure?.rr ?? 32, status: (telemetry.tirePressure?.rr ?? 32) < 31 ? 'low' : 'ok' },
    ];

    const hasAlert = tires.some(t => t.status === 'low');

    // Type badge color
    const typeBadgeColors = { EV: '#34C759', Hybrid: '#FF9500', ICE: '#636366', Diesel: '#8E6A00' };
    const typeColor = typeBadgeColors[carType] || '#636366';

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                    <h2 style={{ fontSize: '28px', margin: 0, fontWeight: '700' }}>Vehicle Health</h2>
                    {modelData && (
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {brandData?.logo} {brandData?.brand} {modelData.name}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {(connection.state === 'connected' || connection.state === 'degraded') && (
                        <span className="status-chip status-chip-connected">Connected</span>
                    )}
                    {isLimitedMode() && <span className="status-chip status-chip-limited">Limited Mode</span>}
                    {telemetryMeta.isTelemetryStale && <span className="status-chip status-chip-stale">Telemetry Stale</span>}
                    {telemetryMeta.telemetrySource === 'demo' && <span className="status-chip status-chip-demo">Demo Data</span>}
                    {/* Car type badge */}
                    <span style={{
                        background: `${typeColor}22`,
                        color: typeColor,
                        padding: '4px 12px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        letterSpacing: '1px'
                    }}>
                        {carType}
                    </span>
                    {/* System status */}
                    <div style={{
                        background: hasAlert ? '#FF3B3022' : '#34C75922',
                        color: hasAlert ? '#FF3B30' : '#34C759',
                        padding: '4px 12px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '600'
                    }}>
                        {hasAlert ? '⚠ Check Tires' : '✓ Systems OK'}
                    </div>
                </div>
            </div>

            <div className="responsive-status-grid">

                {/* Dynamic Specs — changes by car type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                        {carType} Telemetry
                    </div>
                    {specs.map(spec => {
                        const value = resolveValue(spec.key, telemetry);
                        return (
                            <div
                                key={spec.key}
                                style={{
                                    background: 'var(--surface-primary)',
                                    borderRadius: 'var(--border-radius-md)',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    border: '1px solid rgba(255,255,255,0.04)'
                                }}
                            >
                                <div style={{ background: `${spec.color}18`, padding: '10px', borderRadius: '10px', flexShrink: 0 }}>
                                    <spec.icon color={spec.color} size={20} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{spec.label}</div>
                                    <div style={{ fontSize: '19px', fontWeight: '700' }}>
                                        {value}
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                                            {spec.unit}
                                        </span>
                                    </div>
                                </div>

                                {/* Mini progress bar for percentage values */}
                                {spec.unit === '%' && typeof value === 'number' && (
                                    <div style={{ width: '50px', height: '4px', background: 'var(--surface-secondary)', borderRadius: '2px', flexShrink: 0 }}>
                                        <div style={{
                                            width: `${Math.min(value, 100)}%`,
                                            height: '100%',
                                            background: value < 20 ? '#FF3B30' : spec.color,
                                            borderRadius: '2px',
                                            transition: 'width 0.5s ease'
                                        }} />
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* OBD PIDs Info */}
                    {modelData?.supportedPIDs && (
                        <div style={{
                            marginTop: '8px',
                            padding: '12px 16px',
                            background: 'rgba(10, 132, 255, 0.06)',
                            borderRadius: 'var(--border-radius-sm)',
                            border: '1px solid rgba(10, 132, 255, 0.15)',
                            fontSize: '12px',
                            color: 'var(--text-secondary)'
                        }}>
                            📡 {modelData.supportedPIDs.length} OBD-II PIDs active · {modelData.obdProtocol}
                        </div>
                    )}
                </div>

                {/* Tire Pressure Visualization */}
                <div style={{
                    background: 'var(--surface-primary)',
                    borderRadius: 'var(--border-radius-lg)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Tire Pressure (PSI)
                    </div>

                    {/* Car Body Silhouette */}
                    <div style={{
                        width: '100px',
                        height: '200px',
                        border: '2px solid rgba(255,255,255,0.12)',
                        borderRadius: '28px',
                        position: 'relative',
                        background: 'rgba(255,255,255,0.03)'
                    }}>
                        {tires.map((tire, i) => (
                            <div key={tire.pos} style={{
                                position: 'absolute',
                                left: i % 2 === 0 ? '-52px' : 'auto',
                                right: i % 2 !== 0 ? '-52px' : 'auto',
                                top: i < 2 ? '24px' : 'auto',
                                bottom: i >= 2 ? '24px' : 'auto',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '50px',
                                    background: tire.status === 'low' ? 'rgba(255,59,48,0.2)' : 'rgba(52,199,89,0.1)',
                                    border: `2px solid ${tire.status === 'low' ? '#FF3B30' : 'rgba(52,199,89,0.4)'}`,
                                    borderRadius: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '2px'
                                }}>
                                    <div style={{ fontSize: '15px', fontWeight: '700', color: tire.status === 'low' ? '#FF3B30' : '#fff' }}>
                                        {tire.psi}
                                    </div>
                                    <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{tire.pos}</div>
                                    {tire.status === 'low' && <AlertTriangle size={10} color="#FF3B30" />}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Seat count for multi-zone context */}
                    {modelData && (
                        <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            {modelData.seats} seats · {modelData.climateZones} climate zone{modelData.climateZones > 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
