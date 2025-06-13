"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserFriendlyError = createUserFriendlyError;
exports.formatUserFriendlyError = formatUserFriendlyError;
exports.createSimpleErrorMessage = createSimpleErrorMessage;
exports.createDetailedErrorReport = createDetailedErrorReport;
exports.isConfigurationError = isConfigurationError;
exports.isTemporaryServiceError = isTemporaryServiceError;
exports.getContextualHelp = getContextualHelp;
const error_types_js_1 = require('./error-types.cjs');
/**
 * Create a user-friendly error message from an APICallError
 */
function createUserFriendlyError(error) {
    const errorData = error.data;
    const errorType = errorData?.errorType;
    if (!errorType) {
        return createGenericUserFriendlyError(error);
    }
    const metadata = (0, error_types_js_1.getErrorMetadata)(errorType);
    return {
        userMessage: metadata.userMessage,
        technicalDetails: `${metadata.technicalMessage}\n\nOriginal error: ${error.message}`,
        recoverySuggestions: metadata.recoverySuggestions,
        severity: metadata.severity,
        category: metadata.category,
        isRetryable: metadata.retryable,
        documentationUrl: metadata.documentationUrl,
        estimatedResolutionTime: getEstimatedResolutionTime(errorType, metadata.severity),
    };
}
/**
 * Create a generic user-friendly error for unknown error types
 */
function createGenericUserFriendlyError(error) {
    const statusCode = error.statusCode;
    // Determine category based on status code
    let category = error_types_js_1.ErrorCategory.CLIENT_ERROR;
    let severity = error_types_js_1.ErrorSeverity.MEDIUM;
    let userMessage = "An unexpected error occurred";
    let recoverySuggestions = [];
    if (statusCode) {
        if (statusCode >= 400 && statusCode < 500) {
            category = error_types_js_1.ErrorCategory.CLIENT_ERROR;
            severity = error_types_js_1.ErrorSeverity.MEDIUM;
            userMessage = "There was an issue with your request";
            recoverySuggestions = [
                "Check your request parameters and try again",
                "Verify your API key is valid and has the necessary permissions",
                "Review the API documentation for correct usage",
            ];
        }
        else if (statusCode >= 500) {
            category = error_types_js_1.ErrorCategory.SERVER_ERROR;
            severity = error_types_js_1.ErrorSeverity.HIGH;
            userMessage = "The service is temporarily unavailable";
            recoverySuggestions = [
                "Wait a few moments and try again",
                "Check the Heroku status page for service updates",
                "Contact support if the issue persists",
            ];
        }
    }
    return {
        userMessage,
        technicalDetails: `HTTP ${statusCode || "Unknown"}: ${error.message}`,
        recoverySuggestions,
        severity,
        category,
        isRetryable: statusCode ? statusCode >= 500 || statusCode === 429 : false,
        estimatedResolutionTime: getEstimatedResolutionTime(error_types_js_1.HerokuErrorType.UNKNOWN_ERROR, severity),
    };
}
/**
 * Get estimated resolution time based on error type and severity
 */
function getEstimatedResolutionTime(errorType, severity) {
    switch (severity) {
        case error_types_js_1.ErrorSeverity.LOW:
            return "1-5 minutes";
        case error_types_js_1.ErrorSeverity.MEDIUM:
            return "5-15 minutes";
        case error_types_js_1.ErrorSeverity.HIGH:
            return "15-60 minutes";
        case error_types_js_1.ErrorSeverity.CRITICAL:
            return "1-4 hours";
        default:
            return "Unknown";
    }
}
/**
 * Format a user-friendly error message for display
 */
function formatUserFriendlyError(userError) {
    let message = `❌ ${userError.userMessage}\n`;
    if (userError.severity === error_types_js_1.ErrorSeverity.CRITICAL) {
        message +=
            "🚨 This is a critical error that requires immediate attention.\n";
    }
    else if (userError.severity === error_types_js_1.ErrorSeverity.HIGH) {
        message += "⚠️ This is a high-priority error.\n";
    }
    message += `\n📋 What you can do:\n`;
    userError.recoverySuggestions.forEach((suggestion, index) => {
        message += `${index + 1}. ${suggestion}\n`;
    });
    if (userError.isRetryable) {
        message += `\n🔄 This error can be retried automatically.\n`;
    }
    if (userError.estimatedResolutionTime) {
        message += `⏱️ Estimated resolution time: ${userError.estimatedResolutionTime}\n`;
    }
    if (userError.documentationUrl) {
        message += `\n📖 For more information: ${userError.documentationUrl}\n`;
    }
    message += `\n🔧 Technical details:\n${userError.technicalDetails}`;
    return message;
}
/**
 * Create a simplified error message for end users (non-technical)
 */
