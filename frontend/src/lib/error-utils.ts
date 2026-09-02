/**
 * Error handling utilities for the frontend.
 * Provides structured error parsing and user-friendly messages.
 */

import { AxiosError } from "axios";

/**
 * API error response structure from backend.
 */
export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details: Record<string, unknown>;
    };
}

/**
 * Parsed error for display.
 */
export interface ParsedError {
    code: string;
    message: string;
    details: Record<string, unknown>;
    isNetworkError: boolean;
    isAuthError: boolean;
}

/**
 * Error code to user-friendly message mapping.
 */
const ERROR_MESSAGES: Record<string, string> = {
    NOT_FOUND: "The requested resource was not found.",
    VALIDATION_ERROR: "Please check your input and try again.",
    UNAUTHORIZED: "Please log in to continue.",
    FORBIDDEN: "You don't have permission to perform this action.",
    CONFLICT: "This resource already exists or conflicts with existing data.",
    KYC_PIPELINE_ERROR: "Failed to generate KYC report. Please try again.",
    EXTERNAL_SERVICE_ERROR: "A service is temporarily unavailable. Please try again later.",
    RATE_LIMIT_EXCEEDED: "Too many requests. Please wait a moment and try again.",
    INTERNAL_ERROR: "An unexpected error occurred. Please try again.",
};

/**
 * Parse an error from API or network into a structured format.
 */
export function parseError(error: unknown): ParsedError {
    // Handle Axios errors
    if (error instanceof AxiosError) {
        const response = error.response?.data as ApiErrorResponse | undefined;

        if (response?.error) {
            return {
                code: response.error.code,
                message: response.error.message || ERROR_MESSAGES[response.error.code] || "An error occurred.",
                details: response.error.details,
                isNetworkError: false,
                isAuthError: response.error.code === "UNAUTHORIZED",
            };
        }

        // Network error (no response)
        if (!error.response) {
            return {
                code: "NETWORK_ERROR",
                message: "Unable to connect to the server. Please check your connection.",
                details: {},
                isNetworkError: true,
                isAuthError: false,
            };
        }

        // HTTP status-based errors
        const status = error.response.status;
        if (status === 401) {
            return {
                code: "UNAUTHORIZED",
                message: "Your session has expired. Please log in again.",
                details: {},
                isNetworkError: false,
                isAuthError: true,
            };
        }

        if (status === 403) {
            return {
                code: "FORBIDDEN",
                message: "You don't have permission to perform this action.",
                details: {},
                isNetworkError: false,
                isAuthError: false,
            };
        }

        if (status === 404) {
            return {
                code: "NOT_FOUND",
                message: "The requested resource was not found.",
                details: {},
                isNetworkError: false,
                isAuthError: false,
            };
        }

        if (status >= 500) {
            return {
                code: "SERVER_ERROR",
                message: "A server error occurred. Please try again later.",
                details: {},
                isNetworkError: false,
                isAuthError: false,
            };
        }
    }

    // Handle standard errors
    if (error instanceof Error) {
        return {
            code: "ERROR",
            message: error.message || "An unexpected error occurred.",
            details: {},
            isNetworkError: false,
            isAuthError: false,
        };
    }

    // Unknown error type
    return {
        code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred.",
        details: {},
        isNetworkError: false,
        isAuthError: false,
    };
}

/**
 * Pipeline & AI error details interface for user-friendly display.
 */
export interface PipelineErrorDetails {
    title: string;
    summary: string;
    suggestion: string;
    rawDetails: string;
    errorCategory:
        | "UNKNOWN_MODEL"
        | "AUTH_ERROR"
        | "RATE_LIMIT"
        | "TIMEOUT"
        | "PARSING_ERROR"
        | "NO_KEY"
        | "SAFETY_BLOCK"
        | "GENERAL";
    statusCode?: number;
}

/**
 * Parse raw AI/Pipeline error messages into readable summaries and actionable suggestions.
 */
