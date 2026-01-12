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
/**
 * API response structure from Heroku's available-models endpoint.
 */
export interface HerokuModelInfo {
    model_id: string;
    type: string[];
    regions: string[];
}
/**
 * Model type categories used by Heroku API.
 */
export type HerokuModelType = "text-to-text" | "text-to-embedding" | "text-to-image" | "text-to-ranking";
/**
 * Static fallback list of supported chat models (text-to-text).
 * Used when the API is unavailable or for synchronous validation.
 *
 * Last updated from: https://us.inference.heroku.com/available-models
 */
export declare const SUPPORTED_CHAT_MODELS: readonly string[];
/**
 * Static fallback list of supported embedding models (text-to-embedding).
 */
export declare const SUPPORTED_EMBEDDING_MODELS: readonly string[];
/**
 * Static fallback list of supported image models (text-to-image).
 */
export declare const SUPPORTED_IMAGE_MODELS: readonly string[];
/**
 * Static fallback list of supported reranking models (text-to-ranking).
 */
export declare const SUPPORTED_RERANKING_MODELS: readonly string[];
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
export declare function fetchAvailableModels(options?: {
    timeout?: number;
    useCache?: boolean;
}): Promise<HerokuModelInfo[] | null>;
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
export declare function getSupportedChatModels(options?: {
    timeout?: number;
    useCache?: boolean;
}): Promise<string[]>;
/**
 * Gets the list of supported embedding models, attempting to fetch from API first.
 *
 * @param options - Options for fetching
 * @returns Array of supported embedding model IDs
 */
export declare function getSupportedEmbeddingModels(options?: {
    timeout?: number;
    useCache?: boolean;
}): Promise<string[]>;
/**
 * Gets the list of supported image models, attempting to fetch from API first.
 *
 * @param options - Options for fetching
 * @returns Array of supported image model IDs
 */
export declare function getSupportedImageModels(options?: {
    timeout?: number;
    useCache?: boolean;
}): Promise<string[]>;
/**
 * Gets the list of supported reranking models, attempting to fetch from API first.
 *
 * @param options - Options for fetching
 * @returns Array of supported reranking model IDs
 */
export declare function getSupportedRerankingModels(options?: {
    timeout?: number;
    useCache?: boolean;
}): Promise<string[]>;
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
export declare function isSupportedChatModel(model: string): boolean;
/**
 * Synchronously checks if a model is a supported embedding model.
 * Uses the static fallback list for immediate validation.
 *
 * @param model - Model ID to validate
 * @returns true if the model is supported
 */
export declare function isSupportedEmbeddingModel(model: string): boolean;
/**
 * Synchronously checks if a model is a supported image model.
 * Uses the static fallback list for immediate validation.
 *
 * @param model - Model ID to validate
 * @returns true if the model is supported
 */
export declare function isSupportedImageModel(model: string): boolean;
/**
 * Synchronously checks if a model is a supported reranking model.
 * Uses the static fallback list for immediate validation.
 *
 * @param model - Model ID to validate
 * @returns true if the model is supported
 */
export declare function isSupportedRerankingModel(model: string): boolean;
/**
 * Gets a formatted string of supported chat models for error messages.
 *
 * @returns Comma-separated list of supported models
 */
export declare function getSupportedChatModelsString(): string;
/**
 * Gets a formatted string of supported embedding models for error messages.
 *
 * @returns Comma-separated list of supported models
 */
export declare function getSupportedEmbeddingModelsString(): string;
/**
 * Gets a formatted string of supported image models for error messages.
 *
 * @returns Comma-separated list of supported models
 */
export declare function getSupportedImageModelsString(): string;
/**
 * Gets a formatted string of supported reranking models for error messages.
 *
 * @returns Comma-separated list of supported models
 */
export declare function getSupportedRerankingModelsString(): string;
/**
 * Clears the cached models (useful for testing).
 * @internal
 */
export declare function clearModelCache(): void;
//# sourceMappingURL=supported-models.d.ts.map