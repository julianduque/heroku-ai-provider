import { HerokuChatLanguageModel } from "./models/chat.js";
import { HerokuEmbeddingModel } from "./models/embedding.js";
import { HerokuImageModel } from "./models/image.js";
import { createValidationError } from "./utils/error-handling.js";
/**
 * Safely access environment variables in both Node.js and browser environments.
 * In browsers, process.env may not be available, so this function handles that gracefully.
 * @internal
 */
function getEnvVar(key) {
    if (typeof process !== "undefined" &&
        process.env &&
        typeof process.env === "object") {
        return process.env[key];
    }
    return undefined;
}
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
export function createHerokuAI(options = {}) {
    // Validate options parameter
    if (options && typeof options !== "object") {
        throw createValidationError("Options must be an object", "options", options);
    }
    const chatApiKey = options.chatApiKey ??
        getEnvVar("INFERENCE_KEY") ??
        getEnvVar("HEROKU_INFERENCE_KEY");
    const embeddingsApiKey = options.embeddingsApiKey ??
        getEnvVar("EMBEDDING_KEY") ??
        getEnvVar("HEROKU_EMBEDDING_KEY");
    const imageApiKey = options.imageApiKey ??
        getEnvVar("DIFFUSION_KEY") ??
        getEnvVar("HEROKU_DIFFUSION_KEY");
    const chatBaseUrl = options.chatBaseUrl ??
        getEnvVar("INFERENCE_URL") ??
        getEnvVar("HEROKU_INFERENCE_URL") ??
        "https://us.inference.heroku.com/v1/chat/completions";
    const embeddingsBaseUrl = options.embeddingsBaseUrl ??
        getEnvVar("EMBEDDING_URL") ??
        getEnvVar("HEROKU_EMBEDDING_URL") ??
        "https://us.inference.heroku.com/v1/embeddings";
    const imageBaseUrl = options.imageBaseUrl ??
        getEnvVar("DIFFUSION_URL") ??
        getEnvVar("HEROKU_DIFFUSION_URL") ??
        getEnvVar("IMAGES_URL") ??
        getEnvVar("HEROKU_IMAGES_URL") ??
        "https://us.inference.heroku.com/v1/images/generations";
    // Validate that at least one API key is provided
    if (!chatApiKey && !embeddingsApiKey && !imageApiKey) {
        throw createValidationError("At least one API key must be provided. Set INFERENCE_KEY, EMBEDDING_KEY, DIFFUSION_KEY, or provide chatApiKey / embeddingsApiKey / imageApiKey in options. Note: In browser environments, you must provide API keys via options as environment variables are not available.", "apiKeys", "[REDACTED]");
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
        chat: (model) => {
            if (!chatApiKey) {
                throw createValidationError("Chat API key is required. Set INFERENCE_KEY environment variable or provide chatApiKey in options. Note: In browser environments, you must provide chatApiKey in options.", "chatApiKey", "[REDACTED]");
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
        embedding: (model) => {
            if (!embeddingsApiKey) {
                throw createValidationError("Embeddings API key is required. Set EMBEDDING_KEY environment variable or provide embeddingsApiKey in options. Note: In browser environments, you must provide embeddingsApiKey in options.", "embeddingsApiKey", "[REDACTED]");
            }
            // Validate model against supported Heroku embedding models
            validateEmbeddingModel(model);
            return new HerokuEmbeddingModel(model, embeddingsApiKey, embeddingsBaseUrl);
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
        image: (model) => {
            if (!imageApiKey) {
                throw createValidationError("Image API key is required. Set DIFFUSION_KEY environment variable or provide imageApiKey in options. Note: In browser environments, you must provide imageApiKey in options.", "imageApiKey", "[REDACTED]");
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
function validateUrl(url, paramName) {
    if (!url || typeof url !== "string") {
        throw createValidationError(`${paramName} must be a non-empty string`, paramName, url);
    }
    try {
        const parsedUrl = new URL(url);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            throw createValidationError(`${paramName} must use HTTP or HTTPS protocol`, paramName, url);
        }
    }
    catch (urlError) {
        if (urlError instanceof Error && urlError.name === "TypeError") {
            throw createValidationError(`${paramName} is not a valid URL format: ${urlError.message}`, paramName, url);
        }
        throw urlError;
    }
}
/**
 * Validate chat model against Heroku's supported models
 * @internal
 */
function validateChatModel(model) {
    if (!model || typeof model !== "string") {
        throw createValidationError("Model must be a non-empty string", "model", model);
    }
    const supportedChatModels = [
        "claude-4-sonnet",
        "claude-3-haiku",
        "claude-4-sonnet",
        "claude-3-7-sonnet",
        "claude-3-5-haiku",
    ];
    if (!supportedChatModels.includes(model)) {
        throw createValidationError(`Unsupported chat model '${model}'. Supported models: ${supportedChatModels.join(", ")}`, "model", model);
    }
}
/**
 * Validate embedding model against Heroku's supported models
 * @internal
 */
function validateEmbeddingModel(model) {
    if (!model || typeof model !== "string") {
        throw createValidationError("Model must be a non-empty string", "model", model);
    }
    const supportedEmbeddingModels = ["cohere-embed-multilingual"];
    if (!supportedEmbeddingModels.includes(model)) {
        throw createValidationError(`Unsupported embedding model '${model}'. Supported models: ${supportedEmbeddingModels.join(", ")}`, "model", model);
    }
}
/**
 * Validate image model identifier for Heroku image generation.
 * @internal
 */
function validateImageModel(model) {
    if (!model || typeof model !== "string") {
        throw createValidationError("Model must be a non-empty string", "model", model);
    }
    if (model.trim().length === 0) {
        throw createValidationError("Model cannot be empty or whitespace", "model", model);
    }
    const supportedImageModels = ["stable-image-ultra"];
    if (!supportedImageModels.includes(model)) {
        throw createValidationError(`Unsupported image model '${model}'. Supported models: ${supportedImageModels.join(", ")}`, "model", model);
    }
}
/**
 * Default Heroku AI provider instance that reads credentials from environment variables.
 */
export const heroku = createHerokuAI();
/**
 * @deprecated Use {@link createHerokuAI} instead.
 */
export const createHerokuProvider = createHerokuAI;
// Export the models and types for direct use
export { HerokuChatLanguageModel } from "./models/chat.js";
export { HerokuEmbeddingModel, createEmbedFunction, } from "./models/embedding.js";
export { HerokuImageModel } from "./models/image.js";
// Export error handling utilities
export { createUserFriendlyError, formatUserFriendlyError, createSimpleErrorMessage, createDetailedErrorReport, isConfigurationError, isTemporaryServiceError, getContextualHelp, } from "./utils/user-friendly-errors.js";
export { HerokuErrorType, ErrorSeverity, ErrorCategory, } from "./utils/error-types.js";
//# sourceMappingURL=index.js.map