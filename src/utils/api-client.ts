import {
  mapHerokuError,
  mapNetworkError,
  mapStreamError,
  shouldRetryError,
  getRetryDelay,
  createValidationError,
} from "./error-handling.js";
import { APICallError } from "@ai-sdk/provider";

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
 * Default configuration for API requests
 */
const DEFAULT_OPTIONS: Required<Omit<RequestOptions, "abortSignal">> & {
  abortSignal?: AbortSignal;
} = {
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  stream: false,
  headers: {},
  abortSignal: undefined,
  authMode: "bearer",
};

/**
 * Enhanced Heroku API client with comprehensive error handling and retry logic
 */
export async function makeHerokuRequest(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  options: RequestOptions = {},
): Promise<unknown> {
  // Validate required parameters
  validateRequestParameters(url, apiKey, body);

  // Merge options with defaults
  const config = { ...DEFAULT_OPTIONS, ...options };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      return await executeRequest(url, apiKey, body, config, attempt);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on the last attempt
      if (attempt === config.maxRetries + 1) {
        break;
      }

      // Check if error should be retried
      if (error instanceof Error && "statusCode" in error) {
        const apiError = error as ErrorWithStatusCode;
        if (!shouldRetryError(apiError as APICallError)) {
          break;
        }

        // Calculate delay and wait before retry
        const delay = getRetryDelay(apiError as APICallError, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // For non-API errors, only retry network errors
        if (!isNetworkError(error as Error)) {
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
async function executeRequest(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  config: Required<Omit<RequestOptions, "abortSignal">> & {
    abortSignal?: AbortSignal;
  },
  attempt: number,
): Promise<unknown> {
  const headers = {
    ...(config.authMode === "x-api-key"
      ? { "x-api-key": apiKey }
      : { Authorization: `Bearer ${apiKey}` }),
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw mapHerokuError(response.status, errorData, url, body);
    }

    return config.stream ? response : await response.json();
  } catch (error) {
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
        throw mapNetworkError(
          new Error(`Request timeout after ${config.timeout}ms`),
          url,
          body,
        );
      }

      if (isNetworkError(error)) {
        throw mapNetworkError(error, url, body);
      }
    }

    // Re-throw API errors as-is
    throw error;
  } finally {
    clearTimeout(timeoutId);
    config.abortSignal?.removeEventListener("abort", externalAbortHandler);
  }
}

/**
 * Validate request parameters
 */
function validateRequestParameters(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
): void {
  if (!url || typeof url !== "string") {
    throw createValidationError("URL must be a non-empty string", "url", url);
  }

  if (!apiKey || typeof apiKey !== "string") {
    throw createValidationError(
      "API key must be a non-empty string",
      "apiKey",
      "[REDACTED]",
    );
  }

  if (!body || typeof body !== "object") {
    throw createValidationError("Request body must be an object", "body", body);
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw createValidationError("URL must be a valid URL format", "url", url);
  }
}

/**
 * Check if an error is a network-related error
 */
function isNetworkError(error: Error): boolean {
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
export function processHerokuStream(
  response: Response,
  url = "",
): ReadableStream<unknown> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine.startsWith("data:")) {
              const data = trimmedLine.slice(5).trim();
              if (data === "[DONE]") {
                controller.close();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                controller.enqueue(parsed);
              } catch (parseError) {
                // Log parsing errors but continue processing
                console.warn(
                  "Error parsing SSE data:",
                  parseError,
                  "Data:",
                  data,
                );

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
              } catch (parseError) {
                console.warn(
                  "Error parsing final SSE data:",
                  parseError,
                  "Data:",
                  data,
                );
              }
            }
          }
        }

        controller.close();
      } catch (streamError) {
        // Map stream errors to our error handling system
        const mappedError = mapStreamError(streamError as Error, url);
        controller.error(mappedError);
      }
    },
  });
}

/**
 * Create a streaming request with enhanced error handling
 */
