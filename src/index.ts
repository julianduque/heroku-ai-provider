import { HerokuChatLanguageModel } from "./models/chat.js";
import { HerokuEmbeddingModel } from "./models/embedding.js";
import { HerokuImageModel } from "./models/image.js";
import { createValidationError } from "./utils/error-handling.js";
import {
  isSupportedChatModel,
  isSupportedEmbeddingModel,
  isSupportedImageModel,
  getSupportedChatModelsString,
  getSupportedEmbeddingModelsString,
  getSupportedImageModelsString,
} from "./utils/supported-models.js";

/**
 * Safely access environment variables in both Node.js and browser environments.
 * In browsers, process.env may not be available, so this function handles that gracefully.
 * @internal
 */
function getEnvVar(key: string): string | undefined {
  if (
    typeof process !== "undefined" &&
    process.env &&
    typeof process.env === "object"
  ) {
    return process.env[key];
  }
  return undefined;
}

/**
 * Ensures the base URL has the correct API endpoint path appended.
 * The environment variables typically only provide the domain (e.g., https://us.inference.heroku.com)
 * without the full path, so we need to append the appropriate endpoint.
 *
 * This function handles:
 * - Base domain only: https://us.inference.heroku.com → appends path
 * - Already has full path: https://us.inference.heroku.com/v1/chat/completions → returns as-is
 * - Trailing slashes: normalizes them to prevent double slashes
 *
 * @internal
 */
export function ensureEndpointPath(
  baseUrl: string,
  endpointPath: string,
): string {
  if (!baseUrl) {
    return baseUrl;
  }

  // Remove trailing slash from base URL for consistent handling
  const normalizedBase = baseUrl.replace(/\/+$/, "");

  // Normalize the endpoint path to ensure it starts with /
  const normalizedEndpoint = endpointPath.startsWith("/")
    ? endpointPath
    : `/${endpointPath}`;

  // Check if the URL already ends with the endpoint path (with or without trailing slash)
  // This prevents double paths like /v1/chat/completions/v1/chat/completions
  if (normalizedBase.endsWith(normalizedEndpoint)) {
    return normalizedBase;
  }

  // Also check if the endpoint path is already present (handles cases with trailing content)
  // Use a regex to match the endpoint at the end of the path portion
  try {
    const url = new URL(normalizedBase);
    const pathname = url.pathname.replace(/\/+$/, "");

    // If pathname already ends with the endpoint, return normalized base
    if (pathname.endsWith(normalizedEndpoint)) {
      return normalizedBase;
    }

    // If pathname contains the full endpoint path, return as-is
    if (pathname.includes(normalizedEndpoint)) {
      return normalizedBase;
    }
  } catch {
    // If URL parsing fails, fall back to simple string check
    if (normalizedBase.includes(normalizedEndpoint)) {
      return normalizedBase;
    }
  }

  // Append the endpoint path
  return `${normalizedBase}${normalizedEndpoint}`;
}

/**
 * Configuration settings for the Heroku AI provider.
 *
 * @example
 * ```typescript
 * import { createHerokuAI } from "heroku-ai-provider";
 *
 * const heroku = createHerokuAI({
 *   chatApiKey: "your_inference_api_key",
 *   embeddingsApiKey: "your_embedding_api_key",
 *   chatBaseUrl: "https://us.inference.heroku.com/v1/chat/completions",
 *   embeddingsBaseUrl: "https://us.inference.heroku.com/v1/embeddings"
 * });
 * ```
 */
export interface HerokuAIOptions {
  /**
   * API key for chat completions.
   * @default process.env.INFERENCE_KEY (Node.js only; not available in browsers)
   */
  chatApiKey?: string;

  /**
   * API key for embeddings.
   * @default process.env.EMBEDDING_KEY (Node.js only; not available in browsers)
   */
  embeddingsApiKey?: string;

  /**
   * API key for image generations.
   * @default process.env.DIFFUSION_KEY ?? process.env.HEROKU_DIFFUSION_KEY (Node.js only; not available in browsers)
   */
  imageApiKey?: string;

  /**
   * Base URL for chat completions API.
   * @default process.env.INFERENCE_URL ?? "https://us.inference.heroku.com/v1/chat/completions" (process.env only available in Node.js)
   */
  chatBaseUrl?: string;

