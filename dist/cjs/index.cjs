"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCategory = exports.ErrorSeverity = exports.HerokuErrorType = exports.getContextualHelp = exports.isTemporaryServiceError = exports.isConfigurationError = exports.createDetailedErrorReport = exports.createSimpleErrorMessage = exports.formatUserFriendlyError = exports.createUserFriendlyError = exports.createEmbedFunction = exports.HerokuEmbeddingModel = exports.HerokuChatLanguageModel = void 0;
exports.createHerokuProvider = createHerokuProvider;
// Placeholder imports (to be implemented)
const chat_js_1 = require('./models/chat.cjs');
const embedding_js_1 = require('./models/embedding.cjs');
const error_handling_js_1 = require('./utils/error-handling.cjs');
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
        chat: (model) => {
            if (!chatApiKey) {
                throw (0, error_handling_js_1.createValidationError)("Chat API key is required. Set HEROKU_INFERENCE_KEY environment variable or provide chatApiKey in settings.", "chatApiKey", "[REDACTED]");
            }
            // Validate model against supported Heroku chat models
            validateChatModel(model);
            return new chat_js_1.HerokuChatLanguageModel(model, chatApiKey, chatBaseUrl);
        },
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