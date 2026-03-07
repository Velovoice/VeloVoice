# Feature Availability Matrix

This matrix defines what works across connectivity modes.

| Capability | Limited Mode (No OBD) | Demo Mode | OBD Connected |
|---|---|---|---|
| Voice assistant | Yes | Yes | Yes |
| Navigation handoff | Yes | Yes | Yes |
| Media card and playback UI | Yes | Yes | Yes |
| Telemetry source badge | Estimated | Demo | Live |
| Live RPM/Speed/Coolant/Fuel | No | Simulated | Yes |
| Vehicle health alerts from live data | No | Simulated | Yes |
| Deep car controls | Model-dependent | Model-dependent | Model-dependent |

## Android Auto boundary
- Android Auto in MVP is positioned as projection UX for voice, navigation, and media.
- Advanced telemetry and deep control remain tied to OBD/OEM channels and are not universally available via Android Auto alone.
