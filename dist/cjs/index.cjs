"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSupportedImageModel = exports.isSupportedEmbeddingModel = exports.isSupportedChatModel = exports.getSupportedImageModels = exports.getSupportedEmbeddingModels = exports.getSupportedChatModels = exports.fetchAvailableModels = exports.SUPPORTED_IMAGE_MODELS = exports.SUPPORTED_EMBEDDING_MODELS = exports.SUPPORTED_CHAT_MODELS = exports.ErrorCategory = exports.ErrorSeverity = exports.HerokuErrorType = exports.getContextualHelp = exports.isTemporaryServiceError = exports.isConfigurationError = exports.createDetailedErrorReport = exports.createSimpleErrorMessage = exports.formatUserFriendlyError = exports.createUserFriendlyError = exports.HerokuImageModel = exports.createEmbedFunction = exports.HerokuEmbeddingModel = exports.HerokuChatLanguageModel = exports.createHerokuProvider = exports.heroku = void 0;
exports.ensureEndpointPath = ensureEndpointPath;
exports.createHerokuAI = createHerokuAI;
const chat_js_1 = require('./models/chat.cjs');
const embedding_js_1 = require('./models/embedding.cjs');
const image_js_1 = require('./models/image.cjs');
const error_handling_js_1 = require('./utils/error-handling.cjs');
const supported_models_js_1 = require('./utils/supported-models.cjs');
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
function ensureEndpointPath(baseUrl, endpointPath) {
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
    }
    catch {
        // If URL parsing fails, fall back to simple string check
        if (normalizedBase.includes(normalizedEndpoint)) {
            return normalizedBase;
        }
    }
    // Append the endpoint path
    return `${normalizedBase}${normalizedEndpoint}`;
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
function createHerokuAI(options = {}) {
    // Validate options parameter
    if (options && typeof options !== "object") {
        throw (0, error_handling_js_1.createValidationError)("Options must be an object", "options", options);
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
    // Get base URLs from options or environment, then ensure proper endpoint paths
    // Environment variables typically only provide the domain without the API path
    const CHAT_ENDPOINT = "/v1/chat/completions";
    const EMBEDDINGS_ENDPOINT = "/v1/embeddings";
    const IMAGE_ENDPOINT = "/v1/images/generations";
    const DEFAULT_BASE_URL = "https://us.inference.heroku.com";
    const rawChatBaseUrl = options.chatBaseUrl ??
        getEnvVar("INFERENCE_URL") ??
        getEnvVar("HEROKU_INFERENCE_URL") ??
        DEFAULT_BASE_URL;
    const chatBaseUrl = ensureEndpointPath(rawChatBaseUrl, CHAT_ENDPOINT);
    const rawEmbeddingsBaseUrl = options.embeddingsBaseUrl ??
        getEnvVar("EMBEDDING_URL") ??
        getEnvVar("HEROKU_EMBEDDING_URL") ??
        DEFAULT_BASE_URL;
    const embeddingsBaseUrl = ensureEndpointPath(rawEmbeddingsBaseUrl, EMBEDDINGS_ENDPOINT);
    const rawImageBaseUrl = options.imageBaseUrl ??
        getEnvVar("DIFFUSION_URL") ??
        getEnvVar("HEROKU_DIFFUSION_URL") ??
        getEnvVar("IMAGES_URL") ??
        getEnvVar("HEROKU_IMAGES_URL") ??
        DEFAULT_BASE_URL;
    const imageBaseUrl = ensureEndpointPath(rawImageBaseUrl, IMAGE_ENDPOINT);
    // Validate that at least one API key is provided
    if (!chatApiKey && !embeddingsApiKey && !imageApiKey) {
        throw (0, error_handling_js_1.createValidationError)("At least one API key must be provided. Set INFERENCE_KEY, EMBEDDING_KEY, DIFFUSION_KEY, or provide chatApiKey / embeddingsApiKey / imageApiKey in options. Note: In browser environments, you must provide API keys via options as environment variables are not available.", "apiKeys", "[REDACTED]");
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
                throw (0, error_handling_js_1.createValidationError)("Chat API key is required. Set INFERENCE_KEY environment variable or provide chatApiKey in options. Note: In browser environments, you must provide chatApiKey in options.", "chatApiKey", "[REDACTED]");
            }
            // Validate model against supported Heroku chat models
            validateChatModel(model);
            return new chat_js_1.HerokuChatLanguageModel(model, chatApiKey, chatBaseUrl);
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
                throw (0, error_handling_js_1.createValidationError)("Embeddings API key is required. Set EMBEDDING_KEY environment variable or provide embeddingsApiKey in options. Note: In browser environments, you must provide embeddingsApiKey in options.", "embeddingsApiKey", "[REDACTED]");
            }
            // Validate model against supported Heroku embedding models
            validateEmbeddingModel(model);
            return new embedding_js_1.HerokuEmbeddingModel(model, embeddingsApiKey, embeddingsBaseUrl);
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
                throw (0, error_handling_js_1.createValidationError)("Image API key is required. Set DIFFUSION_KEY environment variable or provide imageApiKey in options. Note: In browser environments, you must provide imageApiKey in options.", "imageApiKey", "[REDACTED]");
            }
            validateImageModel(model);
            return new image_js_1.HerokuImageModel(model, imageApiKey, imageBaseUrl);
        },
    };
}
/**
 * Validate URL format and protocol
 * @internal
 */
