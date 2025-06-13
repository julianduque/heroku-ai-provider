"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapHerokuError = mapHerokuError;
exports.createUserFriendlyErrorMessage = createUserFriendlyErrorMessage;
exports.shouldRetryError = shouldRetryError;
exports.getRetryDelay = getRetryDelay;
exports.mapNetworkError = mapNetworkError;
exports.mapStreamError = mapStreamError;
exports.createValidationError = createValidationError;
const provider_1 = require("@ai-sdk/provider");
const error_types_js_1 = require('./error-types.cjs');
/**
 * Enhanced error mapping function that provides comprehensive error handling
 * for all possible Heroku API error scenarios
 */
function mapHerokuError(status, errorData, url = "", requestBody = {}) {
    // Determine the error type based on status code
    const errorType = error_types_js_1.HTTP_STATUS_TO_ERROR_TYPE[status] || error_types_js_1.HerokuErrorType.UNKNOWN_ERROR;
    const metadata = (0, error_types_js_1.getErrorMetadata)(errorType);
    // Extract error details from response
    const errorResponse = parseErrorResponse(errorData);
    const errorMessage = extractErrorMessage(errorResponse, metadata);
    // Create enhanced error context
    const errorContext = createErrorContext(status, errorResponse, metadata, url, requestBody);
    return new provider_1.APICallError({
        message: errorMessage,
        url,
        requestBodyValues: requestBody,
        statusCode: status,
        responseBody: JSON.stringify(errorData),
        cause: errorData,
        // Add custom properties for enhanced error handling
        ...errorContext,
    });
}
/**
 * Parse the error response into a structured format
 */
function parseErrorResponse(errorData) {
    if (!errorData || typeof errorData !== "object") {
        return { message: "Unknown error" };
    }
    const data = errorData;
    // Handle different error response formats
    if (data.error && typeof data.error === "object") {
        const error = data.error;
        return {
            error: {
                message: typeof error.message === "string" ? error.message : undefined,
                type: typeof error.type === "string" ? error.type : undefined,
                code: typeof error.code === "string" ? error.code : undefined,
                details: error.details || undefined,
            },
            message: typeof data.message === "string" ? data.message : undefined,
            code: typeof data.code === "string" ? data.code : undefined,
            status: typeof data.status === "number" ? data.status : undefined,
        };
    }
    return {
        message: typeof data.message === "string" ? data.message : "Unknown error",
        code: typeof data.code === "string" ? data.code : undefined,
        status: typeof data.status === "number" ? data.status : undefined,
    };
}
/**
 * Extract a meaningful error message from the response and metadata
 */
function extractErrorMessage(errorResponse, metadata) {
    // Priority order for error messages:
    // 1. Specific error message from API response
    // 2. General message from API response
    // 3. User-friendly message from metadata
    // 4. Technical message from metadata
    const apiErrorMessage = errorResponse.error?.message || errorResponse.message;
    if (apiErrorMessage && apiErrorMessage.trim()) {
        return `${metadata.userMessage} Details: ${apiErrorMessage}`;
    }
    return metadata.userMessage;
}
/**
 * Create enhanced error context with additional debugging information
 */
function createErrorContext(status, errorResponse, metadata, url, _requestBody) {
    return {
        // Error classification
        errorType: metadata.type,
        errorSeverity: metadata.severity,
        errorCategory: metadata.category,
        isRetryable: metadata.retryable,
        // Recovery information
        recoverySuggestions: metadata.recoverySuggestions,
        technicalMessage: metadata.technicalMessage,
        documentationUrl: metadata.documentationUrl,
        // Request context
        httpStatus: status,
        endpoint: url,
        requestTimestamp: new Date().toISOString(),
        // Error details
        errorCode: errorResponse.error?.code || errorResponse.code,
        errorType_api: errorResponse.error?.type,
        errorDetails: errorResponse.error?.details,
    };
}
/**
 * Create user-friendly error messages with recovery suggestions
 */
function createUserFriendlyErrorMessage(error) {
    const errorData = error.data;
    const errorType = errorData?.errorType;
    if (!errorType) {
        return error.message;
    }
    const metadata = (0, error_types_js_1.getErrorMetadata)(errorType);
    const suggestions = metadata.recoverySuggestions;
    let message = metadata.userMessage;
    if (suggestions.length > 0) {
        message += "\n\nSuggested actions:";
        suggestions.forEach((suggestion, index) => {
            message += `\n${index + 1}. ${suggestion}`;
        });
    }
    if (metadata.documentationUrl) {
        message += `\n\nFor more information, see: ${metadata.documentationUrl}`;
    }
    return message;
}
/**
 * Determine if an error should be retried based on error type and metadata
 */
