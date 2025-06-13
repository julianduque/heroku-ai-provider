"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCategory = exports.ErrorSeverity = exports.HerokuErrorType = exports.getContextualHelp = exports.isTemporaryServiceError = exports.isConfigurationError = exports.createDetailedErrorReport = exports.createSimpleErrorMessage = exports.formatUserFriendlyError = exports.createUserFriendlyError = exports.createEmbedFunction = exports.HerokuEmbeddingModel = exports.HerokuChatLanguageModel = void 0;
exports.createHerokuProvider = createHerokuProvider;
// Placeholder imports (to be implemented)
const chat_js_1 = require('./models/chat.cjs');
const embedding_js_1 = require('./models/embedding.cjs');
const error_handling_js_1 = require('./utils/error-handling.cjs');
/**
 * Creates a Heroku provider instance for the Vercel AI SDK.
 *
 * This provider enables seamless integration with Heroku's AI inference services,
 * supporting both chat completions and embeddings through the Vercel AI SDK interface.
 *
 * @param settings - Configuration settings for the provider
 * @returns An object with methods to access chat and embedding models
 *
 * @throws {ValidationError} When API keys are missing or URLs are invalid
 *
 * @example
 * Basic usage with environment variables:
 * ```typescript
 * import { generateText } from "ai";
 * import { createHerokuProvider } from "heroku-ai-provider";
 *
 * const heroku = createHerokuProvider();
 *
 * const { text } = await generateText({
 *   model: heroku.chat("claude-3-5-sonnet-latest"),
 *   prompt: "What is the capital of France?"
 * });
 * ```
 *
 * @example
 * Advanced usage with tool calling:
 * ```typescript
 * import { generateText, tool } from "ai";
 * import { createHerokuProvider } from "heroku-ai-provider";
 * import { z } from "zod";
 *
 * const heroku = createHerokuProvider();
 *
 * const { text } = await generateText({
 *   model: heroku.chat("claude-3-5-sonnet-latest"),
 *   prompt: "What's the weather like in New York?",
 *   tools: {
 *     getWeather: tool({
 *       description: "Get current weather for a location",
 *       parameters: z.object({
 *         location: z.string().describe("The city name")
 *       }),
 *       execute: async ({ location }) => {
 *         // Your weather API call here
 *         return { temperature: 72, condition: "sunny" };
 *       }
 *     })
 *   },
 *   maxSteps: 5 // Enable multi-step tool conversations
 * });
 * ```
 *
 * @example
 * Streaming chat with error handling:
 * ```typescript
 * import { streamText } from "ai";
 * import { createHerokuProvider, isConfigurationError } from "heroku-ai-provider";
 *
 * try {
 *   const heroku = createHerokuProvider();
 *
 *   const { textStream } = await streamText({
 *     model: heroku.chat("claude-3-haiku"),
 *     prompt: "Write a short story about AI"
 *   });
 *
 *   for await (const delta of textStream) {
 *     process.stdout.write(delta);
 *   }
 * } catch (error) {
 *   if (isConfigurationError(error)) {
 *     console.error("Configuration issue:", error.message);
 *   }
 * }
 * ```
 *
 * @example
 * Embeddings usage:
 * ```typescript
 * import { embed, embedMany } from "ai";
 * import { createHerokuProvider } from "heroku-ai-provider";
 *
 * const heroku = createHerokuProvider();
 *
 * // Single embedding
 * const { embedding } = await embed({
 *   model: heroku.embedding("cohere-embed-multilingual"),
 *   value: "Hello, world!"
 * });
 *
 * // Multiple embeddings
 * const { embeddings } = await embedMany({
 *   model: heroku.embedding("cohere-embed-multilingual"),
 *   values: ["First text", "Second text", "Third text"]
 * });
 * ```
 */
