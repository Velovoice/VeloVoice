import { create } from 'zustand';
import VEHICLE_PROFILES from '../data/vehicleProfiles';

const DEFAULT_CAPABILITIES = {
    supportsVoice: true,
    supportsNavigation: true,
    supportsMediaSync: true,
    supportsTelemetryBasic: false,
    supportsTelemetryAdvanced: false,
    supportsCarControls: false
};

const TELEMETRY_STALE_MS = 10000;
const DEFAULT_AUTO_RECONNECT = localStorage.getItem('vv_auto_reconnect');
const DEFAULT_PREFERRED_DEVICE = localStorage.getItem('vv_preferred_device_id');
const SETUP_COMPLETE = localStorage.getItem('vv_setup_complete') === '1';
const STORED_BRAND = localStorage.getItem('vv_vehicle_brand');
const STORED_MODEL = localStorage.getItem('vv_vehicle_model');

const useVehicleStore = create((set, get) => ({
    // UI State
    activeView: 'home',
    accentColor: '#0a84ff',
    aiPersona: 'Samantha',
    language: localStorage.getItem('vv_language') || 'en-US',
    isBooting: true,
    demoModeEnabled: true,
    demoScriptRunId: 0,

    // 🚗 Vehicle Profile (persisted in localStorage)
    isSetupComplete: SETUP_COMPLETE || !!STORED_BRAND,
    vehicleProfile: {
        brand: STORED_BRAND || null,
        model: STORED_MODEL || null,
        data: null // loaded dynamically when profile is selected
    },

    // Navigation State
    mapCenter: [77.5946, 12.9716], // Bangalore
    destination: null,
    nextStep: null,
    isNavigating: false,
    eta: null,

    // Vehicle Features (Relay/Control)
    carFeatures: {
        engine: false,
        doorsLocked: true,
        ac: false,
        sunroof: false,
        temp: 22
    },

    // Telemetry (Sensors)
    telemetry: {
        speed: 0,
        rpm: 0,
        battery: 88,
        tirePressure: { fl: 32, fr: 32, rl: 30, rr: 32 }, // Simulated low rl
        motorTemp: 45
    },

    // Media State (Bluetooth Sync)
    media: {
        track: 'VeloVoice Radio',
        artist: 'AI Discovery',
        albumArt: null,
        isPlaying: false,
        duration: 240,
        progress: 45
    },

    // Connectivity + Capability State
    connection: {
        state: 'idle', // idle, discovering, pairing, connected, degraded, disconnected, error
        lastError: null,
        lastConnectedAt: null,
        autoReconnect: DEFAULT_AUTO_RECONNECT === null ? true : DEFAULT_AUTO_RECONNECT === '1',
        preferredDeviceId: DEFAULT_PREFERRED_DEVICE || null
    },

    capabilities: {
        ...DEFAULT_CAPABILITIES
    },

    telemetryMeta: {
        lastTelemetryAt: null,
        isTelemetryStale: true,
        telemetrySource: 'demo' // live, estimated, demo
    },

    // Actions
    setActiveView: (view) => set({ activeView: view }),
    setAccentColor: (color) => set({ accentColor: color }),
    setAiPersona: (persona) => set({ aiPersona: persona }),
    setLanguage: (lang) => {
        localStorage.setItem('vv_language', lang);
        set({ language: lang });
    },
    setIsBooting: (isBooting) => set({ isBooting }),
    setDemoModeEnabled: (enabled) => set({ demoModeEnabled: !!enabled }),
    triggerDemoScript: () => set((state) => ({ demoScriptRunId: state.demoScriptRunId + 1 })),

    setMapCenter: (center) => set({ mapCenter: center }),
    setNavigation: (nav) => set((state) => ({ ...state, ...nav })),

    updateCarFeature: (feature, value) => set((state) => ({
        carFeatures: { ...state.carFeatures, [feature]: value }
    })),

    updateTelemetry: (data) => set((state) => ({
        telemetry: { ...state.telemetry, ...data }
    })),

    updateMedia: (data) => set((state) => ({
        media: { ...state.media, ...data }
    })),

    setConnectionState: (state) => set((prev) => ({
        connection: {
            ...prev.connection,
            state,
            lastConnectedAt: state === 'connected' ? Date.now() : prev.connection.lastConnectedAt,
            lastError: state === 'connected' ? null : prev.connection.lastError
        }
    })),

    setConnectionError: (error) => set((prev) => ({
        connection: {
            ...prev.connection,
            state: 'error',
            lastError: error || 'Unknown connectivity error'
        }
    })),

    setCapabilities: (capabilityPatch) => set((prev) => ({
        capabilities: {
            ...prev.capabilities,
            ...capabilityPatch
        }
    })),

    markTelemetryFresh: (source = 'live') => set((prev) => ({
        telemetryMeta: {
            ...prev.telemetryMeta,
            lastTelemetryAt: Date.now(),
            isTelemetryStale: false,
            telemetrySource: source
        }
    })),

    markTelemetryStale: () => set((prev) => ({
        telemetryMeta: {
            ...prev.telemetryMeta,
            isTelemetryStale: true
        }
    })),

    setTelemetrySource: (source) => set((prev) => ({
        telemetryMeta: {
            ...prev.telemetryMeta,
            telemetrySource: source
        }
    })),

    setPreferredDevice: (deviceId) => {
        if (deviceId) {
            localStorage.setItem('vv_preferred_device_id', deviceId);
        } else {
            localStorage.removeItem('vv_preferred_device_id');
        }

        set((prev) => ({
            connection: {
                ...prev.connection,
                preferredDeviceId: deviceId || null
            }
        }));
    },

    setAutoReconnect: (enabled) => {
        localStorage.setItem('vv_auto_reconnect', enabled ? '1' : '0');
        set((prev) => ({
            connection: {
                ...prev.connection,
                autoReconnect: !!enabled
            }
        }));
    },

    isConnectedLike: () => {
        const connectionState = get().connection.state;
        return connectionState === 'connected' || connectionState === 'degraded';
    },

    isLimitedMode: () => {
        const state = get();
        const noBasicTelemetry = !state.capabilities.supportsTelemetryBasic;
        const disconnected = !state.isConnectedLike();
        return noBasicTelemetry || disconnected;
    },

    canShowControl: (featureKey) => {
        const state = get();

        if (!state.capabilities.supportsCarControls) {
            return false;
        }

        return Object.prototype.hasOwnProperty.call(state.carFeatures, featureKey);
    },

    isTelemetryFresh: () => {
        const { lastTelemetryAt, isTelemetryStale } = get().telemetryMeta;
        if (!lastTelemetryAt || isTelemetryStale) {
            return false;
        }

        return Date.now() - lastTelemetryAt < TELEMETRY_STALE_MS;
    },

    setVehicleProfile: (brand, model) => {
        const brandData = VEHICLE_PROFILES[brand];
        const modelData = brandData?.models?.[model];

        // Persist to localStorage for future sessions
        localStorage.setItem('vv_setup_complete', '1');
        localStorage.setItem('vv_vehicle_brand', brand);
        localStorage.setItem('vv_vehicle_model', model);

        set({
            isSetupComplete: true,
            vehicleProfile: { brand, model, data: modelData },
            // Sync car features with what the vehicle actually supports
            carFeatures: modelData ? { ...modelData.features } : {
                engine: false, doorsLocked: true, ac: false, sunroof: false, temp: 22
            },
            capabilities: {
                ...get().capabilities,
                supportsCarControls: !!modelData,
                supportsTelemetryBasic: !!modelData,
                supportsTelemetryAdvanced: false
            }
        });
    },

    completeSetupLimitedMode: () => {
        localStorage.setItem('vv_setup_complete', '1');
        localStorage.removeItem('vv_vehicle_brand');
        localStorage.removeItem('vv_vehicle_model');

        set((prev) => ({
            isSetupComplete: true,
            vehicleProfile: { brand: null, model: null, data: null },
            carFeatures: {
                engine: false,
                doorsLocked: true,
                ac: false,
                sunroof: false,
                temp: 22
            },
            capabilities: {
                ...prev.capabilities,
                supportsCarControls: false,
                supportsTelemetryBasic: false,
                supportsTelemetryAdvanced: false
            },
            connection: {
                ...prev.connection,
                state: 'disconnected',
                lastError: null
            }
        }));
    }
}));

export default useVehicleStore;
