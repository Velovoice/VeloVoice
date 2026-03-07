import React from 'react';
import { MapPin, Navigation, Play, Pause, SkipForward, CarFront, MessageCircle, Settings, Phone, Music } from 'lucide-react';
import MapView from '../components/MapView';
import WeatherWidget from '../components/WeatherWidget';
import useVehicleStore from '../store/useVehicleStore';

export default function DashboardView() {
    const {
        mapCenter,
        destination,
        isNavigating,
        nextStep,
        lastAlert,
        alertType,
        media,
        updateMedia,
        connection,
        telemetryMeta,
        isLimitedMode
    } = useVehicleStore();

    const showLimited = isLimitedMode();
    const showStale = telemetryMeta.isTelemetryStale;
    const showDemo = telemetryMeta.telemetrySource === 'demo';
    const showConnected = connection.state === 'connected' || connection.state === 'degraded';

    const alertColors = {
        info: '#34C759',
        traffic: '#FF9500',
        guidance: 'var(--accent-color)'
    };
    return (
        <div className="dashboard-grid">
            {/* Main Navigation Card */}
            <div className="dashboard-nav-card" style={{
                background: 'var(--surface-primary)',
                borderRadius: 'var(--border-radius-lg)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}>
                <MapView center={mapCenter} />

                <div className="status-chip-row dashboard-chip-stack">
                    {showConnected && <span className="status-chip status-chip-connected">Connected</span>}
                    {showLimited && <span className="status-chip status-chip-limited">Limited Mode</span>}
                    {showStale && <span className="status-chip status-chip-stale">Telemetry Stale</span>}
                    {showDemo && <span className="status-chip status-chip-demo">Demo Data</span>}
                </div>

                {/* Navigation Overlays - Only show if actively navigating */}
                {isNavigating && (
                    <>
                        <div style={{ position: 'absolute', top: 16, left: 16, background: 'var(--surface-primary)', borderRadius: 'var(--border-radius-sm)', padding: '12px 16px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 'var(--z-dashboard-overlay)', maxWidth: 'min(72%, 460px)' }}>
                            <div style={{ background: 'var(--accent-color)', padding: '10px', borderRadius: '10px' }}>
                                <Navigation size={22} color="#fff" />
                            </div>
                            <div>
                                <div style={{ fontSize: '13px', color: '#8E8E93' }}>
                                    {destination ? `To: ${destination}` : 'Navigation'}
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                    {nextStep || 'Calculating Route...'}
                                </div>
                            </div>
                        </div>

                        {/* Status Ticker for Traffic/Alerts */}
                        <div className="dashboard-alert-ticker" style={{
                            opacity: isNavigating ? 1 : 0,
                            transition: 'opacity 0.5s ease'
                        }}>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: alertColors[alertType] || '#34C759',
                                boxShadow: `0 0 10px ${alertColors[alertType] || '#34C759'}`
                            }} />
                            <div style={{ fontSize: '14px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                                {lastAlert || 'System Online • Calculating...'}
                            </div>
                        </div>

                        <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'rgba(28,28,30,0.8)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '8px 12px', fontSize: '14px', color: '#8E8E93', zIndex: 'var(--z-dashboard-overlay)' }}>
                            Calculating ETA...
                        </div>
                    </>
                )}
            </div>

            {/* Weather Widget */}
            <WeatherWidget />

            {/* Media Card */}
            <div style={{
                background: 'var(--surface-primary)',
                borderRadius: 'var(--border-radius-lg)',
                padding: 'var(--spacing-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: media.albumArt ? `url(${media.albumArt}) center/cover` : 'linear-gradient(135deg, #333, #111)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {!media.albumArt && <Music size={32} color="#555" />}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>{media.track}</div>
                        <div style={{ color: '#8E8E93', fontSize: '14px' }}>{media.artist}</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div style={{ height: '4px', background: '#333', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${(media.progress / media.duration) * 100}%`, height: '100%', background: 'var(--accent-color)' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', alignItems: 'center' }}>
                    <SkipForward style={{ transform: 'rotate(180deg)' }} size={24} color="#fff" strokeWidth={1.5} />
                    <div
                        onClick={() => updateMedia({ isPlaying: !media.isPlaying })}
                        style={{ background: '#fff', padding: '12px', borderRadius: '50%', cursor: 'pointer' }}
                    >
                        {media.isPlaying ? <Pause size={24} color="#000" fill="#000" /> : <Play size={24} color="#000" fill="#000" />}
                    </div>
                    <SkipForward size={24} color="#fff" strokeWidth={1.5} />
                </div>
            </div>

            {/* Suggestions/Quick Actions */}
            <div style={{
                background: 'var(--surface-primary)',
                borderRadius: 'var(--border-radius-lg)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ fontSize: '13px', color: '#8E8E93', fontWeight: 'bold', textTransform: 'uppercase' }}>Suggestions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                        { icon: MapPin, text: 'Coffee nearby', sub: 'Starbucks • 2 min' },
                        { icon: MessageCircle, text: 'Reply to Mom', sub: '"See you soon!"' }
                    ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={{ color: 'var(--accent-color)' }}><item.icon size={20} /></div>
                            <div>
                                <div style={{ fontSize: '15px', fontWeight: '500' }}>{item.text}</div>
                                <div style={{ fontSize: '12px', color: '#8E8E93' }}>{item.sub}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