function createHerokuProvider(settings = {}) {
    // Validate settings parameter
    if (settings && typeof settings !== "object") {
        throw (0, error_handling_js_1.createValidationError)("Settings must be an object", "settings", settings);
    }
    const chatApiKey = settings.chatApiKey || process.env.HEROKU_INFERENCE_KEY;
    const embeddingsApiKey = settings.embeddingsApiKey || process.env.HEROKU_EMBEDDING_KEY;
    const chatBaseUrl = settings.chatBaseUrl ||
        process.env.HEROKU_INFERENCE_URL ||
        "https://us.inference.heroku.com/v1/chat/completions";
    const embeddingsBaseUrl = settings.embeddingsBaseUrl ||
        process.env.HEROKU_EMBEDDING_URL ||
        "https://us.inference.heroku.com/v1/embeddings";
    // Validate that at least one API key is provided
    if (!chatApiKey && !embeddingsApiKey) {
        throw (0, error_handling_js_1.createValidationError)("At least one API key must be provided. Set HEROKU_INFERENCE_KEY or HEROKU_EMBEDDING_KEY environment variables, or provide chatApiKey or embeddingsApiKey in settings.", "apiKeys", "[REDACTED]");
    }
    // Validate provided URLs if they exist
    if (settings.chatBaseUrl) {
        validateUrl(settings.chatBaseUrl, "chatBaseUrl");
    }
    if (settings.embeddingsBaseUrl) {
        validateUrl(settings.embeddingsBaseUrl, "embeddingsBaseUrl");
    }
    return {
        /**
         * Creates a chat language model instance for the specified Heroku model.
         *
         * @param model - The Heroku chat model identifier
         * @returns A HerokuChatLanguageModel instance compatible with AI SDK v1.1.3
         *
         * @throws {ValidationError} When chat API key is missing or model is unsupported
         *
         * @example
         * ```typescript
         * const chatModel = heroku.chat("claude-3-5-sonnet-latest");
         *
         * const { text } = await generateText({
         *   model: chatModel,
         *   prompt: "Explain quantum computing"
         * });
         * ```
         */
        chat: (model) => {
            if (!chatApiKey) {
                throw (0, error_handling_js_1.createValidationError)("Chat API key is required. Set HEROKU_INFERENCE_KEY environment variable or provide chatApiKey in settings.", "chatApiKey", "[REDACTED]");
            }
            // Validate model against supported Heroku chat models
            validateChatModel(model);
            return new chat_js_1.HerokuChatLanguageModel(model, chatApiKey, chatBaseUrl);
        },
        /**
         * Creates an embedding model instance for the specified Heroku model.
         *
         * @param model - The Heroku embedding model identifier
         * @returns A HerokuEmbeddingModel instance compatible with AI SDK v1.1.3
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
                throw (0, error_handling_js_1.createValidationError)("Embeddings API key is required. Set HEROKU_EMBEDDING_KEY environment variable or provide embeddingsApiKey in settings.", "embeddingsApiKey", "[REDACTED]");
            }
            // Validate model against supported Heroku embedding models
            validateEmbeddingModel(model);
            return new embedding_js_1.HerokuEmbeddingModel(model, embeddingsApiKey, embeddingsBaseUrl);
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
    const supportedChatModels = [
        "claude-3-5-sonnet-latest",
        "claude-3-haiku",
        "claude-4-sonnet",
        "claude-3-7-sonnet",
        "claude-3-5-haiku",
    ];
    if (!supportedChatModels.includes(model)) {
        throw (0, error_handling_js_1.createValidationError)(`Unsupported chat model '${model}'. Supported models: ${supportedChatModels.join(", ")}`, "model", model);
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
    const supportedEmbeddingModels = ["cohere-embed-multilingual"];
    if (!supportedEmbeddingModels.includes(model)) {
        throw (0, error_handling_js_1.createValidationError)(`Unsupported embedding model '${model}'. Supported models: ${supportedEmbeddingModels.join(", ")}`, "model", model);
    }
}
// Export the models and types for direct use
var chat_js_2 = require('./models/chat.cjs');
Object.defineProperty(exports, "HerokuChatLanguageModel", { enumerable: true, get: function () { return chat_js_2.HerokuChatLanguageModel; } });
var embedding_js_2 = require('./models/embedding.cjs');
Object.defineProperty(exports, "HerokuEmbeddingModel", { enumerable: true, get: function () { return embedding_js_2.HerokuEmbeddingModel; } });
Object.defineProperty(exports, "createEmbedFunction", { enumerable: true, get: function () { return embedding_js_2.createEmbedFunction; } });
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
//# sourceMappingURL=index.js.map