import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { processVoiceCommand } from './llm.js';
import { normalizeTelemetryPayload } from './telemetry.js';
import {
    MAX_WS_MESSAGES_PER_MIN,
    checkAndTrackRateLimit,
    sanitizeLanguage,
    sanitizePersona,
    sanitizeTranscript,
    sanitizeType
} from './wsGuards.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('CORS origin denied'));
    }
}));
app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'VeloVoice Co-Pilot Brain is alive.' });
});

// Start Express Server
const server = app.listen(port, () => {
    console.log(`🧠 VeloVoice Backend listening on port ${port}`);
});

// Initialize WebSocket Server tightly coupled to Express
const wss = new WebSocketServer({ server });

// OBD-II Configuration
const DEFAULT_POLL_INTERVAL_MS = 2000;
const POLL_MIN_MS = 1000;
const POLL_MAX_MS = 10000;
const pollFromEnv = Number.parseInt(process.env.OBD_POLL_INTERVAL_MS || `${DEFAULT_POLL_INTERVAL_MS}`, 10);
const POLL_INTERVAL_MS = Math.min(POLL_MAX_MS, Math.max(POLL_MIN_MS, Number.isFinite(pollFromEnv) ? pollFromEnv : DEFAULT_POLL_INTERVAL_MS));
const TELEMETRY_RESPONSE_TIMEOUT_MS = 3500;
const REDLINE_RPM = 4000;
const LOW_BATTERY_PCT = 15;

