/**
 * Comprehensive error types for the Heroku AI Provider
 *
 * This module defines all possible error scenarios that can occur when
 * interacting with the Heroku AI API, providing structured error information
 * for better error handling and user experience.
 */
/**
 * Base interface for all Heroku API error responses
 */
export interface HerokuErrorResponse {
    error?: {
        message?: string;
        type?: string;
        code?: string;
        details?: Record<string, unknown>;
    };
    message?: string;
    code?: string;
    status?: number;
}
/**
 * Enumeration of all possible error types in the Heroku AI Provider
 */
export declare enum HerokuErrorType {
    AUTHENTICATION_ERROR = "AuthenticationError",
    AUTHORIZATION_ERROR = "AuthorizationError",
    API_KEY_INVALID = "APIKeyInvalidError",
    API_KEY_MISSING = "APIKeyMissingError",
    INVALID_REQUEST = "InvalidRequestError",
    INVALID_PARAMETERS = "InvalidParametersError",
    MISSING_REQUIRED_PARAMETER = "MissingRequiredParameterError",
    INVALID_MODEL = "InvalidModelError",
    INVALID_PROMPT = "InvalidPromptError",
    INVALID_TOOL_FORMAT = "InvalidToolFormatError",
    RATE_LIMIT_EXCEEDED = "RateLimitExceededError",
    QUOTA_EXCEEDED = "QuotaExceededError",
    CONCURRENT_REQUESTS_LIMIT = "ConcurrentRequestsLimitError",
    MODEL_NOT_FOUND = "ModelNotFoundError",
    MODEL_UNAVAILABLE = "ModelUnavailableError",
    MODEL_OVERLOADED = "ModelOverloadedError",
    RESOURCE_NOT_FOUND = "ResourceNotFoundError",
    SERVER_ERROR = "ServerError",
    SERVICE_UNAVAILABLE = "ServiceUnavailableError",
    GATEWAY_TIMEOUT = "GatewayTimeoutError",
    MAINTENANCE_MODE = "MaintenanceModeError",
    NETWORK_ERROR = "NetworkError",
    CONNECTION_TIMEOUT = "ConnectionTimeoutError",
    CONNECTION_REFUSED = "ConnectionRefusedError",
    DNS_RESOLUTION_ERROR = "DNSResolutionError",
    RESPONSE_PARSING_ERROR = "ResponseParsingError",
    MALFORMED_RESPONSE = "MalformedResponseError",
    INCOMPLETE_RESPONSE = "IncompleteResponseError",
    STREAM_ERROR = "StreamError",
    CONTENT_FILTERED = "ContentFilteredError",
    UNSAFE_CONTENT = "UnsafeContentError",
    CONTENT_TOO_LONG = "ContentTooLongError",
    INVALID_CONFIGURATION = "InvalidConfigurationError",
    MISSING_CONFIGURATION = "MissingConfigurationError",
    UNKNOWN_ERROR = "UnknownError",
    API_ERROR = "APIError"
}
/**
 * HTTP status code to error type mapping
 */
export declare const HTTP_STATUS_TO_ERROR_TYPE: Record<number, HerokuErrorType>;
/**
 * Error severity levels for categorizing errors
 */
export declare enum ErrorSeverity {
    LOW = "low",// Recoverable errors, user can retry
    MEDIUM = "medium",// Errors requiring user action
    HIGH = "high",// Critical errors, service unavailable
    CRITICAL = "critical"
}
/**
 * Error category classification
 */
export declare enum ErrorCategory {
    CLIENT_ERROR = "client_error",// 4xx errors - user/client issue
    SERVER_ERROR = "server_error",// 5xx errors - server/service issue
    NETWORK_ERROR = "network_error",// Network connectivity issues
    VALIDATION_ERROR = "validation_error",// Input validation failures
    CONFIGURATION_ERROR = "configuration_error"
}
/**
 * Comprehensive error metadata for each error type
 */
export interface ErrorMetadata {
    type: HerokuErrorType;
    severity: ErrorSeverity;
    category: ErrorCategory;
    retryable: boolean;
    userMessage: string;
    technicalMessage: string;
    recoverySuggestions: string[];
    documentationUrl?: string;
}
/**
 * Complete error metadata mapping
 */
export declare const ERROR_METADATA: Record<HerokuErrorType, ErrorMetadata>;
/**
 * Helper function to get error metadata by type
 */
export declare function getErrorMetadata(errorType: HerokuErrorType): ErrorMetadata;
/**
 * Helper function to determine if an error is retryable
 */
export declare function isRetryableError(errorType: HerokuErrorType): boolean;
/**
 * Helper function to get error severity
 */
export declare function getErrorSeverity(errorType: HerokuErrorType): ErrorSeverity;
/**
 * Helper function to get error category
 */
export declare function getErrorCategory(errorType: HerokuErrorType): ErrorCategory;
//# sourceMappingURL=error-types.d.ts.map