import React, { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NavigationBar from './components/NavigationBar';
import DashboardView from './views/DashboardView';
import ControlsView from './views/ControlsView';
import SettingsView from './views/SettingsView';
import PhoneView from './views/PhoneView';
import VehicleStatusView from './views/VehicleStatusView';
import StartupView from './views/StartupView';
import SetupWizard from './views/SetupWizard';
import Orb from './components/Orb';
import { useCoPilot } from './hooks/useCoPilot';
import { bluetoothManager } from './utils/BluetoothManager';

import useVehicleStore from './store/useVehicleStore';

const isE2EMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('e2e') === '1';

export default function App() {
    // Industrial State Store
    const {
        isBooting, setIsBooting,
        demoModeEnabled,
        setDemoModeEnabled,
        demoScriptRunId,
        activeView, setActiveView,
        accentColor,
        aiPersona,
        language,
        mapCenter, setMapCenter,
        setNavigation,
        carFeatures, updateCarFeature,
        telemetry,
        updateTelemetry,
        telemetryMeta,
        markTelemetryFresh,
        markTelemetryStale,
        setTelemetrySource,
        setConnectionState,
        setConnectionError,
        media, updateMedia,
        isSetupComplete,
        triggerDemoScript,
        connection
    } = useVehicleStore();

    const telemetryTimeoutRef = useRef(null);
    const demoTickRef = useRef(0);
    const demoScriptTimeoutsRef = useRef([]);

    const nextDemoRPM = useCallback(() => {
        demoTickRef.current += 1;
        // Deterministic waveform for repeatable pitch demos.
        const wave = Math.sin(demoTickRef.current / 3);
        return Math.round(1200 + (wave * 450));
    }, []);

    const handleSystemRequest = useCallback(async (request, reply) => {
        if (request?.action !== 'poll_obd') {
            return;
        }

        let payload = telemetry;
        let source = telemetryMeta.telemetrySource || 'demo';
        let fresh = true;

        if (demoModeEnabled) {
            const rpm = nextDemoRPM();
            payload = {
                ...telemetry,
                rpm
            };
            updateTelemetry({ rpm });
            source = 'demo';
            setDemoModeEnabled(true);
            setConnectionState('disconnected');
        } else if (bluetoothManager.isConnected) {
            try {
                const live = await bluetoothManager.queryBasicTelemetry();
                const nextTelemetry = {
                    ...telemetry,
                    rpm: Math.round(live.rpm ?? telemetry.rpm),
                    speed: Math.round(live.speed ?? telemetry.speed),
                    motorTemp: Math.round(live.coolantTemp ?? telemetry.motorTemp),
                    battery: Math.round(live.fuelLevel ?? telemetry.battery)
                };
                payload = {
                    ...nextTelemetry
                };
                updateTelemetry(nextTelemetry);
                source = 'live';
                setConnectionState('connected');
            } catch (error) {
                fresh = false;
                source = 'estimated';
                setConnectionError(error?.message || 'Unable to read OBD telemetry');
            }
        } else {
            source = 'estimated';
            fresh = false;
        }

        reply({
            type: 'telemetry_response',
            requestId: request.requestId || null,
            data: payload,
            meta: { source }
        });

        setTelemetrySource(source);
        if (fresh) {
            markTelemetryFresh(source);
        } else {
            markTelemetryStale();
        }

        if (telemetryTimeoutRef.current) {
            clearTimeout(telemetryTimeoutRef.current);
        }

        const timeoutMs = Number.isFinite(request.timeoutMs) ? request.timeoutMs : 3500;
        telemetryTimeoutRef.current = setTimeout(() => {
            markTelemetryStale();
        }, timeoutMs);
    }, [demoModeEnabled, markTelemetryFresh, markTelemetryStale, nextDemoRPM, setConnectionError, setConnectionState, setDemoModeEnabled, setTelemetrySource, telemetry, telemetryMeta.telemetrySource, updateTelemetry]);

    // Connect to the Co-Pilot Backend
    const { status: copilotStatus, toggleListening, actions, clearActions } = useCoPilot(aiPersona, language, {
        onSystemRequest: handleSystemRequest
    });

    // --- 🎯 AI ACTION ORCHESTRATOR ---
    // Decodes co-pilot tool calls into frontend state transformations
    React.useEffect(() => {
        if (actions.length === 0) return;

        actions.forEach(action => {
            console.log(`🤖 Orchestrating: ${action.tool}`, action.args);

            switch (action.tool) {
                case 'navigate': {
                    const dest = action.args.destination.toLowerCase();
                    const locations = {
                        'airport': [77.7068, 13.1986],
                        'office': [77.6309, 12.9279],
                        'work': [77.6309, 12.9279],
                        'home': [77.5946, 12.9716]
                    };

                    const coords = locations[Object.keys(locations).find(k => dest.includes(k))] || [77.5946, 12.9716];

                    setMapCenter(coords);
                    setNavigation({ destination: action.args.destination, isNavigating: true });
                    setActiveView('home');
                    break;
                }

                case 'control_car': {
                    const { feature, action: stateAction } = action.args;
                    const valueMap = {
                        'on': true, 'off': false,
                        'open': true, 'close': false,
                        'lock': true, 'unlock': false
                    };

                    let finalValue = valueMap[stateAction];
                    if (feature === 'doors') finalValue = (stateAction === 'lock' || stateAction === 'close');

                    updateCarFeature(feature, finalValue);
                    setActiveView('controls');
                    break;
                }

                case 'nav_update': {
                    setNavigation({
                        nextStep: action.args.nextTurn,
                        lastAlert: action.args.text,
                        alertType: action.args.type
                    });
                    setActiveView('home');
                    break;
                }

                case 'call_contact':
                    setActiveView('phone');
                    break;

                case 'get_vehicle_status':
                    setActiveView('status');
                    break;

                default:
                    console.warn(`⚠️ Unknown AI tool: ${action.tool}`);
            }
        });

        clearActions();
    }, [actions, clearActions, setMapCenter, setNavigation, updateCarFeature, setActiveView]);

    // Handle Accent Theme
    React.useEffect(() => {
        document.documentElement.style.setProperty('--accent-color', accentColor);
        document.documentElement.style.setProperty(
            '--accent-color-glow',
            `color-mix(in srgb, ${accentColor} 40%, transparent)`
        );
    }, [accentColor]);

    React.useEffect(() => {
        if (isE2EMode && isBooting) {
            setIsBooting(false);
        }
    }, [isBooting, setIsBooting]);

    // If backend is disconnected, mark telemetry stale for UI clarity.
    React.useEffect(() => {
        if (copilotStatus === 'disconnected') {
            markTelemetryStale();
        }
    }, [copilotStatus, markTelemetryStale]);

    React.useEffect(() => () => {
        if (telemetryTimeoutRef.current) {
            clearTimeout(telemetryTimeoutRef.current);
        }
    }, []);

    React.useEffect(() => {
        let cancelled = false;

        const attemptReconnect = async () => {
            if (!connection.autoReconnect || !connection.preferredDeviceId || demoModeEnabled) {
                return;
            }

            if (bluetoothManager.isConnected) {
                return;
            }

            try {
                setConnectionState('discovering');
                await bluetoothManager.connectPreferred(connection.preferredDeviceId);
                if (!cancelled) {
                    setConnectionState('connected');
                }
            } catch (error) {
                if (!cancelled) {
                    setConnectionError(error?.message || 'Auto reconnect failed');
                }
            }
        };

        attemptReconnect();

        return () => {
            cancelled = true;
        };
    }, [connection.autoReconnect, connection.preferredDeviceId, demoModeEnabled, setConnectionError, setConnectionState]);

    // One-click deterministic pitch sequence for demo rehearsals.
    React.useEffect(() => {
        if (!demoScriptRunId) {
            return;
        }

        demoScriptTimeoutsRef.current.forEach(clearTimeout);
        demoScriptTimeoutsRef.current = [];

        setDemoModeEnabled(true);
        setActiveView('home');
        setNavigation({
            destination: 'Airport',
            isNavigating: true,
            nextStep: 'Head north for 200m',
            lastAlert: 'Route loaded. Smooth traffic ahead.',
            alertType: 'info'
        });
        updateMedia({
            track: 'Pitch Drive Theme',
            artist: 'VeloVoice Demo',
            isPlaying: true,
            progress: 30
        });

        const stageTwo = setTimeout(() => {
            updateTelemetry({ rpm: 1480, speed: 42, battery: 82 });
            setTelemetrySource('demo');
            markTelemetryFresh('demo');
        }, 1600);

        const stageThree = setTimeout(() => {
            setNavigation({
                nextStep: 'Take the next left in 50m',
                lastAlert: 'Moderate traffic detected. Re-routing for faster ETA.',
                alertType: 'traffic'
            });
            setActiveView('status');
        }, 4000);

        const stageFour = setTimeout(() => {
            setActiveView('home');
            updateMedia({ progress: 55 });
        }, 6400);

        demoScriptTimeoutsRef.current.push(stageTwo, stageThree, stageFour);

        return () => {
            demoScriptTimeoutsRef.current.forEach(clearTimeout);
            demoScriptTimeoutsRef.current = [];
        };
    }, [demoScriptRunId, markTelemetryFresh, setActiveView, setDemoModeEnabled, setNavigation, setTelemetrySource, updateMedia, updateTelemetry]);

    // Media Progress Simulator
    React.useEffect(() => {
        if (!media.isPlaying) return;
        const interval = setInterval(() => {
            if (media.progress < media.duration) {
                updateMedia({ progress: media.progress + 1 });
            } else {
                updateMedia({ progress: 0, isPlaying: false });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [media.isPlaying, media.progress, media.duration]);

    return (
        <>
            <AnimatePresence>
                {!isE2EMode && isBooting && <StartupView onFinish={() => setIsBooting(false)} />}
            </AnimatePresence>

            {/* Setup Wizard — shown after boot if first launch */}
            <AnimatePresence>
                {!isBooting && !isSetupComplete && <SetupWizard />}
            </AnimatePresence>

            <div className="app-container">
                {/* Left Edge CarPlay Dock */}
                <NavigationBar />

                {/* Main Content Area */}
                <main style={{
                    flex: 1,
                    position: 'relative',
                    padding: '16px 24px 16px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div className="global-telemetry-strip">
                        <span className={`status-chip ${telemetryMeta.telemetrySource === 'live' ? 'status-chip-connected' : telemetryMeta.telemetrySource === 'demo' ? 'status-chip-demo' : 'status-chip-limited'}`}>
                            Telemetry: {telemetryMeta.telemetrySource === 'live' ? 'Live' : telemetryMeta.telemetrySource === 'demo' ? 'Demo' : 'Estimated'}
                        </span>
                        <button
                            type="button"
                            onClick={triggerDemoScript}
                            className="demo-script-btn"
                            data-testid="run-demo-script"
                        >
                            Run Demo Script
                        </button>
                    </div>

                    <div style={{ flex: 1, position: 'relative' }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeView}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                style={{ height: '100%', width: '100%' }}
                            >
                                {activeView === 'home' && <DashboardView />}
                                {activeView === 'controls' && <ControlsView />}
                                {activeView === 'settings' && <SettingsView />}
                                {activeView === 'phone' && <PhoneView />}
                                {activeView === 'status' && <VehicleStatusView />}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {!isE2EMode && (
                        <Orb
                            state={copilotStatus === 'disconnected' ? 'idle' : copilotStatus === 'connected' ? 'idle' : copilotStatus}
                            onClick={toggleListening}
                        />
                    )}

                </main>
            </div>
        </>
    );
}
