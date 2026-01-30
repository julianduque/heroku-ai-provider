interface ErrorWithStatusCode {
    statusCode?: number;
    data?: unknown;
    responseHeaders?: Record<string, string>;
}
interface ErrorWithRateLimitData extends ErrorWithStatusCode {
    statusCode: number;
    data?: {
        errorType?: string;
    };
}
/**
 * Configuration options for API requests
 */
export interface RequestOptions {
    /** Maximum number of retry attempts */
    maxRetries?: number;
    /** Custom timeout in milliseconds */
    timeout?: number;
    /** Whether to enable streaming */
    stream?: boolean;
    /** Additional headers to include */
    headers?: Record<string, string>;
    /** Optional AbortSignal for request cancellation */
    abortSignal?: AbortSignal;
}
/**
 * Enhanced Heroku API client with comprehensive error handling and retry logic
 */
export declare function makeHerokuRequest(url: string, apiKey: string, body: Record<string, unknown>, options?: RequestOptions): Promise<unknown>;
/**
 * Enhanced SSE stream handling with comprehensive error handling
 */
export declare function processHerokuStream(response: Response, url?: string): ReadableStream<unknown>;
/**
 * Create a streaming request with enhanced error handling
 */
export declare function makeHerokuStreamRequest(url: string, apiKey: string, body: Record<string, unknown>, options?: RequestOptions): Promise<ReadableStream<unknown>>;
/**
 * Utility function to check if a response indicates a rate limit
 */
export declare function isRateLimited(error: ErrorWithRateLimitData): boolean;
/**
 * Utility function to extract retry-after header value
 */
export declare function getRetryAfterDelay(error: ErrorWithStatusCode): number | null;
export {};
//# sourceMappingURL=api-client.d.ts.map