import { HerokuChatLanguageModel } from "./models/chat.js";
import { HerokuEmbeddingModel } from "./models/embedding.js";
import { HerokuImageModel } from "./models/image.js";
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
export declare function ensureEndpointPath(baseUrl: string, endpointPath: string): string;
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
export declare function createHerokuAI(options?: HerokuAIOptions): {
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
    chat: (model: string) => HerokuChatLanguageModel;
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
    embedding: (model: string) => HerokuEmbeddingModel;
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
    image: (model: string) => HerokuImageModel;
};
export declare const heroku: {
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
    chat: (model: string) => HerokuChatLanguageModel;
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
    embedding: (model: string) => HerokuEmbeddingModel;
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
    image: (model: string) => HerokuImageModel;
};
/**
 * @deprecated Use {@link createHerokuAI} instead.
 */
export declare const createHerokuProvider: typeof createHerokuAI;
export { HerokuChatLanguageModel } from "./models/chat.js";
export { HerokuEmbeddingModel, createEmbedFunction, } from "./models/embedding.js";
export { HerokuImageModel } from "./models/image.js";
export type { EmbeddingOptions } from "./models/embedding.js";
export { createUserFriendlyError, formatUserFriendlyError, createSimpleErrorMessage, createDetailedErrorReport, isConfigurationError, isTemporaryServiceError, getContextualHelp, type UserFriendlyError, } from "./utils/user-friendly-errors.js";
export { HerokuErrorType, ErrorSeverity, ErrorCategory, type HerokuErrorResponse, type ErrorMetadata, } from "./utils/error-types.js";
//# sourceMappingURL=index.d.ts.map