export const VALID_PERSONAS = new Set(['Samantha', 'Jarvis', 'KITT']);
export const VALID_TYPES = new Set(['persona_sync', 'transcript', 'telemetry', 'telemetry_response']);
export const VALID_LANG_RE = /^[a-z]{2}-[A-Z]{2}$/;
export const MAX_TRANSCRIPT_CHARS = 500;
export const MAX_WS_MESSAGES_PER_MIN = 40;

export function sanitizePersona(value, fallback = 'Samantha') {
    if (typeof value !== 'string') {
        return fallback;
    }
    return VALID_PERSONAS.has(value) ? value : fallback;
}

export function sanitizeLanguage(value, fallback = 'en-US') {
    if (typeof value !== 'string') {
        return fallback;
    }
    return VALID_LANG_RE.test(value) ? value : fallback;
}

export function sanitizeType(value) {
    if (typeof value !== 'string') {
        return null;
    }
    return VALID_TYPES.has(value) ? value : null;
}

export function sanitizeTranscript(text, maxChars = MAX_TRANSCRIPT_CHARS) {
    if (typeof text !== 'string') {
        return null;
    }

    const trimmed = text.trim();
    if (!trimmed) {
        return null;
    }

    return trimmed.slice(0, maxChars);
}

export function checkAndTrackRateLimit(messageWindow, now, maxMessages = MAX_WS_MESSAGES_PER_MIN, windowMs = 60000) {
    while (messageWindow.length && now - messageWindow[0] > windowMs) {
        messageWindow.shift();
    }

    if (messageWindow.length >= maxMessages) {
        return true;
    }

    messageWindow.push(now);
    return false;
}
