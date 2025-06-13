/**
 * Comprehensive error types for the Heroku AI Provider
 *
 * This module defines all possible error scenarios that can occur when
 * interacting with the Heroku AI API, providing structured error information
 * for better error handling and user experience.
 */
/**
 * Enumeration of all possible error types in the Heroku AI Provider
 */
export var HerokuErrorType;
(function (HerokuErrorType) {
    // Authentication & Authorization Errors
    HerokuErrorType["AUTHENTICATION_ERROR"] = "AuthenticationError";
    HerokuErrorType["AUTHORIZATION_ERROR"] = "AuthorizationError";
    HerokuErrorType["API_KEY_INVALID"] = "APIKeyInvalidError";
    HerokuErrorType["API_KEY_MISSING"] = "APIKeyMissingError";
    // Request Validation Errors
    HerokuErrorType["INVALID_REQUEST"] = "InvalidRequestError";
    HerokuErrorType["INVALID_PARAMETERS"] = "InvalidParametersError";
    HerokuErrorType["MISSING_REQUIRED_PARAMETER"] = "MissingRequiredParameterError";
    HerokuErrorType["INVALID_MODEL"] = "InvalidModelError";
    HerokuErrorType["INVALID_PROMPT"] = "InvalidPromptError";
    HerokuErrorType["INVALID_TOOL_FORMAT"] = "InvalidToolFormatError";
    // Rate Limiting & Quota Errors
    HerokuErrorType["RATE_LIMIT_EXCEEDED"] = "RateLimitExceededError";
    HerokuErrorType["QUOTA_EXCEEDED"] = "QuotaExceededError";
    HerokuErrorType["CONCURRENT_REQUESTS_LIMIT"] = "ConcurrentRequestsLimitError";
    // Model & Resource Errors
    HerokuErrorType["MODEL_NOT_FOUND"] = "ModelNotFoundError";
    HerokuErrorType["MODEL_UNAVAILABLE"] = "ModelUnavailableError";
    HerokuErrorType["MODEL_OVERLOADED"] = "ModelOverloadedError";
    HerokuErrorType["RESOURCE_NOT_FOUND"] = "ResourceNotFoundError";
    // Server & Infrastructure Errors
    HerokuErrorType["SERVER_ERROR"] = "ServerError";
    HerokuErrorType["SERVICE_UNAVAILABLE"] = "ServiceUnavailableError";
    HerokuErrorType["GATEWAY_TIMEOUT"] = "GatewayTimeoutError";
    HerokuErrorType["MAINTENANCE_MODE"] = "MaintenanceModeError";
    // Network & Connection Errors
    HerokuErrorType["NETWORK_ERROR"] = "NetworkError";
    HerokuErrorType["CONNECTION_TIMEOUT"] = "ConnectionTimeoutError";
    HerokuErrorType["CONNECTION_REFUSED"] = "ConnectionRefusedError";
    HerokuErrorType["DNS_RESOLUTION_ERROR"] = "DNSResolutionError";
    // Response Processing Errors
    HerokuErrorType["RESPONSE_PARSING_ERROR"] = "ResponseParsingError";
    HerokuErrorType["MALFORMED_RESPONSE"] = "MalformedResponseError";
    HerokuErrorType["INCOMPLETE_RESPONSE"] = "IncompleteResponseError";
    HerokuErrorType["STREAM_ERROR"] = "StreamError";
    // Content & Safety Errors
    HerokuErrorType["CONTENT_FILTERED"] = "ContentFilteredError";
    HerokuErrorType["UNSAFE_CONTENT"] = "UnsafeContentError";
    HerokuErrorType["CONTENT_TOO_LONG"] = "ContentTooLongError";
    // Configuration Errors
    HerokuErrorType["INVALID_CONFIGURATION"] = "InvalidConfigurationError";
    HerokuErrorType["MISSING_CONFIGURATION"] = "MissingConfigurationError";
    // Generic Errors
    HerokuErrorType["UNKNOWN_ERROR"] = "UnknownError";
    HerokuErrorType["API_ERROR"] = "APIError";
})(HerokuErrorType || (HerokuErrorType = {}));
/**
 * HTTP status code to error type mapping
 */
