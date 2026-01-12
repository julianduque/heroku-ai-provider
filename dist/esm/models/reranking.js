import { APICallError, } from "@ai-sdk/provider";
import { makeHerokuRequest } from "../utils/api-client.js";
import { createValidationError } from "../utils/error-handling.js";
/**
 * Heroku reranking model implementation compatible with AI SDK v6.
 *
 * This class provides reranking capabilities using Heroku's AI infrastructure,
 * specifically designed to work seamlessly with the Vercel AI SDK's rerank function.
 * The API is Cohere-compatible, making it work with existing Cohere SDK patterns.
 *
 * @class HerokuRerankingModel
 * @example
 * Basic usage with AI SDK:
 * ```typescript
 * import { rerank } from "ai";
 * import { heroku } from "heroku-ai-provider";
 *
 * const model = heroku.reranking("cohere-rerank-3-5");
 *
 * const { ranking } = await rerank({
 *   model,
 *   query: "How do I troubleshoot slow API response times?",
 *   documents: [
 *     "Enable query logging to identify slow database queries.",
 *     "Use caching strategies like Redis to reduce operations.",
 *     "Application metrics help track performance trends.",
 *   ],
 *   topN: 2
 * });
 * ```
 *
 * @example
 * Direct model usage:
 * ```typescript
 * import { HerokuRerankingModel } from "heroku-ai-provider";
 *
 * const model = new HerokuRerankingModel(
 *   "cohere-rerank-3-5",
 *   process.env.INFERENCE_KEY!,
 *   "https://us.inference.heroku.com/v1/rerank"
 * );
 *
 * const result = await model.doRerank({
 *   query: "database optimization",
 *   documents: { type: "text", values: ["doc1", "doc2", "doc3"] }
 * });
 *
 * console.log(result.ranking); // [{ index: 2, relevanceScore: 0.95 }, ...]
 * ```
 */
