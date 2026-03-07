/**
 * 🧪 UNIT TESTS — Vehicle Store (Zustand)
 * Tests centralized state management for correctness
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Helper: reset store between tests
let useVehicleStore;
beforeEach(async () => {
    // Dynamic import ensures fresh module state per test
    vi.resetModules();
    const mod = await import('../store/useVehicleStore');
    useVehicleStore = mod.default;
});

describe('🚗 Vehicle Store — Car Features', () => {
    it('should start with AC off', () => {
        const { carFeatures } = useVehicleStore.getState();
        expect(carFeatures.ac).toBe(false);
    });

    it('should toggle AC on via updateCarFeature', () => {
        const { updateCarFeature } = useVehicleStore.getState();
        updateCarFeature('ac', true);
        const { carFeatures } = useVehicleStore.getState();
        expect(carFeatures.ac).toBe(true);
    });

    it('should toggle sunroof via updateCarFeature', () => {
        const { updateCarFeature } = useVehicleStore.getState();
        updateCarFeature('sunroof', true);
        const { carFeatures } = useVehicleStore.getState();
        expect(carFeatures.sunroof).toBe(true);
    });

    it('should lock doors by default', () => {
        const { carFeatures } = useVehicleStore.getState();
        expect(carFeatures.doorsLocked).toBe(true);
    });
});

describe('🗺️ Vehicle Store — Navigation', () => {
    it('should start with no active navigation', () => {
        const { isNavigating, destination } = useVehicleStore.getState();
        expect(isNavigating).toBe(false);
        expect(destination).toBeNull();
    });

    it('should set destination and navigate flag via setNavigation', () => {
        const { setNavigation } = useVehicleStore.getState();
        setNavigation({ destination: 'Airport', isNavigating: true });
        const { isNavigating, destination } = useVehicleStore.getState();
        expect(isNavigating).toBe(true);
        expect(destination).toBe('Airport');
    });
});

describe('📻 Vehicle Store — Media', () => {
    it('should start with media not playing', () => {
        const { media } = useVehicleStore.getState();
        expect(media.isPlaying).toBe(false);
    });

    it('should update media track info via updateMedia', () => {
        const { updateMedia } = useVehicleStore.getState();
        updateMedia({ track: 'Dark Side of the Moon', artist: 'Pink Floyd' });
        const { media } = useVehicleStore.getState();
        expect(media.track).toBe('Dark Side of the Moon');
        expect(media.artist).toBe('Pink Floyd');
    });
});

describe('🔌 Vehicle Store — Connection State', () => {
    it('should start in idle connection state', () => {
        const { connection } = useVehicleStore.getState();
        expect(connection.state).toBe('idle');
        expect(connection.autoReconnect).toBe(true);
    });

    it('should move to connected state and mark as connected-like', () => {
        const { setConnectionState, isConnectedLike } = useVehicleStore.getState();
        setConnectionState('connected');

        const { connection } = useVehicleStore.getState();
        expect(connection.state).toBe('connected');
        expect(typeof connection.lastConnectedAt).toBe('number');
        expect(isConnectedLike()).toBe(true);
    });

    it('should store connection error and switch state to error', () => {
        const { setConnectionError } = useVehicleStore.getState();
        setConnectionError('Adapter timeout');

        const { connection } = useVehicleStore.getState();
        expect(connection.state).toBe('error');
        expect(connection.lastError).toBe('Adapter timeout');
    });

    it('should update preferred device and auto reconnect options', () => {
        const { setPreferredDevice, setAutoReconnect } = useVehicleStore.getState();
        setPreferredDevice('elm327-123');
        setAutoReconnect(false);

        const { connection } = useVehicleStore.getState();
        expect(connection.preferredDeviceId).toBe('elm327-123');
        expect(connection.autoReconnect).toBe(false);
    });
});

describe('🧭 Vehicle Store — Capabilities and Limited Mode', () => {
    it('should start in limited mode by default (no telemetry basic)', () => {
        const { isLimitedMode } = useVehicleStore.getState();
        expect(isLimitedMode()).toBe(true);
    });

    it('should merge capability updates via setCapabilities', () => {
        const { setCapabilities } = useVehicleStore.getState();
        setCapabilities({ supportsTelemetryBasic: true, supportsCarControls: true });

        const { capabilities } = useVehicleStore.getState();
        expect(capabilities.supportsTelemetryBasic).toBe(true);
        expect(capabilities.supportsCarControls).toBe(true);
    });

    it('should allow controls only when controls capability is enabled and feature exists', () => {
        const { canShowControl, setCapabilities } = useVehicleStore.getState();
        expect(canShowControl('ac')).toBe(false);

        setCapabilities({ supportsCarControls: true });
        expect(canShowControl('ac')).toBe(true);
    });
});

describe('📡 Vehicle Store — Telemetry Freshness', () => {
    it('should start as stale demo telemetry', () => {
        const { telemetryMeta, isTelemetryFresh } = useVehicleStore.getState();
        expect(telemetryMeta.isTelemetryStale).toBe(true);
        expect(telemetryMeta.telemetrySource).toBe('demo');
        expect(isTelemetryFresh()).toBe(false);
    });

    it('should mark telemetry fresh and set source', () => {
        const { markTelemetryFresh, isTelemetryFresh } = useVehicleStore.getState();
        markTelemetryFresh('live');

        const { telemetryMeta } = useVehicleStore.getState();
        expect(telemetryMeta.isTelemetryStale).toBe(false);
        expect(telemetryMeta.telemetrySource).toBe('live');
        expect(typeof telemetryMeta.lastTelemetryAt).toBe('number');
        expect(isTelemetryFresh()).toBe(true);
    });

    it('should mark telemetry stale after being fresh', () => {
        const { markTelemetryFresh, markTelemetryStale } = useVehicleStore.getState();
        markTelemetryFresh('live');
        markTelemetryStale();

        const { telemetryMeta, isTelemetryFresh } = useVehicleStore.getState();
        expect(telemetryMeta.isTelemetryStale).toBe(true);
        expect(isTelemetryFresh()).toBe(false);
    });
});

describe('🎬 Vehicle Store — Demo Mode', () => {
    it('should start with demo mode enabled', () => {
        const { demoModeEnabled } = useVehicleStore.getState();
        expect(demoModeEnabled).toBe(true);
    });

    it('should toggle demo mode via setDemoModeEnabled', () => {
        const { setDemoModeEnabled } = useVehicleStore.getState();
        setDemoModeEnabled(false);
        expect(useVehicleStore.getState().demoModeEnabled).toBe(false);

        setDemoModeEnabled(true);
        expect(useVehicleStore.getState().demoModeEnabled).toBe(true);
    });
});
