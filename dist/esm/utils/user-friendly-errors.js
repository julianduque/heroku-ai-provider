import { HerokuErrorType, getErrorMetadata, ErrorSeverity, ErrorCategory, } from "./error-types.js";
/**
 * Create a user-friendly error message from an APICallError
 */
export function createUserFriendlyError(error) {
    const errorData = error.data;
    const errorType = errorData?.errorType;
    if (!errorType) {
        return createGenericUserFriendlyError(error);
    }
    const metadata = getErrorMetadata(errorType);
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
    let category = ErrorCategory.CLIENT_ERROR;
    let severity = ErrorSeverity.MEDIUM;
    let userMessage = "An unexpected error occurred";
    let recoverySuggestions = [];
    if (statusCode) {
        if (statusCode >= 400 && statusCode < 500) {
            category = ErrorCategory.CLIENT_ERROR;
            severity = ErrorSeverity.MEDIUM;
            userMessage = "There was an issue with your request";
            recoverySuggestions = [
                "Check your request parameters and try again",
                "Verify your API key is valid and has the necessary permissions",
                "Review the API documentation for correct usage",
            ];
        }
        else if (statusCode >= 500) {
            category = ErrorCategory.SERVER_ERROR;
            severity = ErrorSeverity.HIGH;
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
        estimatedResolutionTime: getEstimatedResolutionTime(HerokuErrorType.UNKNOWN_ERROR, severity),
    };
}
/**
 * Get estimated resolution time based on error type and severity
 */
function getEstimatedResolutionTime(errorType, severity) {
    switch (severity) {
        case ErrorSeverity.LOW:
            return "1-5 minutes";
        case ErrorSeverity.MEDIUM:
            return "5-15 minutes";
        case ErrorSeverity.HIGH:
            return "15-60 minutes";
        case ErrorSeverity.CRITICAL:
            return "1-4 hours";
        default:
            return "Unknown";
    }
}
/**
 * Format a user-friendly error message for display
 */
export function formatUserFriendlyError(userError) {
    let message = `❌ ${userError.userMessage}\n`;
    if (userError.severity === ErrorSeverity.CRITICAL) {
        message +=
            "🚨 This is a critical error that requires immediate attention.\n";
    }
    else if (userError.severity === ErrorSeverity.HIGH) {
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
export function createSimpleErrorMessage(error) {
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
export function createDetailedErrorReport(error) {
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
export function isConfigurationError(error) {
    const errorData = error.data;
    const errorType = errorData?.errorType;
    if (!errorType) {
        return false;
    }
    const configurationErrors = [
        HerokuErrorType.AUTHENTICATION_ERROR,
        HerokuErrorType.API_KEY_INVALID,
        HerokuErrorType.INVALID_MODEL,
        HerokuErrorType.INVALID_PARAMETERS,
        HerokuErrorType.MISSING_REQUIRED_PARAMETER,
        HerokuErrorType.INVALID_CONFIGURATION,
    ];
    return configurationErrors.includes(errorType);
}
/**
 * Check if an error indicates a temporary service issue
 */
export function isTemporaryServiceError(error) {
    const errorData = error.data;
    const errorType = errorData?.errorType;
    if (!errorType) {
        return false;
    }
    const temporaryErrors = [
        HerokuErrorType.RATE_LIMIT_EXCEEDED,
        HerokuErrorType.SERVER_ERROR,
        HerokuErrorType.SERVICE_UNAVAILABLE,
        HerokuErrorType.CONNECTION_TIMEOUT,
        HerokuErrorType.NETWORK_ERROR,
        HerokuErrorType.STREAM_ERROR,
    ];
    return temporaryErrors.includes(errorType);
}
/**
 * Get contextual help based on error type
 */
export function getContextualHelp(error) {
    const errorData = error.data;
    const errorType = errorData?.errorType;
    switch (errorType) {
        case HerokuErrorType.AUTHENTICATION_ERROR:
        case HerokuErrorType.API_KEY_INVALID:
            return [
                "Verify your API key is correct and active",
                "Check that you're using the right environment (staging vs production)",
                "Ensure your API key has the necessary permissions for this operation",
            ];
        case HerokuErrorType.RATE_LIMIT_EXCEEDED:
            return [
                "Implement exponential backoff in your retry logic",
                "Consider upgrading your plan for higher rate limits",
                "Batch your requests to reduce API calls",
            ];
        case HerokuErrorType.INVALID_MODEL:
            return [
                "Check the list of supported models in the documentation",
                "Verify the model name is spelled correctly",
                "Ensure the model is available in your region",
            ];
        case HerokuErrorType.CONTENT_FILTERED:
        case HerokuErrorType.UNSAFE_CONTENT:
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