function validateUrl(url, paramName) {
    if (!url || typeof url !== "string") {
        throw (0, error_handling_js_1.createValidationError)(`${paramName} must be a non-empty string`, paramName, url);
    }
    try {
        const parsedUrl = new URL(url);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            throw (0, error_handling_js_1.createValidationError)(`${paramName} must use HTTP or HTTPS protocol`, paramName, url);
        }
    }
    catch (urlError) {
        if (urlError instanceof Error && urlError.name === "TypeError") {
            throw (0, error_handling_js_1.createValidationError)(`${paramName} is not a valid URL format: ${urlError.message}`, paramName, url);
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
        throw (0, error_handling_js_1.createValidationError)("Model must be a non-empty string", "model", model);
    }
    if (!(0, supported_models_js_1.isSupportedChatModel)(model)) {
        throw (0, error_handling_js_1.createValidationError)(`Unsupported chat model '${model}'. Supported models: ${(0, supported_models_js_1.getSupportedChatModelsString)()}`, "model", model);
    }
}
/**
 * Validate embedding model against Heroku's supported models
 * @internal
 */
function validateEmbeddingModel(model) {
    if (!model || typeof model !== "string") {
        throw (0, error_handling_js_1.createValidationError)("Model must be a non-empty string", "model", model);
    }
    if (!(0, supported_models_js_1.isSupportedEmbeddingModel)(model)) {
        throw (0, error_handling_js_1.createValidationError)(`Unsupported embedding model '${model}'. Supported models: ${(0, supported_models_js_1.getSupportedEmbeddingModelsString)()}`, "model", model);
    }
}
/**
 * Validate image model identifier for Heroku image generation.
 * @internal
 */
function validateImageModel(model) {
    if (!model || typeof model !== "string") {
        throw (0, error_handling_js_1.createValidationError)("Model must be a non-empty string", "model", model);
    }
    if (model.trim().length === 0) {
        throw (0, error_handling_js_1.createValidationError)("Model cannot be empty or whitespace", "model", model);
    }
    if (!(0, supported_models_js_1.isSupportedImageModel)(model)) {
        throw (0, error_handling_js_1.createValidationError)(`Unsupported image model '${model}'. Supported models: ${(0, supported_models_js_1.getSupportedImageModelsString)()}`, "model", model);
    }
}
/**
 * Default Heroku AI provider instance that lazily reads credentials from environment variables.
 *
 * This proxy defers calling {@link createHerokuAI} until the first property access,
 * which keeps browser environments safe because `process.env` is only touched at runtime.
 */
let _heroku = null;
exports.heroku = new Proxy({}, {
    get(_, prop) {
        if (!_heroku) {
            _heroku = createHerokuAI();
        }
        return _heroku[prop];
    },
});
/**
 * @deprecated Use {@link createHerokuAI} instead.
 */
