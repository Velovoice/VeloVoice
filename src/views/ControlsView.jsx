import React from 'react';
import { Power, Wind, Unlock, Sun, Thermometer, Battery, Snowflake, Zap } from 'lucide-react';
import useVehicleStore from '../store/useVehicleStore';

export default function ControlsView() {
    const {
        carFeatures,
        updateCarFeature,
        vehicleProfile,
        capabilities,
        connection,
        telemetryMeta,
        canShowControl,
        isLimitedMode
    } = useVehicleStore();
    const profileFeatures = vehicleProfile?.data?.features || carFeatures;
    const controlsEnabled = capabilities.supportsCarControls;

    const toggleControl = (key) => {
        updateCarFeature(key, !carFeatures[key]);
    };

    // All possible controls with their feature flags
    const ALL_CONTROLS = [
        { key: 'engine', icon: Power, label: 'Engine', activeColor: '#34C759', featureFlag: 'engine' },
        { key: 'doorsLocked', icon: Unlock, label: 'Doors', activeColor: '#FF3B30', featureFlag: 'doorsLocked', inverted: true },
        { key: 'ac', icon: Wind, label: 'Climate Control', activeColor: '#007AFF', featureFlag: 'ac' },
        { key: 'sunroof', icon: Sun, label: 'Sunroof', activeColor: '#5856D6', featureFlag: 'sunroof' },
        { key: 'seatHeating', icon: Zap, label: 'Seat Heating', activeColor: '#FF9500', featureFlag: 'seatHeating' },
        { key: 'ventilationSeats', icon: Snowflake, label: 'Seat Cooling', activeColor: '#0A84FF', featureFlag: 'ventilationSeats' },
    ];

    // Only show controls that this vehicle supports and capability allows
    const visibleControls = ALL_CONTROLS.filter(c => profileFeatures[c.featureFlag] !== undefined && canShowControl(c.key));
    const ControlButton = ({ icon: Icon, label, isActive, onClick, activeColor = 'var(--accent-color)', disabled = false, testId }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            data-testid={testId}
            title={disabled ? 'Unavailable on current vehicle setup' : ''}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '24px',
                aspectRatio: '1', /* Forces the button to be a square grid item */
                borderRadius: 'var(--border-radius-md)',
                border: 'none',
                background: disabled ? 'rgba(255,255,255,0.05)' : (isActive ? activeColor : 'var(--surface-primary)'),
                color: isActive ? '#fff' : '#fff',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.65 : 1,
                transition: 'transform 0.1s active',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
            <Icon size={32} color={isActive ? '#fff' : '#999'} />
            <span style={{ fontSize: '16px', fontWeight: '600' }}>{label}</span>
            <span style={{ fontSize: '13px', opacity: isActive ? 1 : 0.5 }}>
                {disabled ? 'Unavailable' : (isActive ? 'On' : 'Off')}
            </span>
        </button>
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="status-chip-row">
                {(connection.state === 'connected' || connection.state === 'degraded') && (
                    <span className="status-chip status-chip-connected">Connected</span>
                )}
                {isLimitedMode() && <span className="status-chip status-chip-limited">Limited Mode</span>}
                {telemetryMeta.isTelemetryStale && <span className="status-chip status-chip-stale">Telemetry Stale</span>}
            </div>

            {/* Top Status Banner - CarPlay Style Cards */}
            <div className="auto-fit-grid">
                <div style={{
                    background: 'var(--surface-primary)',
                    padding: 'var(--spacing-md)',
                    borderRadius: 'var(--border-radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: 'var(--border-radius-sm)',
                        background: 'var(--surface-secondary)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <Battery size={24} color={carFeatures.engine ? '#34C759' : '#8E8E93'} />
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', color: '#8E8E93' }}>EV Battery</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>84%</div>
                    </div>
                </div>

                <div style={{
                    background: 'var(--surface-primary)',
                    padding: 'var(--spacing-md)',
                    borderRadius: 'var(--border-radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: 'var(--border-radius-sm)',
                        background: 'var(--surface-secondary)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <Thermometer size={24} color={carFeatures.ac ? '#007AFF' : '#8E8E93'} />
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', color: '#8E8E93' }}>Interior Temp</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>22°C</div>
                    </div>
                </div>
            </div>

            {/* Grid of Controls — filtered by vehicle profile */}
            <div className="hide-scrollbar" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                alignContent: 'start',
                flex: 1,
                paddingBottom: '20px',
                maxWidth: '500px',
                margin: '0 auto',
                width: '100%',
                overflowY: 'auto'
            }}>
                {visibleControls.map(ctrl => (
                    <ControlButton
                        key={ctrl.key}
                        icon={ctrl.icon}
                        label={ctrl.label}
                        isActive={ctrl.inverted ? !carFeatures[ctrl.key] : !!carFeatures[ctrl.key]}
                        onClick={() => toggleControl(ctrl.key)}
                        activeColor={ctrl.activeColor}
                        disabled={!controlsEnabled}
                        testId={`control-${ctrl.key}`}
                    />
                ))}
            </div>

            {!controlsEnabled && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>
                    Controls are unavailable for this vehicle profile.
                </div>
            )}
        </div>
    );
}
