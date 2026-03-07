import { describe, it, expect, vi } from 'vitest';
import { BluetoothManager } from '../utils/BluetoothManager';

describe('BluetoothManager PID parsing', () => {
    it('parses RPM from standard ELM327 response', () => {
        const manager = new BluetoothManager();
        const rpm = manager.parsePidResponse('010C', '41 0C 1A F8\r>');
        expect(rpm).toBe(1726);
    });

    it('normalizes noisy ELM327 response before parsing', () => {
        const manager = new BluetoothManager();
        const rpm = manager.parsePidResponse('010C', '\r\n410C0FA0\r\n>');
        expect(rpm).toBe(1000);
    });

    it('throws when PID marker is missing', () => {
        const manager = new BluetoothManager();
        expect(() => manager.parsePidResponse('010C', 'NO DATA\r>')).toThrow(/missing marker/i);
    });

    it('supports queryPID via sendCommand contract', async () => {
        const manager = new BluetoothManager();
        vi.spyOn(manager, 'sendCommand').mockResolvedValue('41 0C 13 88\r>');

        const rpm = await manager.queryPID('010C');
        expect(rpm).toBe(1250);
    });

    it('parses speed, coolant temp and fuel level', () => {
        const manager = new BluetoothManager();

        const speed = manager.parsePidResponse('010D', '41 0D 28\r>');
        const coolant = manager.parsePidResponse('0105', '41 05 64\r>');
        const fuel = manager.parsePidResponse('012F', '41 2F 80\r>');

        expect(speed).toBe(40);
        expect(coolant).toBe(60);
        expect(fuel).toBe(50);
    });

    it('returns partial results from queryBasicTelemetry when some PIDs fail', async () => {
        const manager = new BluetoothManager();
        vi.spyOn(manager, 'queryRPM').mockResolvedValue(1500);
        vi.spyOn(manager, 'querySpeed').mockRejectedValue(new Error('speed fail'));
        vi.spyOn(manager, 'queryCoolantTemp').mockResolvedValue(82);
        vi.spyOn(manager, 'queryFuelLevel').mockRejectedValue(new Error('fuel fail'));

        const telemetry = await manager.queryBasicTelemetry();
        expect(telemetry).toEqual({
            rpm: 1500,
            speed: null,
            coolantTemp: 82,
            fuelLevel: null
        });
    });
});