  /**
   * Base URL for embeddings API.
   * @default process.env.EMBEDDING_URL ?? "https://us.inference.heroku.com/v1/embeddings" (process.env only available in Node.js)
   */
  embeddingsBaseUrl?: string;

  /**
   * Base URL for image generations API.
   * @default process.env.DIFFUSION_URL ?? "https://us.inference.heroku.com/v1/images/generations" (process.env only available in Node.js)
   */
  imageBaseUrl?: string;
}

/**
 * @deprecated Use {@link HerokuAIOptions} instead.
 */
export type HerokuProviderSettings = HerokuAIOptions;

/**
 * Creates a configurable Heroku AI provider for the Vercel AI SDK.
 *
 * This helper lets you override API keys or base URLs when the default
 * environment variables (`INFERENCE_KEY`, `INFERENCE_URL`, `EMBEDDING_KEY`,
 * `EMBEDDING_URL`) are not sufficient.
 *
 * **Browser Compatibility**: In browser environments, `process.env` is not available.
 * You must provide API keys via the options parameter (e.g., `chatApiKey`, `embeddingsApiKey`, `imageApiKey`).
 *
 * @param options - Optional configuration overrides for the provider
 * @returns An object with methods to access chat and embedding models
 *
 * @throws {ValidationError} When API keys are missing or URLs are invalid
 *
 * @example
 * ```typescript
 * import { heroku } from "heroku-ai-provider";
 *
 * const { text } = await generateText({
 *   model: heroku.chat("claude-4-sonnet"),
 *   prompt: "What is the capital of France?"
 * });
 * ```
 *
 * @example
 * ```typescript
 * import { createHerokuAI } from "heroku-ai-provider";
 *
 * const customHeroku = createHerokuAI({ chatApiKey: "my-key" });
 *
 * const { embedding } = await embed({
 *   model: customHeroku.embedding("cohere-embed-multilingual"),
 *   value: "Hello, world!"
 * });
 * ```
 */
