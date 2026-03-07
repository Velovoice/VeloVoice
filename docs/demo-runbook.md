# Demo Runbook

Use this script for predictable investor demos.

## Pre-flight
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `npm run dev`
3. Open app at `http://localhost:5173`
4. Verify backend health: `http://localhost:3001/health`

## Demo paths
1. No hardware path:
- Keep Demo Mode enabled in Settings.
- Press `Run Demo Script` from the top telemetry strip.
- Show source badge transitions and guided navigation/media updates.

2. Hardware path (OBD adapter):
- Disable Demo Mode in Settings.
- Connect OBD-II Bluetooth adapter.
- Confirm telemetry badge shows `Live`.
- Show RPM/Speed updates and proactive health alerts.

## Message boundaries
- State clearly: voice/navigation/media are always available.
- State clearly: live telemetry requires OBD connectivity.
- State clearly: deep car controls vary by model/integration.
