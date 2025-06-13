import { APICallError } from "@ai-sdk/provider";
import { ErrorSeverity, ErrorCategory } from "./error-types.js";
/**
 * User-friendly error message with recovery suggestions
 */
export interface UserFriendlyError {
    /** Simple, non-technical error message for end users */
    userMessage: string;
    /** Detailed technical information for developers */
    technicalDetails: string;
    /** Step-by-step recovery suggestions */
    recoverySuggestions: string[];
    /** Error severity level */
    severity: ErrorSeverity;
    /** Error category */
    category: ErrorCategory;
    /** Whether the error is retryable */
    isRetryable: boolean;
    /** Link to relevant documentation */
    documentationUrl?: string;
    /** Estimated time to resolution */
    estimatedResolutionTime?: string;
}
/**
 * Create a user-friendly error message from an APICallError
 */
export declare function createUserFriendlyError(error: APICallError): UserFriendlyError;
/**
 * Format a user-friendly error message for display
 */
export declare function formatUserFriendlyError(userError: UserFriendlyError): string;
/**
 * Create a simplified error message for end users (non-technical)
 */
export declare function createSimpleErrorMessage(error: APICallError): string;
/**
 * Create a detailed error report for developers
 */
export declare function createDetailedErrorReport(error: APICallError): string;
/**
 * Check if an error indicates a configuration issue
 */
export declare function isConfigurationError(error: APICallError): boolean;
/**
 * Check if an error indicates a temporary service issue
 */
export declare function isTemporaryServiceError(error: APICallError): boolean;
/**
 * Get contextual help based on error type
 */
export declare function getContextualHelp(error: APICallError): string[];
//# sourceMappingURL=user-friendly-errors.d.ts.map