export function createHerokuAI(options: HerokuAIOptions = {}) {
  // Validate options parameter
  if (options && typeof options !== "object") {
    throw createValidationError(
      "Options must be an object",
      "options",
      options,
    );
  }

  const chatApiKey =
    options.chatApiKey ??
    getEnvVar("INFERENCE_KEY") ??
    getEnvVar("HEROKU_INFERENCE_KEY");
  const embeddingsApiKey =
    options.embeddingsApiKey ??
    getEnvVar("EMBEDDING_KEY") ??
    getEnvVar("HEROKU_EMBEDDING_KEY");
  const imageApiKey =
    options.imageApiKey ??
    getEnvVar("DIFFUSION_KEY") ??
    getEnvVar("HEROKU_DIFFUSION_KEY");

  // Get base URLs from options or environment, then ensure proper endpoint paths
  // Environment variables typically only provide the domain without the API path
  const CHAT_ENDPOINT = "/v1/chat/completions";
  const EMBEDDINGS_ENDPOINT = "/v1/embeddings";
  const IMAGE_ENDPOINT = "/v1/images/generations";
  const DEFAULT_BASE_URL = "https://us.inference.heroku.com";

  const rawChatBaseUrl =
    options.chatBaseUrl ??
    getEnvVar("INFERENCE_URL") ??
    getEnvVar("HEROKU_INFERENCE_URL") ??
    DEFAULT_BASE_URL;
  const chatBaseUrl = ensureEndpointPath(rawChatBaseUrl, CHAT_ENDPOINT);

  const rawEmbeddingsBaseUrl =
    options.embeddingsBaseUrl ??
    getEnvVar("EMBEDDING_URL") ??
    getEnvVar("HEROKU_EMBEDDING_URL") ??
    DEFAULT_BASE_URL;
  const embeddingsBaseUrl = ensureEndpointPath(
    rawEmbeddingsBaseUrl,
    EMBEDDINGS_ENDPOINT,
  );

  const rawImageBaseUrl =
    options.imageBaseUrl ??
    getEnvVar("DIFFUSION_URL") ??
    getEnvVar("HEROKU_DIFFUSION_URL") ??
    getEnvVar("IMAGES_URL") ??
    getEnvVar("HEROKU_IMAGES_URL") ??
    DEFAULT_BASE_URL;
  const imageBaseUrl = ensureEndpointPath(rawImageBaseUrl, IMAGE_ENDPOINT);

  // Validate that at least one API key is provided
  if (!chatApiKey && !embeddingsApiKey && !imageApiKey) {
    throw createValidationError(
      "At least one API key must be provided. Set INFERENCE_KEY, EMBEDDING_KEY, DIFFUSION_KEY, or provide chatApiKey / embeddingsApiKey / imageApiKey in options. Note: In browser environments, you must provide API keys via options as environment variables are not available.",
      "apiKeys",
      "[REDACTED]",
    );
  }

  // Validate provided URLs if they exist
  if (options.chatBaseUrl) {
    validateUrl(options.chatBaseUrl, "chatBaseUrl");
  }
  if (options.embeddingsBaseUrl) {
    validateUrl(options.embeddingsBaseUrl, "embeddingsBaseUrl");
  }
  if (options.imageBaseUrl) {
    validateUrl(options.imageBaseUrl, "imageBaseUrl");
  }

  return {
    /**
     * Creates a chat language model instance for the specified Heroku model.
     *
     * @param model - The Heroku chat model identifier
     * @returns A HerokuChatLanguageModel instance compatible with AI SDK v5
     *
     * @throws {ValidationError} When chat API key is missing or model is unsupported
     *
     * @example
     * ```typescript
     * const chatModel = heroku.chat("claude-4-sonnet");
     *
     * const { text } = await generateText({
     *   model: chatModel,
     *   prompt: "Explain quantum computing"
     * });
     * ```
     */
    chat: (model: string) => {
      if (!chatApiKey) {
        throw createValidationError(
          "Chat API key is required. Set INFERENCE_KEY environment variable or provide chatApiKey in options. Note: In browser environments, you must provide chatApiKey in options.",
          "chatApiKey",
          "[REDACTED]",
        );
      }

      // Validate model against supported Heroku chat models
      validateChatModel(model);

      return new HerokuChatLanguageModel(model, chatApiKey, chatBaseUrl);
    },

    /**
     * Creates an embedding model instance for the specified Heroku model.
     *
     * @param model - The Heroku embedding model identifier
     * @returns A HerokuEmbeddingModel instance compatible with AI SDK v5
     *
     * @throws {ValidationError} When embeddings API key is missing or model is unsupported
     *
     * @example
     * ```typescript
     * const embeddingModel = heroku.embedding("cohere-embed-multilingual");
     *
     * const { embedding } = await embed({
     *   model: embeddingModel,
     *   value: "Text to embed"
     * });
     * ```
     */
    embedding: (model: string) => {
      if (!embeddingsApiKey) {
        throw createValidationError(
          "Embeddings API key is required. Set EMBEDDING_KEY environment variable or provide embeddingsApiKey in options. Note: In browser environments, you must provide embeddingsApiKey in options.",
          "embeddingsApiKey",
          "[REDACTED]",
        );
      }

      // Validate model against supported Heroku embedding models
      validateEmbeddingModel(model);

      return new HerokuEmbeddingModel(
        model,
        embeddingsApiKey,
        embeddingsBaseUrl,
      );
    },

    /**
     * Creates an image generation model instance for the specified Heroku model.
     *
     * @param model - The Heroku image generation model identifier
     * @returns A HerokuImageModel instance compatible with AI SDK v5
     *
     * @throws {ValidationError} When the image API key is missing or the model identifier is invalid
     *
     * @example
     * ```typescript
     * const imageModel = heroku.image("stable-image-ultra");
     *
     * const { images } = await generateImage({
     *   model: imageModel,
     *   prompt: "A scenic view of mountains during sunrise"
     * });
     * ```
     */
    image: (model: string) => {
      if (!imageApiKey) {
        throw createValidationError(
          "Image API key is required. Set DIFFUSION_KEY environment variable or provide imageApiKey in options. Note: In browser environments, you must provide imageApiKey in options.",
          "imageApiKey",
          "[REDACTED]",
        );
      }

      validateImageModel(model);

      return new HerokuImageModel(model, imageApiKey, imageBaseUrl);
    },
  };
}

/**
 * Validate URL format and protocol
 * @internal
 */
