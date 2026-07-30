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