function shouldRetryError(error) {
    const errorData = error.data;
    const errorType = errorData?.errorType;
    // Check if isRetryable is already set on the error
    if (typeof error.isRetryable === "boolean") {
        return error.isRetryable;
    }
    if (errorType) {
        const metadata = (0, error_types_js_1.getErrorMetadata)(errorType);
        return metadata.retryable;
    }
    // Default retry logic for common HTTP status codes
    const status = error.statusCode;
    if (status) {
        // Retry on server errors and some client errors
        return status >= 500 || status === 429 || status === 408;
    }
    return false;
}
/**
 * Get retry delay based on error type and attempt number
 */
function getRetryDelay(error, attemptNumber) {
    const errorData = error.data;
    const errorType = errorData?.errorType;
    // Base delay in milliseconds
    let baseDelay = 1000;
    // Adjust base delay based on error type
    if (errorType === error_types_js_1.HerokuErrorType.RATE_LIMIT_EXCEEDED) {
        baseDelay = 5000; // Longer delay for rate limits
    }
    else if (errorType === error_types_js_1.HerokuErrorType.SERVER_ERROR) {
        baseDelay = 2000; // Medium delay for server errors
    }
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
}
/**
 * Enhanced network error handling for fetch failures
 */
function mapNetworkError(error, url, requestBody) {
    let errorType = error_types_js_1.HerokuErrorType.NETWORK_ERROR;
    // Classify network errors based on error message
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes("timeout")) {
        errorType = error_types_js_1.HerokuErrorType.CONNECTION_TIMEOUT;
    }
    else if (errorMessage.includes("refused") ||
        errorMessage.includes("econnrefused")) {
        errorType = error_types_js_1.HerokuErrorType.CONNECTION_REFUSED;
    }
    else if (errorMessage.includes("dns") ||
        errorMessage.includes("getaddrinfo")) {
        errorType = error_types_js_1.HerokuErrorType.DNS_RESOLUTION_ERROR;
    }
    const metadata = (0, error_types_js_1.getErrorMetadata)(errorType);
    return new provider_1.APICallError({
        message: `${metadata.userMessage} Original error: ${error.message}`,
        url,
        requestBodyValues: requestBody,
        statusCode: 0, // No HTTP status for network errors
        responseBody: "",
        cause: error,
        isRetryable: metadata.retryable,
        // Enhanced context stored in data property
        data: {
            errorType,
            errorSeverity: metadata.severity,
            errorCategory: metadata.category,
            recoverySuggestions: metadata.recoverySuggestions,
            technicalMessage: metadata.technicalMessage,
            requestTimestamp: new Date().toISOString(),
        },
    });
}
/**
 * Validate and enhance streaming errors
 */
function mapStreamError(error, url) {
    const metadata = (0, error_types_js_1.getErrorMetadata)(error_types_js_1.HerokuErrorType.STREAM_ERROR);
    return new provider_1.APICallError({
        message: `${metadata.userMessage} Stream error: ${error.message}`,
        url,
        requestBodyValues: {},
        statusCode: 0,
        responseBody: "",
        cause: error,
        isRetryable: metadata.retryable,
        data: {
            errorType: error_types_js_1.HerokuErrorType.STREAM_ERROR,
            errorSeverity: metadata.severity,
            errorCategory: metadata.category,
            recoverySuggestions: metadata.recoverySuggestions,
            technicalMessage: metadata.technicalMessage,
            requestTimestamp: new Date().toISOString(),
        },
    });
}
/**
 * Create validation errors for invalid parameters
 */
function createValidationError(message, parameterName, parameterValue) {
    const errorType = parameterName
        ? error_types_js_1.HerokuErrorType.MISSING_REQUIRED_PARAMETER
        : error_types_js_1.HerokuErrorType.INVALID_PARAMETERS;
    const metadata = (0, error_types_js_1.getErrorMetadata)(errorType);
    const enhancedMessage = parameterName
        ? `${metadata.userMessage} Parameter '${parameterName}' is invalid.`
        : metadata.userMessage;
    return new provider_1.APICallError({
        message: `${enhancedMessage} ${message}`,
        url: "",
        requestBodyValues: parameterName ? { [parameterName]: parameterValue } : {},
        statusCode: 400,
        responseBody: "",
        isRetryable: metadata.retryable,
        data: {
            errorType,
            errorSeverity: metadata.severity,
            errorCategory: metadata.category,
            recoverySuggestions: metadata.recoverySuggestions,
            technicalMessage: metadata.technicalMessage,
            requestTimestamp: new Date().toISOString(),
        },
    });
}
//# sourceMappingURL=error-handling.js.map