export async function makeHerokuStreamRequest(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  options: RequestOptions = {},
): Promise<ReadableStream<unknown>> {
  const streamOptions = { ...options, stream: true };

  try {
    const response = (await makeHerokuRequest(
      url,
      apiKey,
      body,
      streamOptions,
    )) as Response;
    return processHerokuStream(response, url);
  } catch (error) {
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
export function isRateLimited(error: ErrorWithRateLimitData): boolean {
  return (
    error?.statusCode === 429 ||
    error?.data?.errorType === "RATE_LIMIT_EXCEEDED"
  );
}

/**
 * Utility function to extract retry-after header value
 */
export function getRetryAfterDelay(error: ErrorWithStatusCode): number | null {
  const retryAfter =
    error?.responseHeaders?.["retry-after"] ||
    error?.responseHeaders?.["Retry-After"];

  if (retryAfter) {
    const delay = parseInt(retryAfter, 10);
    return isNaN(delay) ? null : delay * 1000; // Convert to milliseconds
  }

  return null;
}

/**
 * Anthropic SSE stream event types
 */
export interface AnthropicStreamEvent {
  type:
    | "message_start"
    | "content_block_start"
    | "content_block_delta"
    | "content_block_stop"
    | "message_delta"
    | "message_stop"
    | "ping"
    | "error";
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
export function processAnthropicStream(
  response: Response,
  url = "",
): ReadableStream<AnthropicStreamEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEventType: string | null = null;

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
              currentEventType = null;
              continue;
            }

            // Parse event type line
            if (trimmedLine.startsWith("event:")) {
              currentEventType = trimmedLine.slice(6).trim();
              continue;
            }

            // Parse data line
            if (trimmedLine.startsWith("data:")) {
              const data = trimmedLine.slice(5).trim();

              // Skip empty data or [DONE] marker (from Heroku proxy)
              if (!data || data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data) as Record<string, unknown>;

                // Use the event type from the parsed data, or fall back to the SSE event type
                const eventType =
                  (parsed.type as string) || currentEventType || "unknown";

                const event: AnthropicStreamEvent = {
                  type: eventType as AnthropicStreamEvent["type"],
                  ...parsed,
                };

                controller.enqueue(event);
              } catch (parseError) {
                console.warn(
                  "Error parsing Anthropic SSE data:",
                  parseError,
                  "Data:",
                  data,
                );

                controller.enqueue({
                  type: "error",
                  error: {
                    type: "parse_error",
                    message: "Failed to parse streaming response",
                    data: data,
                  },
                });
              }

              currentEventType = null;
            }
          }
        }

        // Process any remaining data in the buffer
        if (buffer.trim()) {
          const lines = buffer.split("\n");
          let currentEventType: string | null = null;

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine.startsWith("event:")) {
              currentEventType = trimmedLine.slice(6).trim();
              continue;
            }

            if (trimmedLine.startsWith("data:")) {
              const data = trimmedLine.slice(5).trim();
              if (data) {
                try {
                  const parsed = JSON.parse(data) as Record<string, unknown>;
                  const eventType =
                    (parsed.type as string) || currentEventType || "unknown";

                  const event: AnthropicStreamEvent = {
                    type: eventType as AnthropicStreamEvent["type"],
                    ...parsed,
                  };

                  controller.enqueue(event);
                } catch (parseError) {
                  console.warn(
                    "Error parsing final Anthropic SSE data:",
                    parseError,
                    "Data:",
                    data,
                  );
                }
              }
            }
          }
        }

        controller.close();
      } catch (streamError) {
        const mappedError = mapStreamError(streamError as Error, url);
        controller.error(mappedError);
      }
    },
  });
}

/**
 * Create a streaming request for Anthropic Messages API
 */
export async function makeAnthropicStreamRequest(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  options: RequestOptions = {},
): Promise<ReadableStream<AnthropicStreamEvent>> {
  const streamOptions = {
    ...options,
    stream: true,
    authMode: "x-api-key" as const,
  };

  try {
    const response = (await makeHerokuRequest(
      url,
      apiKey,
      body,
      streamOptions,
    )) as Response;
    return processAnthropicStream(response, url);
  } catch (error) {
    if (error instanceof Error && !("statusCode" in error)) {
      throw mapStreamError(error, url);
    }
    throw error;
  }
}
