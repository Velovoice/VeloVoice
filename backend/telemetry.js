export function normalizeTelemetryPayload(data) {
    const payload = data?.data || data;
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const rpm = Number(payload.rpm);
    const battery = Number(payload.battery);
    const speed = Number(payload.speed);

    const safeRpm = Number.isFinite(rpm) ? Math.max(0, rpm) : 0;
    const safeBattery = Number.isFinite(battery) ? Math.min(100, Math.max(0, battery)) : 0;
    const safeSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 0;

    return {
        ...payload,
        rpm: safeRpm,
        battery: safeBattery,
        speed: safeSpeed
    };
}