export const HTTP_STATUS_TO_ERROR_TYPE = {
    // 4xx Client Errors
    400: HerokuErrorType.INVALID_REQUEST,
    401: HerokuErrorType.AUTHENTICATION_ERROR,
    403: HerokuErrorType.AUTHORIZATION_ERROR,
    404: HerokuErrorType.MODEL_NOT_FOUND,
    408: HerokuErrorType.CONNECTION_TIMEOUT,
    413: HerokuErrorType.CONTENT_TOO_LONG,
    422: HerokuErrorType.INVALID_PARAMETERS,
    429: HerokuErrorType.RATE_LIMIT_EXCEEDED,
    // 5xx Server Errors
    500: HerokuErrorType.SERVER_ERROR,
    502: HerokuErrorType.GATEWAY_TIMEOUT,
    503: HerokuErrorType.SERVICE_UNAVAILABLE,
    504: HerokuErrorType.GATEWAY_TIMEOUT,
    507: HerokuErrorType.QUOTA_EXCEEDED,
};
/**
 * Error severity levels for categorizing errors
 */
export var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (ErrorSeverity = {}));
/**
 * Error category classification
 */
export var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["CLIENT_ERROR"] = "client_error";
    ErrorCategory["SERVER_ERROR"] = "server_error";
    ErrorCategory["NETWORK_ERROR"] = "network_error";
    ErrorCategory["VALIDATION_ERROR"] = "validation_error";
    ErrorCategory["CONFIGURATION_ERROR"] = "configuration_error";
})(ErrorCategory || (ErrorCategory = {}));
/**
 * Complete error metadata mapping
 */