function validateUrl(url: string, paramName: string): void {
  if (!url || typeof url !== "string") {
    throw createValidationError(
      `${paramName} must be a non-empty string`,
      paramName,
      url,
    );
  }

  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw createValidationError(
        `${paramName} must use HTTP or HTTPS protocol`,
        paramName,
        url,
      );
    }
  } catch (urlError) {
    if (urlError instanceof Error && urlError.name === "TypeError") {
      throw createValidationError(
        `${paramName} is not a valid URL format: ${urlError.message}`,
        paramName,
        url,
      );
    }
    throw urlError;
  }
}

/**
 * Validate chat model against Heroku's supported models
 * @internal
 */
function validateChatModel(model: string): void {
  if (!model || typeof model !== "string") {
    throw createValidationError(
      "Model must be a non-empty string",
      "model",
      model,
    );
  }

  if (!isSupportedChatModel(model)) {
    throw createValidationError(
      `Unsupported chat model '${model}'. Supported models: ${getSupportedChatModelsString()}`,
      "model",
      model,
    );
  }
}

/**
 * Validate embedding model against Heroku's supported models
 * @internal
 */
function validateEmbeddingModel(model: string): void {
  if (!model || typeof model !== "string") {
    throw createValidationError(
      "Model must be a non-empty string",
      "model",
      model,
    );
  }

  if (!isSupportedEmbeddingModel(model)) {
    throw createValidationError(
      `Unsupported embedding model '${model}'. Supported models: ${getSupportedEmbeddingModelsString()}`,
      "model",
      model,
    );
  }
}

/**
 * Validate image model identifier for Heroku image generation.
 * @internal
 */
function validateImageModel(model: string): void {
  if (!model || typeof model !== "string") {
    throw createValidationError(
      "Model must be a non-empty string",
      "model",
      model,
    );
  }

  if (model.trim().length === 0) {
    throw createValidationError(
      "Model cannot be empty or whitespace",
      "model",
      model,
    );
  }

  if (!isSupportedImageModel(model)) {
    throw createValidationError(
      `Unsupported image model '${model}'. Supported models: ${getSupportedImageModelsString()}`,
      "model",
      model,
    );
  }
}

/**
 * Default Heroku AI provider instance that lazily reads credentials from environment variables.
 *
 * This proxy defers calling {@link createHerokuAI} until the first property access,
 * which keeps browser environments safe because `process.env` is only touched at runtime.
 */
let _heroku: ReturnType<typeof createHerokuAI> | null = null;
export const heroku = new Proxy({} as ReturnType<typeof createHerokuAI>, {
  get(_, prop) {
    if (!_heroku) {
      _heroku = createHerokuAI();
    }

    return (_heroku as Record<PropertyKey, unknown>)[prop as PropertyKey];
  },
});

/**
 * @deprecated Use {@link createHerokuAI} instead.
 */
export const createHerokuProvider = createHerokuAI;

// Export the models and types for direct use
export { HerokuChatLanguageModel } from "./models/chat.js";
export {
  HerokuEmbeddingModel,
  createEmbedFunction,
} from "./models/embedding.js";
export { HerokuImageModel } from "./models/image.js";
export type { EmbeddingOptions } from "./models/embedding.js";

// Export error handling utilities
export {
  createUserFriendlyError,
  formatUserFriendlyError,
  createSimpleErrorMessage,
  createDetailedErrorReport,
  isConfigurationError,
  isTemporaryServiceError,
  getContextualHelp,
  type UserFriendlyError,
} from "./utils/user-friendly-errors.js";

export {
  HerokuErrorType,
  ErrorSeverity,
  ErrorCategory,
  type HerokuErrorResponse,
  type ErrorMetadata,
} from "./utils/error-types.js";

// Export supported models utilities
export {
  SUPPORTED_CHAT_MODELS,
  SUPPORTED_EMBEDDING_MODELS,
  SUPPORTED_IMAGE_MODELS,
  fetchAvailableModels,
  getSupportedChatModels,
  getSupportedEmbeddingModels,
  getSupportedImageModels,
  isSupportedChatModel,
  isSupportedEmbeddingModel,
  isSupportedImageModel,
  type HerokuModelInfo,
  type HerokuModelType,
} from "./utils/supported-models.js";