function createSimpleErrorMessage(error) {
    const userError = createUserFriendlyError(error);
    let message = userError.userMessage;
    if (userError.recoverySuggestions.length > 0) {
        message += ` Try: ${userError.recoverySuggestions[0]}`;
    }
    if (userError.isRetryable) {
        message += " (This will be retried automatically)";
    }
    return message;
}
/**
 * Create a detailed error report for developers
 */
function createDetailedErrorReport(error) {
    const userError = createUserFriendlyError(error);
    let report = `=== ERROR REPORT ===\n`;
    report += `Timestamp: ${new Date().toISOString()}\n`;
    report += `Severity: ${userError.severity}\n`;
    report += `Category: ${userError.category}\n`;
    report += `Retryable: ${userError.isRetryable}\n`;
    report += `\nUser Message: ${userError.userMessage}\n`;
    report += `\nTechnical Details:\n${userError.technicalDetails}\n`;
    if (error.statusCode) {
        report += `\nHTTP Status: ${error.statusCode}\n`;
    }
    if (error.url) {
        report += `URL: ${error.url}\n`;
    }
    if (error.requestBodyValues &&
        Object.keys(error.requestBodyValues).length > 0) {
        report += `\nRequest Body: ${JSON.stringify(error.requestBodyValues, null, 2)}\n`;
    }
    if (error.responseBody) {
        report += `\nResponse Body: ${error.responseBody}\n`;
    }
    report += `\nRecovery Suggestions:\n`;
    userError.recoverySuggestions.forEach((suggestion, index) => {
        report += `${index + 1}. ${suggestion}\n`;
    });
    if (userError.documentationUrl) {
        report += `\nDocumentation: ${userError.documentationUrl}\n`;
    }
    report += `\n=== END REPORT ===`;
    return report;
}
/**
 * Check if an error indicates a configuration issue
 */
function isConfigurationError(error) {
    const errorData = error.data;
    const errorType = errorData?.errorType;
    if (!errorType) {
        return false;
    }
    const configurationErrors = [
        error_types_js_1.HerokuErrorType.AUTHENTICATION_ERROR,
        error_types_js_1.HerokuErrorType.API_KEY_INVALID,
        error_types_js_1.HerokuErrorType.INVALID_MODEL,
        error_types_js_1.HerokuErrorType.INVALID_PARAMETERS,
        error_types_js_1.HerokuErrorType.MISSING_REQUIRED_PARAMETER,
        error_types_js_1.HerokuErrorType.INVALID_CONFIGURATION,
    ];
    return configurationErrors.includes(errorType);
}
/**
 * Check if an error indicates a temporary service issue
 */
function isTemporaryServiceError(error) {
    const errorData = error.data;
    const errorType = errorData?.errorType;
    if (!errorType) {
        return false;
    }
    const temporaryErrors = [
        error_types_js_1.HerokuErrorType.RATE_LIMIT_EXCEEDED,
        error_types_js_1.HerokuErrorType.SERVER_ERROR,
        error_types_js_1.HerokuErrorType.SERVICE_UNAVAILABLE,
        error_types_js_1.HerokuErrorType.CONNECTION_TIMEOUT,
        error_types_js_1.HerokuErrorType.NETWORK_ERROR,
        error_types_js_1.HerokuErrorType.STREAM_ERROR,
    ];
    return temporaryErrors.includes(errorType);
}
/**
 * Get contextual help based on error type
 */
function getContextualHelp(error) {
    const errorData = error.data;
    const errorType = errorData?.errorType;
    switch (errorType) {
        case error_types_js_1.HerokuErrorType.AUTHENTICATION_ERROR:
        case error_types_js_1.HerokuErrorType.API_KEY_INVALID:
            return [
                "Verify your API key is correct and active",
                "Check that you're using the right environment (staging vs production)",
                "Ensure your API key has the necessary permissions for this operation",
            ];
        case error_types_js_1.HerokuErrorType.RATE_LIMIT_EXCEEDED:
            return [
                "Implement exponential backoff in your retry logic",
                "Consider upgrading your plan for higher rate limits",
                "Batch your requests to reduce API calls",
            ];
        case error_types_js_1.HerokuErrorType.INVALID_MODEL:
            return [
                "Check the list of supported models in the documentation",
                "Verify the model name is spelled correctly",
                "Ensure the model is available in your region",
            ];
        case error_types_js_1.HerokuErrorType.CONTENT_FILTERED:
        case error_types_js_1.HerokuErrorType.UNSAFE_CONTENT:
            return [
                "Review your input for potentially harmful content",
                "Consider implementing content filtering before API calls",
                "Check the content policy guidelines",
            ];
        default:
            return [
                "Check the API documentation for guidance",
                "Review your request parameters",
                "Contact support if the issue persists",
            ];
    }
}
//# sourceMappingURL=user-friendly-errors.js.map