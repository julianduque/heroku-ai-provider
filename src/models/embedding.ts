import { APICallError } from "@ai-sdk/provider";
import { makeHerokuRequest } from "../utils/api-client.js";
import { createValidationError } from "../utils/error-handling.js";

// Define embedding options interface for better type safety
export interface EmbeddingOptions {
  inputType?:
    | "search_document"
    | "search_query"
    | "classification"
    | "clustering";
  embeddingType?: "float" | "int8";
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

export class HerokuEmbeddingModel {
  readonly specificationVersion = "v1" as const;
  readonly provider = "heroku" as const;
  readonly modelId: string;
  readonly maxEmbeddingsPerCall = 100; // Reasonable default limit
  readonly supportsParallelCalls = true;

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

  async doEmbed(
    input: string | string[],
    options: EmbeddingOptions = {},
  ): Promise<{
    embeddings: number[][];
    rawResponse?: { model: string; usage: unknown };
  }> {
    // Normalize input to array format
    const inputArray = Array.isArray(input) ? input : [input];

    // Validate input
    if (inputArray.length === 0) {
      throw new APICallError({
        message: "Input cannot be empty",
        url: this.baseUrl,
        requestBodyValues: { input },
        statusCode: 400,
        responseBody: "",
      });
    }

    // Check for empty strings
    const hasEmptyStrings = inputArray.some(
      (text) => !text || text.trim().length === 0,
    );
    if (hasEmptyStrings) {
      throw new APICallError({
        message: "Input cannot contain empty strings",
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

    // Add optional parameters if provided
    if (options.inputType) {
      body.input_type = options.inputType;
    }
    if (options.embeddingType) {
      body.embedding_type = options.embeddingType;
    }
    if (options.truncate) {
      body.truncate = options.truncate;
    }

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
        // Include additional metadata for debugging/monitoring
        rawResponse: {
          model: response.model,
          usage: response.usage,
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

  // Helper method for single embedding (convenience method)
  async embedSingle(
    text: string,
    options: EmbeddingOptions = {},
  ): Promise<{ embedding: number[] }> {
    const result = await this.doEmbed(text, options);
    return {
      embedding: result.embeddings[0],
    };
  }

  // Helper method for batch processing with automatic chunking
  async embedBatch(
    texts: string[],
    options: EmbeddingOptions = {},
    chunkSize: number = this.maxEmbeddingsPerCall,
  ): Promise<{ embeddings: number[][] }> {
    if (texts.length <= chunkSize) {
      return this.doEmbed(texts, options);
    }

    // Process in chunks
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += chunkSize) {
      const chunk = texts.slice(i, i + chunkSize);
      const result = await this.doEmbed(chunk, options);
      allEmbeddings.push(...result.embeddings);
    }

    return { embeddings: allEmbeddings };
  }
}

// Helper function to integrate with AI SDK's embed function
export function createEmbedFunction(model: HerokuEmbeddingModel) {
  return async function embed(
    input: string | string[],
    options?: EmbeddingOptions,
  ) {
    const result = await model.doEmbed(input, options);

    // Return format compatible with AI SDK expectations
    if (typeof input === "string") {
      return {
        embedding: result.embeddings[0],
        usage: (result as { rawResponse?: { usage?: unknown } }).rawResponse
          ?.usage,
      };
    } else {
      return {
        embeddings: result.embeddings,
        usage: (result as { rawResponse?: { usage?: unknown } }).rawResponse
          ?.usage,
      };
    }
  };
}
