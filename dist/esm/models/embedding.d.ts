import { EmbeddingModelV2, SharedV2ProviderMetadata, SharedV2ProviderOptions } from "@ai-sdk/provider";
/**
 * Configuration options for embedding generation.
 *
 * These options allow fine-tuning of the embedding process for different use cases
 * such as search, classification, or clustering.
 *
 * @interface EmbeddingOptions
 * @example
 * ```typescript
 * const options: EmbeddingOptions = {
 *   inputType: "search_query",
 *   embeddingType: "float",
 *   truncate: "END"
 * };
 * ```
 */
export interface EmbeddingOptions {
    /**
     * Specifies the type of input text for optimized embedding generation.
     *
     * - `search_document`: For documents that will be searched against
     * - `search_query`: For search queries
     * - `classification`: For text classification tasks
     * - `clustering`: For text clustering tasks
     */
    inputType?: "search_document" | "search_query" | "classification" | "clustering";
    /**
     * The format of the returned embedding vectors.
     *
     * - `float`: Standard floating-point embeddings (default)
     * - `int8`: Quantized 8-bit integer embeddings (smaller size, slight quality trade-off)
     */
    embeddingType?: "float" | "int8";
    /**
     * How to handle text that exceeds the model's maximum input length.
     *
     * - `NONE`: Return an error if text is too long
     * - `START`: Truncate from the beginning
     * - `END`: Truncate from the end (default)
     */
    truncate?: "NONE" | "START" | "END";
}
/**
 * Heroku embedding model implementation compatible with AI SDK v5.
 *
 * This class provides embedding generation capabilities using Heroku's AI infrastructure,
 * specifically designed to work seamlessly with the Vercel AI SDK's embedding functions.
 *
 * @class HerokuEmbeddingModel
 * @example
 * Basic usage with AI SDK:
 * ```typescript
 * import { embed, embedMany } from "ai";
 * import { heroku } from "heroku-ai-provider";
 *
 * const model = heroku.embedding("cohere-embed-multilingual");
 *
 * // Single embedding
 * const { embedding } = await embed({
 *   model,
 *   value: "Hello, world!"
 * });
 *
 * // Multiple embeddings
 * const { embeddings } = await embedMany({
 *   model,
 *   values: ["First text", "Second text", "Third text"]
 * });
 * ```
 *
 * @example
 * Direct model usage:
 * ```typescript
 * import { HerokuEmbeddingModel } from "heroku-ai-provider";
 *
 * const model = new HerokuEmbeddingModel(
 *   "cohere-embed-multilingual",
 *   process.env.EMBEDDING_KEY!,
 *   "https://us.inference.heroku.com/v1/embeddings"
 * );
 *
 * const result = await model.doEmbed({
 *   values: ["Text to embed"]
 * });
 *
 * console.log(result.embeddings[0]); // [0.1, 0.2, -0.3, ...]
 * ```
 */
