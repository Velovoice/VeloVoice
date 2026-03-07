# VeloVoice

## Usage
This project serves as an AI co-pilot for vehicle assistance, helping users navigate and providing prompts based on vehicle conditions and user commands.

## Features
- Real-time navigation support
- Voice commands integration
- Vehicle condition monitoring

## 🛠️ Getting Started
For detailed setup instructions and hardware list, please refer to:
👉 **[REQUIREMENTS.md](./REQUIREMENTS.md)**

## 🚀 Quick Start
1. **Setup Environment**: Add `GEMINI_API_KEY` to `backend/.env`.
2. **Launch Backend**: `cd backend && npm run dev`
3. **Launch Frontend**: `npm run dev` (from root)

## Connectivity Modes
- **Limited Mode**: Voice/navigation/media works without OBD hardware.
- **Demo Mode**: Deterministic simulated telemetry for pitching and rehearsals.
- **Live Mode**: Real telemetry (RPM/speed/coolant/fuel) via OBD-II adapter.

## Capability Boundaries
- Android Auto is treated as projection UX for voice/navigation/media in MVP.
- Advanced telemetry and deep control are integration-dependent and not universal.

See detailed docs:
- `docs/feature-matrix.md`
- `docs/demo-runbook.md`
- `docs/manual-test-checklist.md`

## 🏗️ Architecture
- **Frontend**: React, Zustand (State Management), Framer Motion (Animations), MapLibre (GPS).
- **Backend**: Node.js, Express, WebSocket (Live Pipeline), Google GenAI (Gemini).

---
*VeloVoice is 🏁 Production Ready.*
