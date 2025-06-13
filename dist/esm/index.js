// Placeholder imports (to be implemented)
import { HerokuChatLanguageModel } from "./models/chat.js";
import { HerokuEmbeddingModel } from "./models/embedding.js";
import { createValidationError } from "./utils/error-handling.js";
export function createHerokuProvider(settings = {}) {
    // Validate settings parameter
    if (settings && typeof settings !== "object") {
        throw createValidationError("Settings must be an object", "settings", settings);
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
        throw createValidationError("At least one API key must be provided. Set HEROKU_INFERENCE_KEY or HEROKU_EMBEDDING_KEY environment variables, or provide chatApiKey or embeddingsApiKey in settings.", "apiKeys", "[REDACTED]");
    }
    // Validate provided URLs if they exist
    if (settings.chatBaseUrl) {
        validateUrl(settings.chatBaseUrl, "chatBaseUrl");
    }
    if (settings.embeddingsBaseUrl) {
        validateUrl(settings.embeddingsBaseUrl, "embeddingsBaseUrl");
    }
    return {
        chat: (model) => {
            if (!chatApiKey) {
                throw createValidationError("Chat API key is required. Set HEROKU_INFERENCE_KEY environment variable or provide chatApiKey in settings.", "chatApiKey", "[REDACTED]");
            }
            // Validate model against supported Heroku chat models
            validateChatModel(model);
            return new HerokuChatLanguageModel(model, chatApiKey, chatBaseUrl);
        },
        embedding: (model) => {
            if (!embeddingsApiKey) {
                throw createValidationError("Embeddings API key is required. Set HEROKU_EMBEDDING_KEY environment variable or provide embeddingsApiKey in settings.", "embeddingsApiKey", "[REDACTED]");
            }
            // Validate model against supported Heroku embedding models
            validateEmbeddingModel(model);
            return new HerokuEmbeddingModel(model, embeddingsApiKey, embeddingsBaseUrl);
        },
    };
}
/**
 * Validate URL format and protocol
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
 */
function validateChatModel(model) {
    if (!model || typeof model !== "string") {
        throw createValidationError("Model must be a non-empty string", "model", model);
    }
    const supportedChatModels = [
        "claude-3-5-sonnet-latest",
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
// Export the models and types for direct use
export { HerokuChatLanguageModel } from "./models/chat.js";
export { HerokuEmbeddingModel, createEmbedFunction, } from "./models/embedding.js";
// Export error handling utilities
export { createUserFriendlyError, formatUserFriendlyError, createSimpleErrorMessage, createDetailedErrorReport, isConfigurationError, isTemporaryServiceError, getContextualHelp, } from "./utils/user-friendly-errors.js";
export { HerokuErrorType, ErrorSeverity, ErrorCategory, } from "./utils/error-types.js";
//# sourceMappingURL=index.js.map