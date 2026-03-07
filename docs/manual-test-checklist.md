# Manual Test Checklist

## Profile A: Adapter Absent
1. Launch app without OBD hardware.
2. Complete setup and choose `Start in Limited Mode`.
3. Confirm telemetry badge reads `Estimated` or `Demo`.
4. Trigger voice flow and verify navigation updates.
5. Confirm no unsupported controls appear interactive.

## Profile B: Adapter Present
1. Launch app with OBD adapter powered and discoverable.
2. Connect adapter in Setup or Settings.
3. Confirm telemetry badge reads `Live`.
4. Verify RPM/Speed/Coolant/Fuel values update.
5. Disconnect adapter and confirm stale/degraded state appears.

## Pitch reliability checks
1. Press `Run Demo Script` and verify staged UI sequence.
2. Confirm app remains usable if backend reconnects.
3. Confirm mobile/compact and wide display layouts remain readable.