export class HerokuRerankingModel {
    /**
     * Creates a new HerokuRerankingModel instance.
     *
     * @param model - The Heroku reranking model identifier (e.g., "cohere-rerank-3-5", "amazon-rerank-1-0")
     * @param apiKey - Your Heroku AI API key for reranking
     * @param baseUrl - The base URL for the Heroku reranking API
     *
     * @throws {ValidationError} When parameters are invalid or missing
     *
     * @example
     * ```typescript
     * const model = new HerokuRerankingModel(
     *   "cohere-rerank-3-5",
     *   process.env.INFERENCE_KEY!,
     *   "https://us.inference.heroku.com/v1/rerank"
     * );
     * ```
     */
    constructor(model, apiKey, baseUrl) {
        this.model = model;
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.specificationVersion = "v3";
        this.provider = "heroku";
        // Comprehensive parameter validation
        this.validateConstructorParameters(model, apiKey, baseUrl);
        this.modelId = model;
    }
    /**
     * Validate constructor parameters with detailed error messages.
     * @internal
     */
    validateConstructorParameters(model, apiKey, baseUrl) {
        // Validate model parameter
        if (!model || typeof model !== "string") {
            throw createValidationError("Model must be a non-empty string", "model", model);
        }
        if (model.trim().length === 0) {
            throw createValidationError("Model cannot be empty or contain only whitespace", "model", model);
        }
        // Validate API key parameter
        if (!apiKey || typeof apiKey !== "string") {
            throw createValidationError("API key must be a non-empty string", "apiKey", "[REDACTED]");
        }
        if (apiKey.trim().length === 0) {
            throw createValidationError("API key cannot be empty or contain only whitespace", "apiKey", "[REDACTED]");
        }
        // Basic API key format validation
        if (apiKey.length < 10) {
            throw createValidationError("API key appears to be too short to be valid", "apiKey", "[REDACTED]");
        }
        // Validate base URL parameter
        if (!baseUrl || typeof baseUrl !== "string") {
            throw createValidationError("Base URL must be a non-empty string", "baseUrl", baseUrl);
        }
        if (baseUrl.trim().length === 0) {
            throw createValidationError("Base URL cannot be empty or contain only whitespace", "baseUrl", baseUrl);
        }
        // Validate URL format
        try {
            const url = new URL(baseUrl);
            // Ensure it's HTTP or HTTPS
            if (!["http:", "https:"].includes(url.protocol)) {
                throw createValidationError("Base URL must use HTTP or HTTPS protocol", "baseUrl", baseUrl);
            }
            // Ensure it has a valid hostname
            if (!url.hostname || url.hostname.length === 0) {
                throw createValidationError("Base URL must have a valid hostname", "baseUrl", baseUrl);
            }
        }
        catch (urlError) {
            if (urlError instanceof Error && urlError.name === "TypeError") {
                throw createValidationError(`Base URL is not a valid URL format: ${urlError.message}`, "baseUrl", baseUrl);
            }
            // Re-throw validation errors as-is
            throw urlError;
        }
    }
    /**
     * Rerank documents based on their relevance to a query.
     *
     * This method implements the AI SDK v6 RerankingModelV3 interface,
     * providing seamless integration with the Vercel AI SDK's rerank function.
     *
     * @param options - Configuration object containing documents to rerank and query
     * @param options.documents - Documents to rerank (text strings or JSON objects)
     * @param options.query - The query to rank documents against
     * @param options.topN - Optional limit to return only top N documents
     * @param options.abortSignal - Optional AbortSignal for request cancellation
     * @param options.headers - Optional additional HTTP headers
     *
     * @returns Promise resolving to ranking results with relevance scores
     *
     * @throws {APICallError} When the API request fails or input validation fails
     *
     * @example
     * Basic reranking:
     * ```typescript
     * const result = await model.doRerank({
     *   query: "database optimization",
     *   documents: {
     *     type: "text",
     *     values: ["Use indexes", "Enable caching", "Monitor queries"]
     *   }
     * });
     *
     * console.log(result.ranking);
     * // [{ index: 0, relevanceScore: 0.85 }, { index: 2, relevanceScore: 0.72 }, ...]
     * ```
     */
    async doRerank(options) {
        // Check if request was aborted before starting
        if (options.abortSignal?.aborted) {
            throw new APICallError({
                message: "Reranking request was aborted before it started",
                url: this.baseUrl,
                requestBodyValues: {},
                statusCode: 499,
            });
        }
        const warnings = [];
        // Convert documents to string array
        let documentStrings;
        if (options.documents.type === "text") {
            documentStrings = options.documents.values;
        }
        else {
            // For object documents, convert to JSON strings
            // This follows the pattern used by the Cohere SDK
            warnings.push({
                type: "other",
                message: "Object documents are being converted to JSON strings. For optimal results, consider using text documents.",
            });
            documentStrings = options.documents.values.map((doc) => JSON.stringify(doc));
        }
        // Validate input
        if (documentStrings.length === 0) {
            throw new APICallError({
                message: "Documents array cannot be empty",
                url: this.baseUrl,
                requestBodyValues: { documents: documentStrings },
                statusCode: 400,
                responseBody: "",
            });
        }
        // Check Heroku's document limit (1000 max)
        if (documentStrings.length > 1000) {
            throw new APICallError({
                message: `Documents array exceeds maximum of 1000 items (received ${documentStrings.length}). Please reduce the number of documents per request.`,
                url: this.baseUrl,
                requestBodyValues: { documentsCount: documentStrings.length },
                statusCode: 400,
                responseBody: "",
            });
        }
        // Validate query
        if (!options.query || typeof options.query !== "string") {
            throw new APICallError({
                message: "Query must be a non-empty string",
                url: this.baseUrl,
                requestBodyValues: { query: options.query },
                statusCode: 400,
                responseBody: "",
            });
        }
        if (options.query.trim().length === 0) {
            throw new APICallError({
                message: "Query cannot be empty or contain only whitespace",
                url: this.baseUrl,
                requestBodyValues: { query: options.query },
                statusCode: 400,
                responseBody: "",
            });
        }
        // Build request body
        const body = {
            model: this.model,
            query: options.query,
            documents: documentStrings,
        };
        // Add optional topN parameter
        if (options.topN !== undefined) {
            if (!Number.isInteger(options.topN) || options.topN < 1) {
                throw new APICallError({
                    message: "topN must be a positive integer (at least 1)",
                    url: this.baseUrl,
                    requestBodyValues: { topN: options.topN },
                    statusCode: 400,
                    responseBody: "",
                });
            }
            body.top_n = options.topN;
        }
        // Warn if providerOptions are passed (not supported by this model)
        if (options.providerOptions &&
            Object.keys(options.providerOptions).length > 0) {
            warnings.push({
                type: "other",
                message: "providerOptions are not supported by HerokuRerankingModel and will be ignored.",
            });
        }
        // Prepare headers
        const requestHeaders = options.headers
            ? Object.fromEntries(Object.entries(options.headers).filter(([, value]) => value !== undefined))
            : undefined;
        try {
            // Make API request with abortSignal support
            const response = (await makeHerokuRequest(this.baseUrl, this.apiKey, body, {
                maxRetries: 3,
                timeout: 30000,
                headers: requestHeaders,
                abortSignal: options.abortSignal,
            }));
            // Validate response structure
            if (!response.results || !Array.isArray(response.results)) {
                throw new APICallError({
                    message: "Invalid response format: missing results array",
                    url: this.baseUrl,
                    requestBodyValues: body,
                    statusCode: 500,
                    responseBody: JSON.stringify(response),
                });
            }
            // Map response to AI SDK format with validation
            const ranking = response.results.map((result, i) => {
                if (typeof result.index !== "number" ||
                    !Number.isInteger(result.index) ||
                    result.index < 0 ||
                    result.index >= documentStrings.length) {
                    throw new APICallError({
                        message: `Invalid document index ${result.index} at position ${i}`,
                        url: this.baseUrl,
                        requestBodyValues: body,
                        statusCode: 500,
                        responseBody: JSON.stringify(response),
                    });
                }
                return {
                    index: result.index,
                    relevanceScore: result.relevance_score,
                };
            });
            return {
                ranking,
                warnings: warnings.length > 0 ? warnings : undefined,
                response: {
                    id: response.id,
                    timestamp: new Date(),
                    modelId: this.model,
                    body: response,
                },
                providerMetadata: response.meta
                    ? {
                        heroku: {
                            apiVersion: response.meta.api_version?.version,
                            billedUnits: response.meta.billed_units,
                        },
                    }
                    : undefined,
            };
        }
        catch (error) {
            // Re-throw APICallErrors as-is
            if (error instanceof APICallError) {
                throw error;
            }
            // Wrap other errors in APICallError
            throw new APICallError({
                message: "Failed to rerank documents",
                url: this.baseUrl,
                requestBodyValues: body,
                statusCode: 500,
                responseBody: "",
                cause: error,
            });
        }
    }
}
//# sourceMappingURL=reranking.js.map