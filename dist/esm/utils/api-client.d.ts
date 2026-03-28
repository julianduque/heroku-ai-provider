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
    /** Authentication mode: 'bearer' for Authorization header, 'x-api-key' for Anthropic-style */
    authMode?: "bearer" | "x-api-key";
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
/**
 * Anthropic SSE stream event types
 */
export interface AnthropicStreamEvent {
    type: "message_start" | "content_block_start" | "content_block_delta" | "content_block_stop" | "message_delta" | "message_stop" | "ping" | "error";
    index?: number;
    message?: Record<string, unknown>;
    content_block?: Record<string, unknown>;
    delta?: Record<string, unknown>;
    usage?: Record<string, unknown>;
    error?: Record<string, unknown>;
}
/**
 * Enhanced SSE stream handling for Anthropic Messages API
 * Anthropic uses a different SSE format with event: and data: lines
 */
export declare function processAnthropicStream(response: Response, url?: string): ReadableStream<AnthropicStreamEvent>;
/**
 * Create a streaming request for Anthropic Messages API
 */
export declare function makeAnthropicStreamRequest(url: string, apiKey: string, body: Record<string, unknown>, options?: RequestOptions): Promise<ReadableStream<AnthropicStreamEvent>>;
export {};
//# sourceMappingURL=api-client.d.ts.map