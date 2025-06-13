import { APICallError } from "@ai-sdk/provider";
import { makeHerokuRequest } from "../utils/api-client.js";
import { createValidationError } from "../utils/error-handling.js";

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
  inputType?:
    | "search_document"
    | "search_query"
    | "classification"
    | "clustering";

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

// Define the request body interface for Heroku embeddings API
interface HerokuEmbeddingRequestBody extends Record<string, unknown> {
  model: string;
  input: string[];
  input_type?: string;
  embedding_type?: string;
  truncate?: string;
}

// Define the response structure from Heroku embeddings API
interface HerokuEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Heroku embedding model implementation compatible with AI SDK v1.1.3.
 *
 * This class provides embedding generation capabilities using Heroku's AI infrastructure,
 * specifically designed to work seamlessly with the Vercel AI SDK's embedding functions.
 *
 * @class HerokuEmbeddingModel
 * @example
 * Basic usage with AI SDK:
 * ```typescript
 * import { embed, embedMany } from "ai";
 * import { createHerokuProvider } from "heroku-ai-provider";
 *
 * const heroku = createHerokuProvider();
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
 *   process.env.HEROKU_EMBEDDING_KEY!,
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
export class HerokuEmbeddingModel {
  readonly specificationVersion = "v1" as const;
  readonly provider = "heroku" as const;
  readonly modelId: string;
  readonly maxEmbeddingsPerCall = 100; // Reasonable default limit
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
   *   process.env.HEROKU_EMBEDDING_KEY!,
   *   "https://us.inference.heroku.com/v1/embeddings"
   * );
   * ```
   */
  constructor(
    private readonly model: string,
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {
    // Comprehensive parameter validation
    this.validateConstructorParameters(model, apiKey, baseUrl);
    this.modelId = model;
  }

  /**
   * Validate constructor parameters with detailed error messages
   * @internal
   */
  private validateConstructorParameters(
    model: string,
    apiKey: string,
    baseUrl: string,
  ): void {
    // Validate model parameter
    if (!model || typeof model !== "string") {
      throw createValidationError(
        "Model must be a non-empty string",
        "model",
        model,
      );
    }

    if (model.trim().length === 0) {
      throw createValidationError(
        "Model cannot be empty or contain only whitespace",
        "model",
        model,
      );
    }

    // Validate API key parameter
    if (!apiKey || typeof apiKey !== "string") {
      throw createValidationError(
        "API key must be a non-empty string",
        "apiKey",
        "[REDACTED]",
      );
    }

    if (apiKey.trim().length === 0) {
      throw createValidationError(
        "API key cannot be empty or contain only whitespace",
        "apiKey",
        "[REDACTED]",
      );
    }

    // Basic API key format validation
    if (apiKey.length < 10) {
      throw createValidationError(
        "API key appears to be too short to be valid",
        "apiKey",
        "[REDACTED]",
      );
    }

    // Validate base URL parameter
    if (!baseUrl || typeof baseUrl !== "string") {
      throw createValidationError(
        "Base URL must be a non-empty string",
        "baseUrl",
        baseUrl,
      );
    }

    if (baseUrl.trim().length === 0) {
      throw createValidationError(
        "Base URL cannot be empty or contain only whitespace",
        "baseUrl",
        baseUrl,
      );
    }

    // Validate URL format
    try {
      const url = new URL(baseUrl);

      // Ensure it's HTTP or HTTPS
      if (!["http:", "https:"].includes(url.protocol)) {
        throw createValidationError(
          "Base URL must use HTTP or HTTPS protocol",
          "baseUrl",
          baseUrl,
        );
      }

      // Ensure it has a valid hostname
      if (!url.hostname || url.hostname.length === 0) {
        throw createValidationError(
          "Base URL must have a valid hostname",
          "baseUrl",
          baseUrl,
        );
      }
    } catch (urlError) {
      if (urlError instanceof Error && urlError.name === "TypeError") {
        throw createValidationError(
          `Base URL is not a valid URL format: ${urlError.message}`,
          "baseUrl",
          baseUrl,
        );
      }
      // Re-throw validation errors as-is
      throw urlError;
    }

    // Validate against Heroku's supported embedding models
    const supportedHerokuEmbeddingModels = ["cohere-embed-multilingual"];

    if (!supportedHerokuEmbeddingModels.includes(model)) {
      console.warn(
        `Model '${model}' is not in the list of known Heroku-supported embedding models: ${supportedHerokuEmbeddingModels.join(", ")}. This may cause API errors.`,
      );
    }

    // Validate base URL points to an embedding endpoint
    if (
      !baseUrl.includes("/embed") &&
      !baseUrl.includes("/v1") &&
      !baseUrl.includes("/vector")
    ) {
      console.warn(
        `Base URL '${baseUrl}' doesn't appear to be an embeddings endpoint. This may cause API errors.`,
      );
    }
  }

  /**
   * Generate embeddings for the provided text values.
   *
   * This method implements the AI SDK v1.1.3 EmbeddingModelV1 interface,
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
  async doEmbed(options: {
    values: string[];
    abortSignal?: AbortSignal;
    headers?: Record<string, string | undefined>;
  }): Promise<{
    embeddings: Array<number[]>;
    usage?: { tokens: number };
    rawResponse?: { headers?: Record<string, string> };
  }> {
    // Extract values from options
    const inputArray = options.values;

    // Validate input
    if (inputArray.length === 0) {
      throw new APICallError({
        message: "Input cannot be empty",
        url: this.baseUrl,
        requestBodyValues: { input: inputArray },
        statusCode: 400,
        responseBody: "",
      });
    }

    // Check for empty strings and validate that all inputs are strings
    const hasEmptyStrings = inputArray.some(
      (text) => !text || typeof text !== "string" || text.trim().length === 0,
    );
    if (hasEmptyStrings) {
      throw new APICallError({
        message: "Input must be non-empty strings only",
        url: this.baseUrl,
        requestBodyValues: { input: inputArray },
        statusCode: 400,
        responseBody: "",
      });
    }

    // Check batch size limit
    if (inputArray.length > this.maxEmbeddingsPerCall) {
      throw new APICallError({
        message: `Batch size exceeds maximum limit of ${this.maxEmbeddingsPerCall}`,
        url: this.baseUrl,
        requestBodyValues: { input: inputArray },
        statusCode: 400,
        responseBody: "",
      });
    }

    // Build request body
    const body: HerokuEmbeddingRequestBody = {
      model: this.model,
      input: inputArray,
    };

    // Note: Custom embedding options (inputType, embeddingType, truncate)
    // are not supported in the AI SDK interface. They would need to be
    // passed through provider-specific options if needed.

    try {
      // Make API request with enhanced error handling
      const response = (await makeHerokuRequest(
        this.baseUrl,
        this.apiKey,
        body,
        {
          maxRetries: 3,
          timeout: 30000,
        },
      )) as HerokuEmbeddingResponse;

      // Validate response structure
      if (!response.data || !Array.isArray(response.data)) {
        throw new APICallError({
          message: "Invalid response format: missing data array",
          url: this.baseUrl,
          requestBodyValues: body,
          statusCode: 500,
          responseBody: JSON.stringify(response),
        });
      }

      if (response.data.length !== inputArray.length) {
        throw new APICallError({
          message: `Response data length (${response.data.length}) does not match input length (${inputArray.length})`,
          url: this.baseUrl,
          requestBodyValues: body,
          statusCode: 500,
          responseBody: JSON.stringify(response),
        });
      }

      // Extract and validate embeddings
      const embeddings: number[][] = [];

      for (let i = 0; i < response.data.length; i++) {
        const item = response.data[i];

        if (!item.embedding || !Array.isArray(item.embedding)) {
          throw new APICallError({
            message: `Invalid embedding format at index ${i}`,
            url: this.baseUrl,
            requestBodyValues: body,
            statusCode: 500,
            responseBody: JSON.stringify(response),
          });
        }

        if (item.embedding.length === 0) {
          throw new APICallError({
            message: `Empty embedding vector at index ${i}`,
            url: this.baseUrl,
            requestBodyValues: body,
            statusCode: 500,
            responseBody: JSON.stringify(response),
          });
        }

        // Validate that all values are numbers
        const hasInvalidValues = item.embedding.some(
          (val) => typeof val !== "number" || !isFinite(val),
        );
        if (hasInvalidValues) {
          throw new APICallError({
            message: `Invalid embedding values at index ${i}: contains non-numeric or infinite values`,
            url: this.baseUrl,
            requestBodyValues: body,
            statusCode: 500,
            responseBody: JSON.stringify(response),
          });
        }

        embeddings.push(item.embedding);
      }

      return {
        embeddings,
        usage: response.usage
          ? { tokens: response.usage.total_tokens }
          : undefined,
        rawResponse: {
          headers: {},
        },
      };
    } catch (error) {
      // Re-throw APICallErrors as-is
      if (error instanceof APICallError) {
        throw error;
      }

      // Wrap other errors in APICallError
      throw new APICallError({
        message: "Failed to generate embeddings",
        url: this.baseUrl,
        requestBodyValues: body,
        statusCode: 500,
        responseBody: "",
        cause: error,
      });
    }
  }

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
  async embedSingle(text: string): Promise<{ embedding: number[] }> {
    const result = await this.doEmbed({ values: [text] });
    return {
      embedding: result.embeddings[0],
    };
  }

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
  async embedBatch(
    texts: string[],
    chunkSize: number = this.maxEmbeddingsPerCall,
  ): Promise<{ embeddings: number[][] }> {
    if (texts.length <= chunkSize) {
      const result = await this.doEmbed({ values: texts });
      return { embeddings: result.embeddings };
    }

    // Process in chunks
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += chunkSize) {
      const chunk = texts.slice(i, i + chunkSize);
      const result = await this.doEmbed({ values: chunk });
      allEmbeddings.push(...result.embeddings);
    }

    return { embeddings: allEmbeddings };
  }
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
 *   process.env.HEROKU_EMBEDDING_KEY!,
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
export function createEmbedFunction(model: HerokuEmbeddingModel) {
  return async function embed(input: string | string[]) {
    const values = Array.isArray(input) ? input : [input];
    const result = await model.doEmbed({ values });

    // Return format compatible with AI SDK expectations
    if (typeof input === "string") {
      return {
        embedding: result.embeddings[0],
        usage: result.usage,
      };
    } else {
      return {
        embeddings: result.embeddings,
        usage: result.usage,
      };
    }
  };
}
