import { normalizeTelemetryPayload } from '../telemetry.js';

describe('📦 Telemetry Payload Normalization', () => {
    test('returns null for missing payload', () => {
        expect(normalizeTelemetryPayload(null)).toBeNull();
        expect(normalizeTelemetryPayload(undefined)).toBeNull();
    });

    test('normalizes direct payload objects', () => {
        const out = normalizeTelemetryPayload({ rpm: '1200', battery: '82', speed: '48' });
        expect(out).toEqual({ rpm: 1200, battery: 82, speed: 48 });
    });

    test('normalizes wrapped websocket payload objects', () => {
        const out = normalizeTelemetryPayload({ data: { rpm: '1500', battery: 55, speed: 36, extra: true } });
        expect(out).toEqual({ rpm: 1500, battery: 55, speed: 36, extra: true });
    });

    test('falls back invalid numeric fields to zero', () => {
        const out = normalizeTelemetryPayload({ data: { rpm: 'bad', battery: null, speed: undefined } });
        expect(out.rpm).toBe(0);
        expect(out.battery).toBe(0);
        expect(out.speed).toBe(0);
    });
});
