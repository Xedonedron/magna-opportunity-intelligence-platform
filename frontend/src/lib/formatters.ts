/**
 * Formatting utilities for human-readable durations and rate limit error messages.
 */

/**
 * Converts total seconds into natural Indonesian duration string.
 * Examples:
 *   19623 -> "5 jam 27 menit 3 detik"
 *   52927 -> "14 jam 42 menit 7 detik"
 *   65    -> "1 menit 5 detik"
 *   3600  -> "1 jam"
 *   0     -> "0 detik"
 */
export function formatDurationHuman(totalSeconds: number): string {
    const sec = Math.max(0, Math.round(totalSeconds));
    if (sec === 0) return "0 detik";

    const days = Math.floor(sec / 86400);
    const rem1 = sec % 86400;
    const hours = Math.floor(rem1 / 3600);
    const rem2 = rem1 % 3600;
    const minutes = Math.floor(rem2 / 60);
    const seconds = rem2 % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} hari`);
    if (hours > 0) parts.push(`${hours} jam`);
    if (minutes > 0) parts.push(`${minutes} menit`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} detik`);

    return parts.join(" ");
}

/**
 * Extracts rate limit wait seconds from a raw message or response object.
 */
export function extractRateLimitSeconds(raw: unknown): number | null {
    if (!raw) return null;

    if (typeof raw === "number") {
        return raw > 0 ? raw : null;
    }

    if (typeof raw === "object") {
        const obj = raw as Record<string, any>;
        if (typeof obj.rate_limit_reset_seconds === "number") {
            return obj.rate_limit_reset_seconds;
        }
        if (typeof obj.retry_after === "number") {
            return obj.retry_after;
        }
        if (obj.details && typeof obj.details.retry_after === "number") {
            return obj.details.retry_after;
        }
        if (typeof obj.message === "string") {
            return extractRateLimitSeconds(obj.message);
        }
        if (typeof obj.detail === "string") {
            return extractRateLimitSeconds(obj.detail);
        }
        if (typeof obj.error === "string") {
            return extractRateLimitSeconds(obj.error);
        }
    }

    if (typeof raw === "string") {
        // Pattern 1: Reset in X seconds
        const matchSec = raw.match(/reset\s+in\s+(\d+)\s*(?:seconds?|detik)/i);
        if (matchSec) return parseInt(matchSec[1], 10);

        // Pattern 2: (try again|retry after|wait) in/after X seconds
        const matchWait = raw.match(/(?:retry\s+after|try\s+again\s+in|wait\s+for|in)\s+(\d+)\s*(?:seconds?|detik)/i);
        if (matchWait) return parseInt(matchWait[1], 10);

        // Pattern 3: Reset in X minutes
        const matchMin = raw.match(/reset\s+in\s+(\d+)\s*(?:minutes?|menit)/i);
        if (matchMin) return parseInt(matchMin[1], 10) * 60;

        // Pattern 4: Standalone X seconds in a rate limit context
        if (/rate\s*limit|quota|tercapai|exceeded/i.test(raw)) {
            const matchAnySec = raw.match(/(\d+)\s*(?:seconds?|detik)/i);
            if (matchAnySec) return parseInt(matchAnySec[1], 10);
            const matchAnyMin = raw.match(/(\d+)\s*(?:minutes?|menit)/i);
            if (matchAnyMin) return parseInt(matchAnyMin[1], 10) * 60;
        }
    }

    return null;
}

/**
 * Humanizes rate limit error messages into clear, Indonesian natural language
 * with precise duration (e.g., "5 jam 27 menit 3 detik").
 */
export function humanizeRateLimitMessage(
    rawMessage: string,
    defaultResetSeconds?: number
): string {
    if (!rawMessage || typeof rawMessage !== "string") {
        const dur = defaultResetSeconds ? formatDurationHuman(defaultResetSeconds) : "beberapa saat";
        return `Batas kuota panggilan API tercapai. Kuota akan di-reset dalam ${dur}.`;
    }

    let text = rawMessage.trim();

    // 1. Replace "Reset in X seconds"
    text = text.replace(
        /reset\s+in\s+(\d+)\s*(?:seconds?|detik)[.]?/gi,
        (_, s) => `Reset dalam ${formatDurationHuman(parseInt(s, 10))}`
    );

    // 2. Replace "Reset in X minutes"
    text = text.replace(
        /reset\s+in\s+(\d+)\s*(?:minutes?|menit)[.]?/gi,
        (_, m) => `Reset dalam ${formatDurationHuman(parseInt(m, 10) * 60)}`
    );

    // 3. Replace "try again in X seconds" / "retry after X seconds"
    text = text.replace(
        /(?:try\s+again\s+in|retry\s+after|wait\s+for)\s+(\d+)\s*(?:seconds?|detik)[.]?/gi,
        (_, s) => `silakan coba lagi dalam ${formatDurationHuman(parseInt(s, 10))}`
    );

    // 4. If raw contains minutes >= 60 in limit context, convert to hours & minutes
    text = text.replace(
        /(?:dalam|in|tunggu)\s+(\d+)\s*(?:minutes?|menit)[.]?/gi,
        (orig, m) => {
            const mins = parseInt(m, 10);
            if (mins >= 60) {
                return `dalam ${formatDurationHuman(mins * 60)}`;
            }
            return orig;
        }
    );

    // 5. Special translation for Lusha standard daily limit message
    if (/Daily API rate limit exceeded/i.test(text)) {
        const limitMatch = text.match(/Limit:\s*(\d+)\s*calls\s*per\s*day/i);
        const limitStr = limitMatch ? ` Maksimal ${limitMatch[1]} panggilan per hari.` : "";
        text = text.replace(
            /Daily API rate limit exceeded[.]?(?:\s*Limit:\s*\d+\s*calls\s*per\s*day[.]?)?/i,
            `Batas kuota harian API Lusha tercapai.${limitStr}`
        );
    }

    // 6. Generic rate limit exceeded translation if still in English
    text = text.replace(/API rate limit exceeded/gi, "Batas pemanggilan API tercapai");
    text = text.replace(/Rate limit exceeded/gi, "Batas kuota pemanggilan tercapai");

    // 7. If text mentions rate limit but has no duration and default is provided
    if (defaultResetSeconds && !text.includes("detik") && !text.includes("menit") && !text.includes("jam")) {
        text += ` Kuota akan di-reset dalam ${formatDurationHuman(defaultResetSeconds)}.`;
    }

    return text.replace(/\s{2,}/g, " ").trim();
}
