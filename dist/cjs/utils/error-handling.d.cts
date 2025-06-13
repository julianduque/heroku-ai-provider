import { APICallError } from "@ai-sdk/provider";
/**
 * Enhanced error mapping function that provides comprehensive error handling
 * for all possible Heroku API error scenarios
 */
export declare function mapHerokuError(status: number, errorData: unknown, url?: string, requestBody?: Record<string, unknown>): APICallError;
/**
 * Create user-friendly error messages with recovery suggestions
 */
export declare function createUserFriendlyErrorMessage(error: APICallError): string;
/**
 * Determine if an error should be retried based on error type and metadata
 */
export declare function shouldRetryError(error: APICallError): boolean;
/**
 * Get retry delay based on error type and attempt number
 */
export declare function getRetryDelay(error: APICallError, attemptNumber: number): number;
/**
 * Enhanced network error handling for fetch failures
 */
export declare function mapNetworkError(error: Error, url: string, requestBody: Record<string, unknown>): APICallError;
/**
 * Validate and enhance streaming errors
 */
export declare function mapStreamError(error: Error, url: string): APICallError;
/**
 * Create validation errors for invalid parameters
 */
export declare function createValidationError(message: string, parameterName?: string, parameterValue?: unknown): APICallError;
//# sourceMappingURL=error-handling.d.ts.map