import {
    MAX_TRANSCRIPT_CHARS,
    checkAndTrackRateLimit,
    sanitizeLanguage,
    sanitizePersona,
    sanitizeTranscript,
    sanitizeType
} from '../wsGuards.js';

describe('WS input validation guards', () => {
    test('accepts only supported message types', () => {
        expect(sanitizeType('transcript')).toBe('transcript');
        expect(sanitizeType('unsupported')).toBeNull();
        expect(sanitizeType(null)).toBeNull();
    });

    test('falls back invalid persona and language', () => {
        expect(sanitizePersona('KITT', 'Samantha')).toBe('KITT');
        expect(sanitizePersona('HAL9000', 'Samantha')).toBe('Samantha');

        expect(sanitizeLanguage('de-DE', 'en-US')).toBe('de-DE');
        expect(sanitizeLanguage('de_de', 'en-US')).toBe('en-US');
    });

    test('rejects empty transcript and truncates long transcript', () => {
        expect(sanitizeTranscript('   ')).toBeNull();

        const longText = 'x'.repeat(MAX_TRANSCRIPT_CHARS + 30);
        const out = sanitizeTranscript(longText);
        expect(out).toHaveLength(MAX_TRANSCRIPT_CHARS);
    });
});

describe('WS rate limit guard', () => {
    test('rate limits once max messages in the current window is reached', () => {
        const window = [];
        const now = 1_000_000;

        expect(checkAndTrackRateLimit(window, now, 2, 60_000)).toBe(false);
        expect(checkAndTrackRateLimit(window, now + 1000, 2, 60_000)).toBe(false);
        expect(checkAndTrackRateLimit(window, now + 2000, 2, 60_000)).toBe(true);
    });

    test('evicts stale entries before checking limit', () => {
        const window = [10_000, 12_000];
        const isLimited = checkAndTrackRateLimit(window, 80_500, 2, 60_000);

        expect(isLimited).toBe(false);
        expect(window).toEqual([80_500]);
    });
});
