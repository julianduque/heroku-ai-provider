import { RerankingModelV3, RerankingModelV3CallOptions, SharedV3ProviderMetadata, SharedV3Warning } from "@ai-sdk/provider";
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
export declare class HerokuRerankingModel implements RerankingModelV3 {
    private readonly model;
    private readonly apiKey;
    private readonly baseUrl;
    readonly specificationVersion: "v3";
    readonly provider: "heroku";
    readonly modelId: string;
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
    constructor(model: string, apiKey: string, baseUrl: string);
    /**
     * Validate constructor parameters with detailed error messages.
     * @internal
     */
    private validateConstructorParameters;
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
    doRerank(options: RerankingModelV3CallOptions): Promise<{
        ranking: Array<{
            index: number;
            relevanceScore: number;
        }>;
        providerMetadata?: SharedV3ProviderMetadata;
        warnings?: Array<SharedV3Warning>;
        response?: {
            id?: string;
            timestamp?: Date;
            modelId?: string;
            headers?: Record<string, string>;
            body?: unknown;
        };
    }>;
}
//# sourceMappingURL=reranking.d.ts.map