exports.createHerokuProvider = createHerokuAI;
// Export the models and types for direct use
var chat_js_2 = require('./models/chat.cjs');
Object.defineProperty(exports, "HerokuChatLanguageModel", { enumerable: true, get: function () { return chat_js_2.HerokuChatLanguageModel; } });
var embedding_js_2 = require('./models/embedding.cjs');
Object.defineProperty(exports, "HerokuEmbeddingModel", { enumerable: true, get: function () { return embedding_js_2.HerokuEmbeddingModel; } });
Object.defineProperty(exports, "createEmbedFunction", { enumerable: true, get: function () { return embedding_js_2.createEmbedFunction; } });
var image_js_2 = require('./models/image.cjs');
Object.defineProperty(exports, "HerokuImageModel", { enumerable: true, get: function () { return image_js_2.HerokuImageModel; } });
// Export error handling utilities
var user_friendly_errors_js_1 = require('./utils/user-friendly-errors.cjs');
Object.defineProperty(exports, "createUserFriendlyError", { enumerable: true, get: function () { return user_friendly_errors_js_1.createUserFriendlyError; } });
Object.defineProperty(exports, "formatUserFriendlyError", { enumerable: true, get: function () { return user_friendly_errors_js_1.formatUserFriendlyError; } });
Object.defineProperty(exports, "createSimpleErrorMessage", { enumerable: true, get: function () { return user_friendly_errors_js_1.createSimpleErrorMessage; } });
Object.defineProperty(exports, "createDetailedErrorReport", { enumerable: true, get: function () { return user_friendly_errors_js_1.createDetailedErrorReport; } });
Object.defineProperty(exports, "isConfigurationError", { enumerable: true, get: function () { return user_friendly_errors_js_1.isConfigurationError; } });
Object.defineProperty(exports, "isTemporaryServiceError", { enumerable: true, get: function () { return user_friendly_errors_js_1.isTemporaryServiceError; } });
Object.defineProperty(exports, "getContextualHelp", { enumerable: true, get: function () { return user_friendly_errors_js_1.getContextualHelp; } });
var error_types_js_1 = require('./utils/error-types.cjs');
Object.defineProperty(exports, "HerokuErrorType", { enumerable: true, get: function () { return error_types_js_1.HerokuErrorType; } });
Object.defineProperty(exports, "ErrorSeverity", { enumerable: true, get: function () { return error_types_js_1.ErrorSeverity; } });
Object.defineProperty(exports, "ErrorCategory", { enumerable: true, get: function () { return error_types_js_1.ErrorCategory; } });
// Export supported models utilities
var supported_models_js_2 = require('./utils/supported-models.cjs');
Object.defineProperty(exports, "SUPPORTED_CHAT_MODELS", { enumerable: true, get: function () { return supported_models_js_2.SUPPORTED_CHAT_MODELS; } });
Object.defineProperty(exports, "SUPPORTED_EMBEDDING_MODELS", { enumerable: true, get: function () { return supported_models_js_2.SUPPORTED_EMBEDDING_MODELS; } });
Object.defineProperty(exports, "SUPPORTED_IMAGE_MODELS", { enumerable: true, get: function () { return supported_models_js_2.SUPPORTED_IMAGE_MODELS; } });
Object.defineProperty(exports, "fetchAvailableModels", { enumerable: true, get: function () { return supported_models_js_2.fetchAvailableModels; } });
Object.defineProperty(exports, "getSupportedChatModels", { enumerable: true, get: function () { return supported_models_js_2.getSupportedChatModels; } });
Object.defineProperty(exports, "getSupportedEmbeddingModels", { enumerable: true, get: function () { return supported_models_js_2.getSupportedEmbeddingModels; } });
Object.defineProperty(exports, "getSupportedImageModels", { enumerable: true, get: function () { return supported_models_js_2.getSupportedImageModels; } });
Object.defineProperty(exports, "isSupportedChatModel", { enumerable: true, get: function () { return supported_models_js_2.isSupportedChatModel; } });
Object.defineProperty(exports, "isSupportedEmbeddingModel", { enumerable: true, get: function () { return supported_models_js_2.isSupportedEmbeddingModel; } });
Object.defineProperty(exports, "isSupportedImageModel", { enumerable: true, get: function () { return supported_models_js_2.isSupportedImageModel; } });
//# sourceMappingURL=index.js.map