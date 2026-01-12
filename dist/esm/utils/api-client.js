import { mapHerokuError, mapNetworkError, mapStreamError, shouldRetryError, getRetryDelay, createValidationError, } from "./error-handling.js";
import { APICallError } from "@ai-sdk/provider";
/**
 * Default configuration for API requests
 */
const DEFAULT_OPTIONS = {
    maxRetries: 3,
    timeout: 30000, // 30 seconds
    stream: false,
    headers: {},
    abortSignal: undefined,
};
/**
 * Enhanced Heroku API client with comprehensive error handling and retry logic
 */
export async function makeHerokuRequest(url, apiKey, body, options = {}) {
    // Validate required parameters
    validateRequestParameters(url, apiKey, body);
    // Merge options with defaults
    const config = { ...DEFAULT_OPTIONS, ...options };
    let lastError = null;
    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
        try {
            return await executeRequest(url, apiKey, body, config, attempt);
        }
        catch (error) {
            lastError = error;
            // Don't retry on the last attempt
            if (attempt === config.maxRetries + 1) {
                break;
            }
            // Check if error should be retried
            if (error instanceof Error && "statusCode" in error) {
                const apiError = error;
                if (!shouldRetryError(apiError)) {
                    break;
                }
                // Calculate delay and wait before retry
                const delay = getRetryDelay(apiError, attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
            else {
                // For non-API errors, only retry network errors
                if (!isNetworkError(error)) {
                    break;
                }
                // Simple exponential backoff for network errors
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
    // If we get here, all retries failed
    throw lastError;
}
/**
 * Execute a single API request attempt
 */
async function executeRequest(url, apiKey, body, config, attempt) {
    const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Request-Attempt": attempt.toString(),
        ...config.headers,
    };
    // Check if already aborted before starting
    if (config.abortSignal?.aborted) {
        throw new APICallError({
            message: "Request was aborted",
            url,
            requestBodyValues: body,
            statusCode: 499,
        });
    }
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);
    // If an external signal is provided, abort our controller when it aborts
    const externalAbortHandler = () => controller.abort();
    config.abortSignal?.addEventListener("abort", externalAbortHandler);
    try {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        config.abortSignal?.removeEventListener("abort", externalAbortHandler);
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw mapHerokuError(response.status, errorData, url, body);
        }
        return config.stream ? response : await response.json();
    }
    catch (error) {
        clearTimeout(timeoutId);
        config.abortSignal?.removeEventListener("abort", externalAbortHandler);
        // Handle different types of errors
        if (error instanceof Error) {
            if (error.name === "AbortError") {
                // Check if it was an external abort or a timeout
                if (config.abortSignal?.aborted) {
                    throw new APICallError({
                        message: "Request was aborted",
                        url,
                        requestBodyValues: body,
                        statusCode: 499,
                    });
                }
                throw mapNetworkError(new Error(`Request timeout after ${config.timeout}ms`), url, body);
            }
            if (isNetworkError(error)) {
                throw mapNetworkError(error, url, body);
            }
        }
        // Re-throw API errors as-is
        throw error;
    }
}
/**
 * Validate request parameters
 */
function validateRequestParameters(url, apiKey, body) {
    if (!url || typeof url !== "string") {
        throw createValidationError("URL must be a non-empty string", "url", url);
    }
    if (!apiKey || typeof apiKey !== "string") {
        throw createValidationError("API key must be a non-empty string", "apiKey", "[REDACTED]");
    }
    if (!body || typeof body !== "object") {
        throw createValidationError("Request body must be an object", "body", body);
    }
    // Validate URL format
    try {
        new URL(url);
    }
    catch {
        throw createValidationError("URL must be a valid URL format", "url", url);
    }
}
/**
 * Check if an error is a network-related error
 */
function isNetworkError(error) {
    const networkErrorPatterns = [
        "fetch",
        "network",
        "timeout",
        "connection",
        "econnrefused",
        "enotfound",
        "dns",
        "socket",
    ];
    const errorMessage = error.message.toLowerCase();
    return networkErrorPatterns.some((pattern) => errorMessage.includes(pattern));
}
/**
 * Enhanced SSE stream handling with comprehensive error handling
 */
export function processHerokuStream(response, url = "") {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    return new ReadableStream({
        async start(controller) {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";
                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine)
                            continue;
                        if (trimmedLine.startsWith("data:")) {
                            const data = trimmedLine.slice(5).trim();
                            if (data === "[DONE]") {
                                controller.close();
                                return;
                            }
                            try {
                                const parsed = JSON.parse(data);
                                controller.enqueue(parsed);
                            }
                            catch (parseError) {
                                // Log parsing errors but continue processing
                                console.warn("Error parsing SSE data:", parseError, "Data:", data);
                                // Enqueue a partial error response to maintain stream continuity
                                controller.enqueue({
                                    error: {
                                        type: "parse_error",
                                        message: "Failed to parse streaming response",
                                        data: data,
                                    },
                                });
                            }
                        }
                    }
                }
                // Process any remaining data in the buffer
                if (buffer.trim()) {
                    const trimmedBuffer = buffer.trim();
                    if (trimmedBuffer.startsWith("data:")) {
                        const data = trimmedBuffer.slice(5).trim();
                        if (data !== "[DONE]") {
                            try {
                                const parsed = JSON.parse(data);
                                controller.enqueue(parsed);
                            }
                            catch (parseError) {
                                console.warn("Error parsing final SSE data:", parseError, "Data:", data);
                            }
                        }
                    }
                }
                controller.close();
            }
            catch (streamError) {
                // Map stream errors to our error handling system
                const mappedError = mapStreamError(streamError, url);
                controller.error(mappedError);
            }
        },
    });
}
/**
 * Create a streaming request with enhanced error handling
 */
export async function makeHerokuStreamRequest(url, apiKey, body, options = {}) {
    const streamOptions = { ...options, stream: true };
    try {
        const response = (await makeHerokuRequest(url, apiKey, body, streamOptions));
        return processHerokuStream(response, url);
    }
    catch (error) {
        // Ensure streaming errors are properly mapped
        if (error instanceof Error && !("statusCode" in error)) {
            throw mapStreamError(error, url);
        }
        throw error;
    }
}
/**
 * Utility function to check if a response indicates a rate limit
 */
export function isRateLimited(error) {
    return (error?.statusCode === 429 ||
        error?.data?.errorType === "RATE_LIMIT_EXCEEDED");
}
/**
 * Utility function to extract retry-after header value
 */
export function getRetryAfterDelay(error) {
    const retryAfter = error?.responseHeaders?.["retry-after"] ||
        error?.responseHeaders?.["Retry-After"];
    if (retryAfter) {
        const delay = parseInt(retryAfter, 10);
        return isNaN(delay) ? null : delay * 1000; // Convert to milliseconds
    }
    return null;
}
//# sourceMappingURL=api-client.js.map