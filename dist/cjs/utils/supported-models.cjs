"use strict";
/**
 * Centralized module for managing Heroku AI supported models.
 *
 * This module provides:
 * - Static fallback lists for all model types
 * - Dynamic fetching from the Heroku API
 * - Validation utilities
 *
 * @module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_IMAGE_MODELS = exports.SUPPORTED_EMBEDDING_MODELS = exports.SUPPORTED_CHAT_MODELS = void 0;
exports.fetchAvailableModels = fetchAvailableModels;
exports.getSupportedChatModels = getSupportedChatModels;
exports.getSupportedEmbeddingModels = getSupportedEmbeddingModels;
exports.getSupportedImageModels = getSupportedImageModels;
exports.isSupportedChatModel = isSupportedChatModel;
exports.isSupportedEmbeddingModel = isSupportedEmbeddingModel;
exports.isSupportedImageModel = isSupportedImageModel;
exports.getSupportedChatModelsString = getSupportedChatModelsString;
exports.getSupportedEmbeddingModelsString = getSupportedEmbeddingModelsString;
exports.getSupportedImageModelsString = getSupportedImageModelsString;
exports.clearModelCache = clearModelCache;
/**
 * URL for fetching available models from Heroku.
 */
const AVAILABLE_MODELS_URL = "https://us.inference.heroku.com/available-models";
/**
 * Static fallback list of supported chat models (text-to-text).
 * Used when the API is unavailable or for synchronous validation.
 *
 * Last updated from: https://us.inference.heroku.com/available-models
 */
exports.SUPPORTED_CHAT_MODELS = Object.freeze([
    "claude-3-5-haiku",
    "claude-3-5-sonnet-latest",
    "claude-3-7-sonnet",
    "claude-3-haiku",
    "claude-4-5-haiku",
    "claude-4-5-sonnet",
    "claude-4-sonnet",
    "gpt-oss-120b",
    "nova-lite",
    "nova-pro",
]);
/**
 * Static fallback list of supported embedding models (text-to-embedding).
 */
exports.SUPPORTED_EMBEDDING_MODELS = Object.freeze([
    "cohere-embed-multilingual",
]);
/**
 * Static fallback list of supported image models (text-to-image).
 */
exports.SUPPORTED_IMAGE_MODELS = Object.freeze([
    "stable-image-ultra",
]);
/**
 * Cache for dynamically fetched models with TTL.
 */
let cachedModels = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
/**
 * Fetches the list of available models from Heroku's API.
 *
 * @param options - Fetch options
 * @param options.timeout - Request timeout in milliseconds (default: 5000)
 * @param options.useCache - Whether to use cached results (default: true)
 * @returns Array of model info objects, or null if fetch fails
 *
 * @example
 * ```typescript
 * const models = await fetchAvailableModels();
 * if (models) {
 *   const chatModels = models.filter(m => m.type.includes("text-to-text"));
 *   console.log("Available chat models:", chatModels.map(m => m.model_id));
 * }
 * ```
 */
async function fetchAvailableModels(options) {
    const { timeout = 5000, useCache = true } = options ?? {};
    // Return cached models if valid
    if (useCache && cachedModels && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
        return cachedModels;
    }
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(AVAILABLE_MODELS_URL, {
            method: "GET",
            signal: controller.signal,
            headers: {
                Accept: "application/json",
            },
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            console.warn(`Failed to fetch available models: HTTP ${response.status}`);
            return null;
        }
        const data = (await response.json());
        if (!Array.isArray(data)) {
            console.warn("Invalid response format from available-models endpoint");
            return null;
        }
        // Update cache
        cachedModels = data;
        cacheTimestamp = Date.now();
        return data;
    }
    catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            console.warn("Fetching available models timed out");
        }
        else {
            console.warn("Failed to fetch available models:", error);
        }
        return null;
    }
}
/**
 * Gets the list of supported chat models, attempting to fetch from API first.
 *
 * @param options - Options for fetching
 * @returns Array of supported chat model IDs
 *
 * @example
 * ```typescript
 * const chatModels = await getSupportedChatModels();
 * console.log("Supported chat models:", chatModels);
 * ```
 */
async function getSupportedChatModels(options) {
    const models = await fetchAvailableModels(options);
    if (models) {
        const chatModels = models
            .filter((m) => m.type.includes("text-to-text"))
            .map((m) => m.model_id);
        if (chatModels.length > 0) {
            return chatModels;
        }
    }
    // Fallback to static list
    return [...exports.SUPPORTED_CHAT_MODELS];
}
/**
 * Gets the list of supported embedding models, attempting to fetch from API first.
 *
 * @param options - Options for fetching
 * @returns Array of supported embedding model IDs
 */
async function getSupportedEmbeddingModels(options) {
    const models = await fetchAvailableModels(options);
    if (models) {
        const embeddingModels = models
            .filter((m) => m.type.includes("text-to-embedding"))
            .map((m) => m.model_id);
        if (embeddingModels.length > 0) {
            return embeddingModels;
        }
    }
    // Fallback to static list
    return [...exports.SUPPORTED_EMBEDDING_MODELS];
}
/**
 * Gets the list of supported image models, attempting to fetch from API first.
 *
 * @param options - Options for fetching
 * @returns Array of supported image model IDs
 */
async function getSupportedImageModels(options) {
    const models = await fetchAvailableModels(options);
    if (models) {
        const imageModels = models
            .filter((m) => m.type.includes("text-to-image"))
            .map((m) => m.model_id);
        if (imageModels.length > 0) {
            return imageModels;
        }
    }
    // Fallback to static list
    return [...exports.SUPPORTED_IMAGE_MODELS];
}
/**
 * Synchronously checks if a model is a supported chat model.
 * Uses the static fallback list for immediate validation.
 *
 * @param model - Model ID to validate
 * @returns true if the model is supported
 *
 * @example
 * ```typescript
 * if (isSupportedChatModel("claude-4-sonnet")) {
 *   console.log("Model is supported");
 * }
 * ```
 */
function isSupportedChatModel(model) {
    return exports.SUPPORTED_CHAT_MODELS.includes(model);
}
/**
 * Synchronously checks if a model is a supported embedding model.
 * Uses the static fallback list for immediate validation.
 *
 * @param model - Model ID to validate
 * @returns true if the model is supported
 */
function isSupportedEmbeddingModel(model) {
    return exports.SUPPORTED_EMBEDDING_MODELS.includes(model);
}
/**
 * Synchronously checks if a model is a supported image model.
 * Uses the static fallback list for immediate validation.
 *
 * @param model - Model ID to validate
 * @returns true if the model is supported
 */
function isSupportedImageModel(model) {
    return exports.SUPPORTED_IMAGE_MODELS.includes(model);
}
/**
 * Gets a formatted string of supported chat models for error messages.
 *
 * @returns Comma-separated list of supported models
 */
function getSupportedChatModelsString() {
    return exports.SUPPORTED_CHAT_MODELS.join(", ");
}
/**
 * Gets a formatted string of supported embedding models for error messages.
 *
 * @returns Comma-separated list of supported models
 */
function getSupportedEmbeddingModelsString() {
    return exports.SUPPORTED_EMBEDDING_MODELS.join(", ");
}
/**
 * Gets a formatted string of supported image models for error messages.
 *
 * @returns Comma-separated list of supported models
 */
function getSupportedImageModelsString() {
    return exports.SUPPORTED_IMAGE_MODELS.join(", ");
}
/**
 * Clears the cached models (useful for testing).
 * @internal
 */
function clearModelCache() {
    cachedModels = null;
    cacheTimestamp = 0;
}
//# sourceMappingURL=supported-models.js.map