function startOBDPolling(ws, state) {
    if (state.pollingSession) clearInterval(state.pollingSession);
    console.log('🔌 Starting Continuous OBD-II Polling...');

    state.pollingSession = setInterval(() => {
        if (ws.readyState !== ws.OPEN) {
            clearInterval(state.pollingSession);
            return;
        }

        const requestId = `obd-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        state.pendingRequestId = requestId;

        if (state.pendingTimeout) {
            clearTimeout(state.pendingTimeout);
        }

        state.pendingTimeout = setTimeout(() => {
            if (state.pendingRequestId === requestId && ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                    type: 'system_notice',
                    code: 'telemetry_timeout',
                    message: 'Telemetry response timed out.'
                }));
                state.pendingRequestId = null;
            }
        }, TELEMETRY_RESPONSE_TIMEOUT_MS + 200);

        ws.send(JSON.stringify({
            type: 'system_request',
            action: 'poll_obd',
            requestId,
            timeoutMs: TELEMETRY_RESPONSE_TIMEOUT_MS
        }));
    }, POLL_INTERVAL_MS);
}

// Proactive Health Monitor
function monitorVehicleHealth(ws, telemetry, personaSpeak) {
    if (ws.readyState !== ws.OPEN) return;

    if (telemetry.rpm > REDLINE_RPM) {
        ws.send(JSON.stringify({
            type: 'ai_response',
            text: personaSpeak(`engine RPM is critical at ${telemetry.rpm}. Easing off the throttle is advised to protect the motor.`),
            actions: [{ tool: 'get_vehicle_status', args: {} }]
        }));
    }

    if (telemetry.battery < LOW_BATTERY_PCT) {
        ws.send(JSON.stringify({
            type: 'ai_response',
            text: personaSpeak(`battery level is at ${telemetry.battery}%. Routing to the nearest charging station now.`),
            actions: [{ tool: 'navigate', args: { destination: 'nearest charging station' } }]
        }));
    }
}

wss.on('connection', (ws, req) => {
        const origin = req?.headers?.origin;
        if (origin && !ALLOWED_ORIGINS.includes(origin)) {
            ws.close(1008, 'Origin not allowed');
            return;
        }

        const connectionState = {
            pollingSession: null,
            pendingRequestId: null,
            pendingTimeout: null,
            lastTelemetryAt: null
        };
        const messageWindow = [];

    console.log('⚡ Frontend connected to Brain via WebSocket');

    // Store persona per connection (updated when client sends it)
    let activePersona = 'Samantha';

    // Persona-aware message builder for proactive alerts
    function personaSpeak(text) {
        const intros = {
            'Samantha': ['Heads up — ', 'Just so you know — ', 'Pardon the interruption, but ', ''],
            'Jarvis': ['Alert: ', 'System notice — ', 'Attention — ', 'Data incoming: '],
            'KITT': ['Driver advisory: ', 'Safety notice — ', 'KITT reporting — ', 'Be advised — ']
        };
        const pool = intros[activePersona] || intros['Samantha'];
        const prefix = pool[Math.floor(Math.random() * pool.length)];
        return prefix + text;
    }

    startOBDPolling(ws, connectionState);

    // Send initial greeting
    ws.send(JSON.stringify({
        type: 'system',
        message: 'Connected to Co-Pilot Brain'
    }));

    // Dynamic Navigation Engine & Persona State
    let navigationSession = null;
    let activeLanguage = 'en-US';

    // Listen for messages from the frontend (Voice Transcripts)
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            const now = Date.now();
            const isRateLimited = checkAndTrackRateLimit(messageWindow, now, MAX_WS_MESSAGES_PER_MIN, 60000);
            if (isRateLimited) {
                ws.send(JSON.stringify({
                    type: 'system_notice',
                    code: 'rate_limited',
                    message: 'Too many messages. Please slow down.'
                }));
                return;
            }

            if (!data || typeof data !== 'object') {
                ws.send(JSON.stringify({
                    type: 'system_notice',
                    code: 'invalid_payload',
                    message: 'Message payload must be a JSON object.'
                }));
                return;
            }

            const msgType = sanitizeType(data.type);
            if (!msgType) {
                ws.send(JSON.stringify({
                    type: 'system_notice',
                    code: 'invalid_type',
                    message: 'Unsupported message type.'
                }));
                return;
            }

            if (msgType === 'persona_sync') {
                // Client announcing their persona at connect time
                activePersona = sanitizePersona(data.persona, activePersona);
                activeLanguage = sanitizeLanguage(data.language, activeLanguage);
                console.log(`🎭 Persona: ${activePersona} | 🌍 Lang: ${activeLanguage}`);

            } else if (msgType === 'transcript') {
                // Update persona and language for this connection if client sent one
                activePersona = sanitizePersona(data.persona, activePersona);
                activeLanguage = sanitizeLanguage(data.language, activeLanguage);

                const sanitizedText = sanitizeTranscript(data.text);
                if (!sanitizedText) {
                    ws.send(JSON.stringify({
                        type: 'system_notice',
                        code: 'invalid_text',
                        message: 'Voice transcript must be a non-empty string.'
                    }));
                    return;
                }

                console.log(`💬 Voice Command received [${activeLanguage}] (${sanitizedText.length} chars)`);
                const llmResult = await processVoiceCommand(sanitizedText, activePersona, activeLanguage);

                // Start Nav Engine if 'navigate' tool was called
                if (llmResult.actions.some(a => a.tool === 'navigate')) {
                    const navAction = llmResult.actions.find(a => a.tool === 'navigate');
                    navigationSession = startNavigationEngine(ws, navAction.args.destination, navigationSession);
                }

                // Send response back to Frontend Over WebSocket
                ws.send(JSON.stringify({
                    type: 'ai_response',
                    text: llmResult.text,
                    actions: llmResult.actions // Array of tool calls (e.g. {tool: 'navigate', args: {destination: 'work'}})
                }));
            } else if (msgType === 'telemetry' || msgType === 'telemetry_response') {
                const telemetry = normalizeTelemetryPayload(data);

                if (!telemetry) {
                    ws.send(JSON.stringify({
                        type: 'system_notice',
                        code: 'telemetry_invalid_payload',
                        message: 'Telemetry payload missing required object data.'
                    }));
                    return;
                }

                if (data.requestId && data.requestId === connectionState.pendingRequestId) {
                    connectionState.pendingRequestId = null;
                    if (connectionState.pendingTimeout) {
                        clearTimeout(connectionState.pendingTimeout);
                        connectionState.pendingTimeout = null;
                    }
                }

                connectionState.lastTelemetryAt = Date.now();
                monitorVehicleHealth(ws, telemetry, personaSpeak);
            }

        } catch (error) {
            console.error('Error parsing message:', error?.message || 'unknown message error');
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error?.message || 'unknown ws error');
        if (connectionState.pollingSession) {
            clearInterval(connectionState.pollingSession);
            connectionState.pollingSession = null;
        }
        if (connectionState.pendingTimeout) {
            clearTimeout(connectionState.pendingTimeout);
            connectionState.pendingTimeout = null;
        }
    });

    ws.on('close', () => {
        if (connectionState.pollingSession) {
            clearInterval(connectionState.pollingSession);
        }
        if (connectionState.pendingTimeout) {
            clearTimeout(connectionState.pendingTimeout);
        }
        console.log('❌ Frontend disconnected');
    });
});

function startNavigationEngine(ws, destination, existingSession) {
    if (existingSession) clearInterval(existingSession);
    console.log(`🚀 Starting Navigation Engine for: ${destination}`);

    let step = 0;
    const milestones = [
        { type: 'info', text: `Routing to ${destination} complete. ETA: 14 mins.` },
        { type: 'traffic', text: "Alert: Heavy traffic ahead in 500 meters. Expected delay 4 minutes." },
        { type: 'guidance', text: "In 10 meters, take a sharp left turn toward the city center." },
        { type: 'info', text: "You have arrived at your destination." }
    ];

    const session = setInterval(() => {
        if (ws.readyState !== ws.OPEN) {
            clearInterval(session);
            return;
        }

        if (step < milestones.length) {
            const milestone = milestones[step];
            console.log(`📡 Pushing Nav Alert: ${milestone.text}`);

            ws.send(JSON.stringify({
                type: 'ai_response',
                text: milestone.text,
                actions: [{
                    tool: 'nav_update',
                    args: {
                        type: milestone.type,
                        text: milestone.text,
                        nextTurn: step === 2 ? 'Left in 10m' : null
                    }
                }]
            }));
            step++;
        } else {
            clearInterval(session);
        }
    }, 12000); // 12s per milestone for demo

    return session;
}