export function parsePipelineError(
    rawError: string | null | undefined,
    lang: "id" | "en" = "id"
): PipelineErrorDetails {
    const raw = (rawError || "").trim();
    if (!raw) {
        return {
            title: lang === "id" ? "Terjadi Kesalahan Tidak Terduga" : "Unexpected Error Occurred",
            summary:
                lang === "id"
                    ? "Proses analisis AI tidak dapat diselesaikan."
                    : "The AI analysis process could not be completed.",
            suggestion:
                lang === "id"
                    ? "Silakan coba klik tombol 'Retry' untuk menjalankan analisis ulang."
                    : "Please click 'Retry' to run the analysis again.",
            rawDetails: "Unknown pipeline error with no detail provided.",
            errorCategory: "GENERAL",
        };
    }

    const rawLower = raw.toLowerCase();

    // 1. Unknown Model / Model Not Found
    if (
        rawLower.includes("unknown model") ||
        rawLower.includes("model_not_found") ||
        rawLower.includes("does not exist") ||
        rawLower.includes("not found on this endpoint")
    ) {
        const modelMatch = raw.match(/model\s+['"]?([^'"\s,\.]+)['"]?/i);
        const modelName = modelMatch ? `'${modelMatch[1]}'` : "yang dipilih";

        return {
            title: lang === "id" ? "Model AI Tidak Dikenali" : "Unknown AI Model",
            summary:
                lang === "id"
                    ? `Model AI ${modelName} tidak tersedia atau tidak didukung oleh provider yang aktif.`
                    : `The configured AI model ${modelName} is not recognized or supported by the active provider.`,
            suggestion:
                lang === "id"
                    ? "Buka menu Settings ➔ AI & Pipeline untuk memilih model yang valid (misal: Gemma 4, Gemini, atau DeepSeek/GLM yang aktif), lalu coba lagi."
                    : "Go to Settings ➔ AI & Pipeline to select a valid model, then retry.",
            rawDetails: raw,
            errorCategory: "UNKNOWN_MODEL",
            statusCode: 400,
        };
    }

    // 2. No API Key Configured
    if (rawLower.includes("no llm api key") || rawLower.includes("missing api key")) {
        return {
            title: lang === "id" ? "API Key Belum Dikonfigurasi" : "API Key Missing",
            summary:
                lang === "id"
                    ? "Sistem belum memiliki Google AI Studio atau OpenAI API Key yang aktif untuk menjalankan analisis AI."
                    : "No active Google AI Studio or OpenAI API Key is configured in the system.",
            suggestion:
                lang === "id"
                    ? "Silakan hubungi Superadmin untuk mengonfigurasi API Key di menu Settings ➔ AI & Pipeline."
                    : "Please contact a Superadmin to configure the API Key under Settings ➔ AI & Pipeline.",
            rawDetails: raw,
            errorCategory: "NO_KEY",
            statusCode: 401,
        };
    }

    // 3. Authentication / Invalid API Key
    if (
        rawLower.includes("401") ||
        rawLower.includes("unauthorized") ||
        rawLower.includes("invalid_api_key") ||
        rawLower.includes("incorrect api key") ||
        rawLower.includes("api_key_invalid") ||
        rawLower.includes("permission_denied")
    ) {
        return {
            title: lang === "id" ? "Autentikasi API Key Gagal" : "API Authentication Failed",
            summary:
                lang === "id"
                    ? "Kunci API (API Key) yang dikonfigurasi tidak valid, kedaluwarsa, atau tidak memiliki izin akses."
                    : "The configured API Key is invalid, expired, or lacks proper permissions.",
            suggestion:
                lang === "id"
                    ? "Periksa dan perbarui API Key yang valid di menu Settings ➔ AI & Pipeline."
                    : "Check and update your API Key under Settings ➔ AI & Pipeline.",
            rawDetails: raw,
            errorCategory: "AUTH_ERROR",
            statusCode: 401,
        };
    }

    // 4. Rate Limit / Quota Exceeded
    if (
        rawLower.includes("429") ||
        rawLower.includes("ratelimit") ||
        rawLower.includes("rate limit") ||
        rawLower.includes("quota") ||
        rawLower.includes("resourceexhausted") ||
        rawLower.includes("insufficient_quota")
    ) {
        return {
            title: lang === "id" ? "Batas Kuota / Rate Limit Tercapai" : "Rate Limit or Quota Exceeded",
            summary:
                lang === "id"
                    ? "Batas pemanggilan per menit (RPM) atau kuota kredit API pada provider telah habis."
                    : "Request limit per minute or provider credit quota has been reached.",
            suggestion:
                lang === "id"
                    ? "Tunggu 1-2 menit sebelum mencoba kembali, atau periksa kuota billing akun provider AI Anda."
                    : "Wait a moment before retrying or check your AI provider billing quota.",
            rawDetails: raw,
            errorCategory: "RATE_LIMIT",
            statusCode: 429,
        };
    }

    // 5. Connection Timeout / Network Errors
    if (
        rawLower.includes("timeout") ||
        rawLower.includes("connection refused") ||
        rawLower.includes("connecterror") ||
        rawLower.includes("networkerror") ||
        rawLower.includes("remotedisconnected") ||
        rawLower.includes("sslerror") ||
        rawLower.includes("502") ||
        rawLower.includes("503") ||
        rawLower.includes("504")
    ) {
        return {
            title: lang === "id" ? "Koneksi ke Layanan AI Terputus" : "AI Service Connection Timeout",
            summary:
                lang === "id"
                    ? "Sistem gagal tersambung ke endpoint AI karena kendala jaringan atau server sedang sibuk."
                    : "Failed to connect to the AI endpoint due to network latency or upstream downtime.",
            suggestion:
                lang === "id"
                    ? "Pastikan koneksi server stabil dan klik 'Retry' beberapa saat lagi."
                    : "Ensure network connectivity is stable and click 'Retry' shortly.",
            rawDetails: raw,
            errorCategory: "TIMEOUT",
            statusCode: 504,
        };
    }

    // 6. JSON Parse / Output Truncation
    if (
        rawLower.includes("jsondecodeerror") ||
        rawLower.includes("failed to parse ai response") ||
        rawLower.includes("unterminated string") ||
        rawLower.includes("empty response")
    ) {
        return {
            title: lang === "id" ? "Gagal Memproses Struktur Data AI" : "AI Response Formatting Error",
            summary:
                lang === "id"
                    ? "Model AI mengembalikan format respon yang tidak lengkap atau terpotong sebelum selesai."
                    : "The AI model returned an incomplete or truncated JSON structure.",
            suggestion:
                lang === "id"
                    ? "Klik 'Retry' untuk memicu generasi ulang dengan parsing otomatis."
                    : "Click 'Retry' to re-run the structured generation.",
            rawDetails: raw,
            errorCategory: "PARSING_ERROR",
        };
    }

    // 7. Safety / Content Filter
    if (
        rawLower.includes("safety") ||
        rawLower.includes("blocked") ||
        rawLower.includes("content_filter") ||
        rawLower.includes("harmful")
    ) {
        return {
            title: lang === "id" ? "Peringatan Filter Konten AI" : "AI Safety Policy Block",
            summary:
                lang === "id"
                    ? "Permintaan analisis dibatasi oleh filter keamanan konten (safety policy) provider AI."
                    : "The request was blocked by the AI provider's automated safety filter.",
            suggestion:
                lang === "id"
                    ? "Periksa kembali catatan kebutuhan klien agar tidak mengandung kata-kata sensitif."
                    : "Review the input notes to ensure they comply with content guidelines.",
            rawDetails: raw,
            errorCategory: "SAFETY_BLOCK",
        };
    }

    // 8. General AI / Pipeline Error Fallback
    // Clean up "AI analysis failed:" or "Error code:" prefix for cleaner display
    let cleanSummary = raw.replace(/^AI analysis failed:\s*/i, "").trim();
    if (cleanSummary.length > 150) {
        cleanSummary = cleanSummary.substring(0, 147) + "...";
    }

    return {
        title: lang === "id" ? "Analisis AI Mengalami Kendala" : "AI Analysis Encountered an Error",
        summary:
            lang === "id"
                ? `Terjadi kendala saat memproses laporan intelijen: ${cleanSummary}`
                : `An error occurred while processing intelligence: ${cleanSummary}`,
        suggestion:
            lang === "id"
                ? "Silakan coba klik 'Retry' atau periksa detail teknis di bawah jika masalah berlanjut."
                : "Please click 'Retry' or inspect technical details below if the problem persists.",
        rawDetails: raw,
        errorCategory: "GENERAL",
    };
}

/**
 * Get a user-friendly error message.
 */
export function getErrorMessage(error: unknown): string {
    return parseError(error).message;
}

/**
 * Check if error is an authentication error.
 */
export function isAuthError(error: unknown): boolean {
    return parseError(error).isAuthError;
}

/**
 * Check if error is a network error.
 */
export function isNetworkError(error: unknown): boolean {
    return parseError(error).isNetworkError;
}

/**
 * Log error to console with context.
 */
export function logError(error: unknown, context?: string): void {
    const parsed = parseError(error);
    console.error(
        `[Error${context ? ` - ${context}` : ""}]`,
        parsed.code,
        parsed.message,
        parsed.details
    );
}