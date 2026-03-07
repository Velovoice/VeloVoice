/**
 * BluetoothManager.js
 * Handles Web Bluetooth connection and ELM327 protocol communication.
 * PIDs (Parameter IDs) commonly used:
 * 010C: RPM
 * 010D: Speed
 * 0105: Coolant Temp
 * 012F: Fuel Level
 */

export class BluetoothManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.isConnected = false;
        this.responseBuffer = '';
        this.pendingCommand = null;
        this.connectionListeners = new Set();
        this._onDisconnected = this.handleDisconnect.bind(this);
        this._onNotification = this.handleNotification.bind(this);
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();

        // Common ELM327 UART Service UUIDs
        this.SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb'; // Common for cheap ELM327
        this.CHAR_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';

        // Common protocol commands for stable, parseable output.
        this.INIT_SEQUENCE = ['AT Z', 'AT E0', 'AT L0', 'AT S0', 'AT SP 0'];
    }

    async connect() {
        try {
            console.log('Requesting Bluetooth Device...');
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'OBD' },
                    { namePrefix: 'ELM' },
                    { services: [this.SERVICE_UUID] }
                ],
                optionalServices: [this.SERVICE_UUID, 'heart_rate'] // Add others as needed
            });

            console.log('Connecting to GATT Server...');
            this.server = await this.device.gatt.connect();

            console.log('Getting Service...');
            this.service = await this.server.getPrimaryService(this.SERVICE_UUID);

            console.log('Getting Characteristic...');
            this.characteristic = await this.service.getCharacteristic(this.CHAR_UUID);

            await this.characteristic.startNotifications();
            this.characteristic.addEventListener('characteristicvaluechanged', this._onNotification);

            this.isConnected = true;
            this.responseBuffer = '';
            console.log('OBD-II Connected!');

            this.device.addEventListener('gattserverdisconnected', this._onDisconnected);

            await this.initializeAdapter();
            this.notifyConnectionChange('connected');

            return true;
        } catch (error) {
            console.error('Bluetooth Connection Failed:', error);
            this.notifyConnectionChange('error', error?.message || 'Bluetooth connection failed');
            throw error;
        }
    }

    async connectPreferred(preferredDeviceId) {
        if (!navigator.bluetooth?.getDevices) {
            throw new Error('Preferred device reconnect is not supported in this browser');
        }

        const knownDevices = await navigator.bluetooth.getDevices();
        const preferred = knownDevices.find((device) => device.id === preferredDeviceId);
        if (!preferred) {
            throw new Error('Preferred Bluetooth device not found');
        }

        this.device = preferred;
        this.server = await this.device.gatt.connect();
        this.service = await this.server.getPrimaryService(this.SERVICE_UUID);
        this.characteristic = await this.service.getCharacteristic(this.CHAR_UUID);

        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', this._onNotification);

        this.isConnected = true;
        this.responseBuffer = '';
        this.device.addEventListener('gattserverdisconnected', this._onDisconnected);

        await this.initializeAdapter();
        this.notifyConnectionChange('connected');
        return true;
    }

    async initializeAdapter() {
        // Send ELM setup commands sequentially to make response parsing reliable.
        for (const cmd of this.INIT_SEQUENCE) {
            await this.sendCommand(cmd, { timeoutMs: 2500, retries: 1 });
        }
    }

    handleDisconnect() {
        this.isConnected = false;
        this.responseBuffer = '';

        if (this.pendingCommand) {
            clearTimeout(this.pendingCommand.timeoutHandle);
            this.pendingCommand.reject(new Error('OBD adapter disconnected during command execution'));
            this.pendingCommand = null;
        }

        console.log('OBD-II Disconnected');
        this.notifyConnectionChange('disconnected');
    }

    handleNotification(event) {
        const value = event.target?.value;
        if (!value) {
            return;
        }

        const chunk = this.decoder.decode(value);
        if (!chunk) {
            return;
        }

        this.responseBuffer += chunk;

        // ELM327 prompt '>' marks response completion.
        if (!this.responseBuffer.includes('>') || !this.pendingCommand) {
            return;
        }

        const fullResponse = this.responseBuffer;
        this.responseBuffer = '';
        const pending = this.pendingCommand;
        this.pendingCommand = null;
        clearTimeout(pending.timeoutHandle);

        pending.resolve(fullResponse);
    }

    normalizeResponse(response = '') {
        return response
            .replace(/\r/g, ' ')
            .replace(/\n/g, ' ')
            .replace(/>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    parsePidResponse(pid, response) {
        const cleaned = this.normalizeResponse(response).replace(/\s+/g, '').toUpperCase();
        const modePid = `41${pid.slice(2).toUpperCase()}`;
        const start = cleaned.indexOf(modePid);

        if (start === -1) {
            throw new Error(`PID ${pid} response missing marker ${modePid}`);
        }

        const payload = cleaned.slice(start + modePid.length);

        if (pid === '010C') {
            // RPM formula: ((A * 256) + B) / 4
            if (payload.length < 4) {
                throw new Error('RPM payload too short');
            }
            const a = Number.parseInt(payload.slice(0, 2), 16);
            const b = Number.parseInt(payload.slice(2, 4), 16);
            if (!Number.isFinite(a) || !Number.isFinite(b)) {
                throw new Error('RPM payload invalid');
            }
            return ((a * 256) + b) / 4;
        }

        if (pid === '010D') {
            // Speed formula: A (km/h)
            if (payload.length < 2) {
                throw new Error('Speed payload too short');
            }
            const a = Number.parseInt(payload.slice(0, 2), 16);
            if (!Number.isFinite(a)) {
                throw new Error('Speed payload invalid');
            }
            return a;
        }

        if (pid === '0105') {
            // Coolant formula: A - 40 (deg C)
            if (payload.length < 2) {
                throw new Error('Coolant payload too short');
            }
            const a = Number.parseInt(payload.slice(0, 2), 16);
            if (!Number.isFinite(a)) {
                throw new Error('Coolant payload invalid');
            }
            return a - 40;
        }

        if (pid === '012F') {
            // Fuel level formula: (100/255) * A
            if (payload.length < 2) {
                throw new Error('Fuel payload too short');
            }
            const a = Number.parseInt(payload.slice(0, 2), 16);
            if (!Number.isFinite(a)) {
                throw new Error('Fuel payload invalid');
            }
            return Math.round((100 / 255) * a);
        }

        throw new Error(`PID ${pid} is not implemented in parser`);
    }

    async sendCommand(cmd, options = {}) {
        if (!this.isConnected || !this.characteristic) {
            throw new Error('OBD adapter is not connected');
        }

        const timeoutMs = options.timeoutMs ?? 3000;
        const retries = options.retries ?? 0;

        // Commands are serialized to avoid mixed responses.
        if (this.pendingCommand) {
            throw new Error('A command is already in progress');
        }

        const execute = async (attempt = 0) => {
            this.responseBuffer = '';
            const payload = this.encoder.encode(`${cmd}\r`);

            const responsePromise = new Promise((resolve, reject) => {
                const timeoutHandle = setTimeout(() => {
                    if (this.pendingCommand) {
                        this.pendingCommand = null;
                    }
                    reject(new Error(`Command timeout for ${cmd}`));
                }, timeoutMs);

                this.pendingCommand = { resolve, reject, timeoutHandle };
            });

            try {
                if (typeof this.characteristic.writeValueWithoutResponse === 'function') {
                    await this.characteristic.writeValueWithoutResponse(payload);
                } else {
                    await this.characteristic.writeValue(payload);
                }

                return await responsePromise;
            } catch (error) {
                if (this.pendingCommand) {
                    clearTimeout(this.pendingCommand.timeoutHandle);
                    this.pendingCommand = null;
                }

                if (attempt < retries) {
                    return execute(attempt + 1);
                }

                throw error;
            }
        };

        return execute(0);
    }

    async queryPID(pid, options = {}) {
        const raw = await this.sendCommand(pid, {
            timeoutMs: options.timeoutMs ?? 3000,
            retries: options.retries ?? 1
        });
        return this.parsePidResponse(pid, raw);
    }

    async queryRPM() {
        return this.queryPID('010C');
    }

    async querySpeed() {
        return this.queryPID('010D');
    }

    async queryCoolantTemp() {
        return this.queryPID('0105');
    }

    async queryFuelLevel() {
        return this.queryPID('012F');
    }

    async queryBasicTelemetry() {
        const [rpm, speed, coolantTemp, fuelLevel] = await Promise.allSettled([
            this.queryRPM(),
            this.querySpeed(),
            this.queryCoolantTemp(),
            this.queryFuelLevel()
        ]);

        const safe = (result, fallback = null) => result.status === 'fulfilled' ? result.value : fallback;

        return {
            rpm: safe(rpm, null),
            speed: safe(speed, null),
            coolantTemp: safe(coolantTemp, null),
            fuelLevel: safe(fuelLevel, null)
        };
    }

    subscribeConnection(listener) {
        this.connectionListeners.add(listener);
        return () => this.connectionListeners.delete(listener);
    }

    notifyConnectionChange(state, error = null) {
        for (const listener of this.connectionListeners) {
            try {
                listener({ state, error });
            } catch (listenerError) {
                console.warn('Bluetooth connection listener failed:', listenerError);
            }
        }
    }

    async disconnect() {
        if (this.pendingCommand) {
            clearTimeout(this.pendingCommand.timeoutHandle);
            this.pendingCommand.reject(new Error('OBD command cancelled on disconnect'));
            this.pendingCommand = null;
        }

        if (this.characteristic) {
            this.characteristic.removeEventListener('characteristicvaluechanged', this._onNotification);
            try {
                await this.characteristic.stopNotifications();
            } catch (error) {
                // Ignore stopNotifications failures for adapters that do not support it.
            }
        }

        if (this.device) {
            this.device.removeEventListener('gattserverdisconnected', this._onDisconnected);
        }

        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }

        this.isConnected = false;
        this.notifyConnectionChange('disconnected');
    }
}

export const bluetoothManager = new BluetoothManager();