export const ERROR_METADATA = {
    [HerokuErrorType.AUTHENTICATION_ERROR]: {
        type: HerokuErrorType.AUTHENTICATION_ERROR,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.CLIENT_ERROR,
        retryable: false,
        userMessage: "Authentication failed. Please check your API key.",
        technicalMessage: "Invalid or missing API key for Heroku API authentication",
        recoverySuggestions: [
            "Verify your Heroku API key is correct",
            "Check that the API key has not expired",
            "Ensure the API key is properly configured in your environment",
        ],
        documentationUrl: "https://devcenter.heroku.com/articles/platform-api-reference#authentication",
    },
    [HerokuErrorType.AUTHORIZATION_ERROR]: {
        type: HerokuErrorType.AUTHORIZATION_ERROR,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.CLIENT_ERROR,
        retryable: false,
        userMessage: "Access denied. Your account does not have permission to use this feature.",
        technicalMessage: "Insufficient permissions for the requested operation",
        recoverySuggestions: [
            "Contact your account administrator to request access",
            "Verify your account has the necessary permissions",
            "Check if the model requires special access privileges",
        ],
    },
    [HerokuErrorType.API_KEY_INVALID]: {
        type: HerokuErrorType.API_KEY_INVALID,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.CLIENT_ERROR,
        retryable: false,
        userMessage: "Invalid API key format.",
        technicalMessage: "The provided API key format is invalid",
        recoverySuggestions: [
            "Check the API key format matches Heroku requirements",
            "Regenerate your API key if necessary",
            "Ensure no extra characters or whitespace in the key",
        ],
    },
    [HerokuErrorType.API_KEY_MISSING]: {
        type: HerokuErrorType.API_KEY_MISSING,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.CONFIGURATION_ERROR,
        retryable: false,
        userMessage: "API key is required but not provided.",
        technicalMessage: "No API key provided for Heroku API request",
        recoverySuggestions: [
            "Set the HEROKU_API_KEY environment variable",
            "Pass the API key in the provider configuration",
            "Verify your environment configuration is loaded correctly",
        ],
    },
    [HerokuErrorType.INVALID_REQUEST]: {
        type: HerokuErrorType.INVALID_REQUEST,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.VALIDATION_ERROR,
        retryable: false,
        userMessage: "Invalid request. Please check your input parameters.",
        technicalMessage: "Request validation failed due to invalid parameters",
        recoverySuggestions: [
            "Review the API documentation for correct parameter formats",
            "Check all required parameters are provided",
            "Validate parameter types and values",
        ],
    },
    [HerokuErrorType.INVALID_PARAMETERS]: {
        type: HerokuErrorType.INVALID_PARAMETERS,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.VALIDATION_ERROR,
        retryable: false,
        userMessage: "One or more parameters are invalid.",
        technicalMessage: "Request contains invalid parameter values",
        recoverySuggestions: [
            "Check parameter types match expected formats",
            "Verify parameter values are within acceptable ranges",
            "Review the API documentation for parameter requirements",
        ],
    },
    [HerokuErrorType.MISSING_REQUIRED_PARAMETER]: {
        type: HerokuErrorType.MISSING_REQUIRED_PARAMETER,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.VALIDATION_ERROR,
        retryable: false,
        userMessage: "Required parameter is missing.",
        technicalMessage: "Request is missing one or more required parameters",
        recoverySuggestions: [
            "Check the API documentation for required parameters",
            "Ensure all mandatory fields are provided",
            "Verify parameter names are spelled correctly",
        ],
    },
    [HerokuErrorType.INVALID_MODEL]: {
        type: HerokuErrorType.INVALID_MODEL,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.VALIDATION_ERROR,
        retryable: false,
        userMessage: "The specified model is not valid.",
        technicalMessage: "Invalid model identifier provided",
        recoverySuggestions: [
            "Check the model name is spelled correctly",
            "Verify the model is available in your region",
            "Consult the list of supported models",
        ],
    },
    [HerokuErrorType.INVALID_PROMPT]: {
        type: HerokuErrorType.INVALID_PROMPT,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.VALIDATION_ERROR,
        retryable: false,
        userMessage: "The provided prompt is invalid.",
        technicalMessage: "Prompt validation failed",
        recoverySuggestions: [
            "Check prompt format and structure",
            "Ensure prompt is not empty",
            "Verify prompt length is within limits",
        ],
    },
    [HerokuErrorType.INVALID_TOOL_FORMAT]: {
        type: HerokuErrorType.INVALID_TOOL_FORMAT,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.VALIDATION_ERROR,
        retryable: false,
        userMessage: "Tool definition format is invalid.",
        technicalMessage: "Tool configuration does not match expected format",
        recoverySuggestions: [
            "Check tool definition structure",
            "Verify all required tool properties are present",
            "Review tool schema documentation",
        ],
    },
    [HerokuErrorType.RATE_LIMIT_EXCEEDED]: {
        type: HerokuErrorType.RATE_LIMIT_EXCEEDED,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.CLIENT_ERROR,
        retryable: true,
        userMessage: "Rate limit exceeded. Please try again later.",
        technicalMessage: "API rate limit has been exceeded",
        recoverySuggestions: [
            "Wait before making additional requests",
            "Implement exponential backoff in your retry logic",
            "Consider upgrading your plan for higher rate limits",
        ],
    },
    [HerokuErrorType.QUOTA_EXCEEDED]: {
        type: HerokuErrorType.QUOTA_EXCEEDED,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.CLIENT_ERROR,
        retryable: false,
        userMessage: "Usage quota exceeded for your account.",
        technicalMessage: "Account usage quota has been exceeded",
        recoverySuggestions: [
            "Check your account usage dashboard",
            "Upgrade your plan for higher quotas",
            "Wait for quota reset if on a time-based plan",
        ],
    },
    [HerokuErrorType.CONCURRENT_REQUESTS_LIMIT]: {
        type: HerokuErrorType.CONCURRENT_REQUESTS_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.CLIENT_ERROR,
        retryable: true,
        userMessage: "Too many concurrent requests. Please reduce request frequency.",
        technicalMessage: "Maximum concurrent requests limit exceeded",
        recoverySuggestions: [
            "Reduce the number of simultaneous requests",
            "Implement request queuing in your application",
            "Consider upgrading for higher concurrency limits",
        ],
    },
    [HerokuErrorType.MODEL_NOT_FOUND]: {
        type: HerokuErrorType.MODEL_NOT_FOUND,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.CLIENT_ERROR,
        retryable: false,
        userMessage: "The requested model was not found.",
        technicalMessage: "Specified model does not exist or is not accessible",
        recoverySuggestions: [
            "Verify the model name is correct",
            "Check if the model is available in your region",
            "Ensure your account has access to the model",
        ],
    },
    [HerokuErrorType.MODEL_UNAVAILABLE]: {
        type: HerokuErrorType.MODEL_UNAVAILABLE,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SERVER_ERROR,
        retryable: true,
        userMessage: "The model is temporarily unavailable.",
        technicalMessage: "Model service is currently unavailable",
        recoverySuggestions: [
            "Try again in a few minutes",
            "Use an alternative model if available",
            "Check the Heroku status page for service updates",
        ],
    },
    [HerokuErrorType.MODEL_OVERLOADED]: {
        type: HerokuErrorType.MODEL_OVERLOADED,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SERVER_ERROR,
        retryable: true,
        userMessage: "The model is currently overloaded. Please try again.",
        technicalMessage: "Model is experiencing high load",
        recoverySuggestions: [
            "Retry with exponential backoff",
            "Try during off-peak hours",
            "Consider using a different model variant",
        ],
    },
    [HerokuErrorType.RESOURCE_NOT_FOUND]: {
        type: HerokuErrorType.RESOURCE_NOT_FOUND,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.CLIENT_ERROR,
        retryable: false,
        userMessage: "The requested resource was not found.",
        technicalMessage: "Specified resource does not exist",
        recoverySuggestions: [
            "Check the resource identifier",
            "Verify the resource exists and is accessible",
            "Ensure proper permissions for the resource",
        ],
    },
    [HerokuErrorType.SERVER_ERROR]: {
        type: HerokuErrorType.SERVER_ERROR,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SERVER_ERROR,
        retryable: true,
        userMessage: "A server error occurred. Please try again later.",
        technicalMessage: "Internal server error occurred",
        recoverySuggestions: [
            "Retry the request after a short delay",
            "Check the Heroku status page",
            "Contact support if the issue persists",
        ],
    },
    [HerokuErrorType.SERVICE_UNAVAILABLE]: {
        type: HerokuErrorType.SERVICE_UNAVAILABLE,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SERVER_ERROR,
        retryable: true,
        userMessage: "The service is temporarily unavailable.",
        technicalMessage: "Service is currently unavailable",
        recoverySuggestions: [
            "Wait and retry in a few minutes",
            "Check the Heroku status page for updates",
            "Implement retry logic with exponential backoff",
        ],
    },
    [HerokuErrorType.GATEWAY_TIMEOUT]: {
        type: HerokuErrorType.GATEWAY_TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SERVER_ERROR,
        retryable: true,
        userMessage: "Request timed out. Please try again.",
        technicalMessage: "Gateway timeout occurred",
        recoverySuggestions: [
            "Retry the request",
            "Reduce request complexity if possible",
            "Check your network connection",
        ],
    },
    [HerokuErrorType.MAINTENANCE_MODE]: {
        type: HerokuErrorType.MAINTENANCE_MODE,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SERVER_ERROR,
        retryable: true,
        userMessage: "The service is under maintenance. Please try again later.",
        technicalMessage: "Service is in maintenance mode",
        recoverySuggestions: [
            "Wait for maintenance to complete",
            "Check the Heroku status page for updates",
            "Subscribe to status notifications",
        ],
    },
    [HerokuErrorType.NETWORK_ERROR]: {
        type: HerokuErrorType.NETWORK_ERROR,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.NETWORK_ERROR,
        retryable: true,
        userMessage: "Network error occurred. Please check your connection.",
        technicalMessage: "Network connectivity issue",
        recoverySuggestions: [
            "Check your internet connection",
            "Verify firewall settings",
            "Try again in a moment",
        ],
    },
    [HerokuErrorType.CONNECTION_TIMEOUT]: {
        type: HerokuErrorType.CONNECTION_TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.NETWORK_ERROR,
        retryable: true,
        userMessage: "Connection timed out. Please try again.",
        technicalMessage: "Request timed out waiting for response",
        recoverySuggestions: [
            "Check your network connection",
            "Increase timeout values if configurable",
            "Retry the request",
        ],
    },
    [HerokuErrorType.CONNECTION_REFUSED]: {
        type: HerokuErrorType.CONNECTION_REFUSED,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.NETWORK_ERROR,
        retryable: true,
        userMessage: "Connection refused. Please try again later.",
        technicalMessage: "Connection to server was refused",
        recoverySuggestions: [
            "Check if the service is running",
            "Verify the endpoint URL is correct",
            "Check firewall and network settings",
        ],
    },
    [HerokuErrorType.DNS_RESOLUTION_ERROR]: {
        type: HerokuErrorType.DNS_RESOLUTION_ERROR,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.NETWORK_ERROR,
        retryable: true,
        userMessage: "Unable to resolve server address.",
        technicalMessage: "DNS resolution failed for the API endpoint",
        recoverySuggestions: [
            "Check your DNS settings",
            "Try using a different DNS server",
            "Verify the endpoint URL is correct",
        ],
    },
    [HerokuErrorType.RESPONSE_PARSING_ERROR]: {
        type: HerokuErrorType.RESPONSE_PARSING_ERROR,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SERVER_ERROR,
        retryable: false,
        userMessage: "Unable to process server response.",
        technicalMessage: "Failed to parse API response",
        recoverySuggestions: [
            "Report this issue to support",
            "Try the request again",
            "Check if the API version is compatible",
        ],
    },
    [HerokuErrorType.MALFORMED_RESPONSE]: {
        type: HerokuErrorType.MALFORMED_RESPONSE,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SERVER_ERROR,
        retryable: false,
        userMessage: "Received invalid response from server.",
        technicalMessage: "Server returned malformed response",
        recoverySuggestions: [
            "Report this issue to support",
            "Try the request again",
            "Check API documentation for expected response format",
        ],
    },
    [HerokuErrorType.INCOMPLETE_RESPONSE]: {
        type: HerokuErrorType.INCOMPLETE_RESPONSE,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SERVER_ERROR,
        retryable: true,
        userMessage: "Received incomplete response from server.",
        technicalMessage: "Server response was incomplete or truncated",
        recoverySuggestions: [
            "Retry the request",
            "Check network stability",
            "Report persistent issues to support",
        ],
    },
    [HerokuErrorType.STREAM_ERROR]: {
        type: HerokuErrorType.STREAM_ERROR,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SERVER_ERROR,
        retryable: true,
        userMessage: "Error occurred during streaming response.",
        technicalMessage: "Streaming response encountered an error",
        recoverySuggestions: [
            "Try using non-streaming mode",
            "Check network stability",
            "Retry the request",
        ],
    },
    [HerokuErrorType.CONTENT_FILTERED]: {
        type: HerokuErrorType.CONTENT_FILTERED,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.CLIENT_ERROR,
        retryable: false,
        userMessage: "Content was filtered due to safety policies.",
        technicalMessage: "Request content triggered safety filters",
        recoverySuggestions: [
            "Modify your prompt to avoid sensitive content",
            "Review content policy guidelines",
            "Try rephrasing your request",
        ],
    },
    [HerokuErrorType.UNSAFE_CONTENT]: {
        type: HerokuErrorType.UNSAFE_CONTENT,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.CLIENT_ERROR,
        retryable: false,
        userMessage: "Content violates safety guidelines.",
        technicalMessage: "Content was flagged as unsafe",
        recoverySuggestions: [
            "Review and modify your content",
            "Ensure compliance with usage policies",
            "Contact support if you believe this is an error",
        ],
    },
    [HerokuErrorType.CONTENT_TOO_LONG]: {
        type: HerokuErrorType.CONTENT_TOO_LONG,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.CLIENT_ERROR,
        retryable: false,
        userMessage: "Content exceeds maximum length limit.",
        technicalMessage: "Request content exceeds size limits",
        recoverySuggestions: [
            "Reduce the length of your input",
            "Split large requests into smaller chunks",
            "Check the model's context window limits",
        ],
    },
    [HerokuErrorType.INVALID_CONFIGURATION]: {
        type: HerokuErrorType.INVALID_CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.CONFIGURATION_ERROR,
        retryable: false,
        userMessage: "Invalid configuration detected.",
        technicalMessage: "Provider configuration is invalid",
        recoverySuggestions: [
            "Check your provider configuration",
            "Verify all required settings are provided",
            "Review configuration documentation",
        ],
    },
    [HerokuErrorType.MISSING_CONFIGURATION]: {
        type: HerokuErrorType.MISSING_CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.CONFIGURATION_ERROR,
        retryable: false,
        userMessage: "Required configuration is missing.",
        technicalMessage: "Missing required configuration parameters",
        recoverySuggestions: [
            "Provide all required configuration parameters",
            "Check environment variables are set",
            "Review setup documentation",
        ],
    },
    [HerokuErrorType.UNKNOWN_ERROR]: {
        type: HerokuErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SERVER_ERROR,
        retryable: true,
        userMessage: "An unexpected error occurred.",
        technicalMessage: "Unknown error occurred",
        recoverySuggestions: [
            "Try the request again",
            "Check the Heroku status page",
            "Contact support with error details",
        ],
    },
    [HerokuErrorType.API_ERROR]: {
        type: HerokuErrorType.API_ERROR,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SERVER_ERROR,
        retryable: true,
        userMessage: "API error occurred.",
        technicalMessage: "General API error",
        recoverySuggestions: [
            "Retry the request",
            "Check request parameters",
            "Contact support if the issue persists",
        ],
    },
};
/**
 * Helper function to get error metadata by type
 */
export function getErrorMetadata(errorType) {
    return (ERROR_METADATA[errorType] || ERROR_METADATA[HerokuErrorType.UNKNOWN_ERROR]);
}
/**
 * Helper function to determine if an error is retryable
 */
export function isRetryableError(errorType) {
    return getErrorMetadata(errorType).retryable;
}
/**
 * Helper function to get error severity
 */
export function getErrorSeverity(errorType) {
    return getErrorMetadata(errorType).severity;
}
/**
 * Helper function to get error category
 */
export function getErrorCategory(errorType) {
    return getErrorMetadata(errorType).category;
}
//# sourceMappingURL=error-types.js.map