export declare class HerokuEmbeddingModel implements EmbeddingModelV2<string> {
    private readonly model;
    private readonly apiKey;
    private readonly baseUrl;
    readonly specificationVersion: "v2";
    readonly provider: "heroku";
    readonly modelId: string;
    readonly maxEmbeddingsPerCall = 100;
    readonly supportsParallelCalls = true;
    /**
     * Creates a new HerokuEmbeddingModel instance.
     *
     * @param model - The Heroku embedding model identifier (e.g., "cohere-embed-multilingual")
     * @param apiKey - Your Heroku AI API key for embeddings
     * @param baseUrl - The base URL for the Heroku embeddings API
     *
     * @throws {ValidationError} When parameters are invalid or missing
     *
     * @example
     * ```typescript
     * const model = new HerokuEmbeddingModel(
     *   "cohere-embed-multilingual",
     *   process.env.EMBEDDING_KEY!,
     *   "https://us.inference.heroku.com/v1/embeddings"
     * );
     * ```
     */
    constructor(model: string, apiKey: string, baseUrl: string);
    /**
     * Validate constructor parameters with detailed error messages
     * @internal
     */
    private validateConstructorParameters;
    /**
     * Generate embeddings for the provided text values.
     *
     * This method implements the AI SDK v5 EmbeddingModelV2 interface,
     * providing seamless integration with the Vercel AI SDK's embedding functions.
     *
     * @param options - Configuration object containing values to embed and optional settings
     * @param options.values - Array of text strings to generate embeddings for
     * @param options.abortSignal - Optional AbortSignal for request cancellation
     * @param options.headers - Optional additional HTTP headers
     *
     * @returns Promise resolving to embedding results with usage information
     *
     * @throws {APICallError} When the API request fails or input validation fails
     *
     * @example
     * Basic embedding generation:
     * ```typescript
     * const result = await model.doEmbed({
     *   values: ["Hello, world!", "How are you?"]
     * });
     *
     * console.log(result.embeddings.length); // 2
     * console.log(result.embeddings[0].length); // 1024 (embedding dimension)
     * console.log(result.usage?.tokens); // Token count used
     * ```
     *
     * @example
     * With abort signal for cancellation:
     * ```typescript
     * const controller = new AbortController();
     *
     * // Cancel after 5 seconds
     * setTimeout(() => controller.abort(), 5000);
     *
     * try {
     *   const result = await model.doEmbed({
     *     values: ["Long text to embed..."],
     *     abortSignal: controller.signal
     *   });
     * } catch (error) {
     *   if (error.name === 'AbortError') {
     *     console.log('Request was cancelled');
     *   }
     * }
     * ```
     *
     * @example
     * Error handling:
     * ```typescript
     * try {
     *   const result = await model.doEmbed({
     *     values: [""] // Empty string will cause validation error
     *   });
     * } catch (error) {
     *   if (error instanceof APICallError) {
     *     console.error('API Error:', error.message);
     *     console.error('Status:', error.statusCode);
     *   }
     * }
     * ```
     */
    doEmbed(options: {
        values: string[];
        abortSignal?: AbortSignal;
        providerOptions?: SharedV2ProviderOptions;
        headers?: Record<string, string | undefined>;
    }): Promise<{
        embeddings: Array<number[]>;
        usage?: {
            tokens: number;
        };
        providerMetadata?: SharedV2ProviderMetadata;
        response?: {
            headers?: Record<string, string>;
            body?: unknown;
        };
    }>;
    /**
     * Generate embedding for a single text string.
     *
     * This is a convenience method that wraps doEmbed for single-text use cases.
     *
     * @param text - The text string to generate an embedding for
     * @returns Promise resolving to the embedding vector
     *
     * @throws {APICallError} When the API request fails or input validation fails
     *
     * @example
     * ```typescript
     * const result = await model.embedSingle("Hello, world!");
     * console.log(result.embedding); // [0.1, 0.2, -0.3, ...]
     * ```
     */
    embedSingle(text: string): Promise<{
        embedding: number[];
    }>;
    /**
     * Generate embeddings for multiple texts with automatic chunking.
     *
     * This method automatically splits large batches into smaller chunks
     * to respect API limits and processes them sequentially.
     *
     * @param texts - Array of text strings to generate embeddings for
     * @param chunkSize - Maximum number of texts to process in each API call
     * @returns Promise resolving to all embedding vectors
     *
     * @throws {APICallError} When any API request fails or input validation fails
     *
     * @example
     * ```typescript
     * const texts = Array.from({ length: 150 }, (_, i) => `Text ${i}`);
     * const result = await model.embedBatch(texts, 50); // Process in chunks of 50
     * console.log(result.embeddings.length); // 150
     * ```
     */
    embedBatch(texts: string[], chunkSize?: number): Promise<{
        embeddings: number[][];
    }>;
}
/**
 * Creates a reusable embedding function from a HerokuEmbeddingModel instance.
 *
 * This helper function provides a convenient way to create a reusable embedding
 * function that can handle both single strings and arrays of strings, returning
 * the appropriate format for each case.
 *
 * @param model - The HerokuEmbeddingModel instance to use for embedding generation
 * @returns A function that can embed single strings or arrays of strings
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { createEmbedFunction, HerokuEmbeddingModel } from "heroku-ai-provider";
 *
 * const model = new HerokuEmbeddingModel(
 *   "cohere-embed-multilingual",
 *   process.env.EMBEDDING_KEY!,
 *   "https://us.inference.heroku.com/v1/embeddings"
 * );
 *
 * const embedText = createEmbedFunction(model);
 *
 * // Single embedding
 * const singleResult = await embedText("Hello, world!");
 * console.log(singleResult.embedding); // [0.1, 0.2, -0.3, ...]
 *
 * // Multiple embeddings
 * const multiResult = await embedText(["First text", "Second text"]);
 * console.log(multiResult.embeddings.length); // 2
 * ```
 *
 * @example
 * With error handling:
 * ```typescript
 * const embedText = createEmbedFunction(model);
 *
 * try {
 *   const result = await embedText("Text to embed");
 *   console.log("Embedding generated:", result.embedding.length, "dimensions");
 *   console.log("Tokens used:", result.usage?.tokens);
 * } catch (error) {
 *   console.error("Embedding failed:", error.message);
 * }
 * ```
 *
 * @example
 * Batch processing:
 * ```typescript
 * const embedText = createEmbedFunction(model);
 *
 * const documents = [
 *   "First document content",
 *   "Second document content",
 *   "Third document content"
 * ];
 *
 * const result = await embedText(documents);
 * console.log(`Generated ${result.embeddings.length} embeddings`);
 *
 * // Use embeddings for similarity search, clustering, etc.
 * const similarities = result.embeddings.map((emb, i) => ({
 *   document: documents[i],
 *   embedding: emb
 * }));
 * ```
 */
export declare function createEmbedFunction(model: HerokuEmbeddingModel): (input: string | string[]) => Promise<{
    embedding: number[];
    usage: {
        tokens: number;
    } | undefined;
    embeddings?: undefined;
} | {
    embeddings: number[][];
    usage: {
        tokens: number;
    } | undefined;
    embedding?: undefined;
}>;
//# sourceMappingURL=embedding.d.ts.map