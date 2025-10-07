import { HerokuChatLanguageModel } from "./models/chat.js";
import { HerokuEmbeddingModel } from "./models/embedding.js";
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
     * @default process.env.INFERENCE_KEY
     */
    chatApiKey?: string;
    /**
     * API key for embeddings.
     * @default process.env.EMBEDDING_KEY
     */
    embeddingsApiKey?: string;
    /**
     * Base URL for chat completions API.
     * @default process.env.INFERENCE_URL ?? "https://us.inference.heroku.com/v1/chat/completions"
     */
    chatBaseUrl?: string;
    /**
     * Base URL for embeddings API.
     * @default process.env.EMBEDDING_URL ?? "https://us.inference.heroku.com/v1/embeddings"
     */
    embeddingsBaseUrl?: string;
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
};
/**
 * Default Heroku AI provider instance that reads credentials from environment variables.
 */
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
};
/**
 * @deprecated Use {@link createHerokuAI} instead.
 */
export declare const createHerokuProvider: typeof createHerokuAI;
export { HerokuChatLanguageModel } from "./models/chat.js";
export { HerokuEmbeddingModel, createEmbedFunction, } from "./models/embedding.js";
export type { EmbeddingOptions } from "./models/embedding.js";
export { createUserFriendlyError, formatUserFriendlyError, createSimpleErrorMessage, createDetailedErrorReport, isConfigurationError, isTemporaryServiceError, getContextualHelp, type UserFriendlyError, } from "./utils/user-friendly-errors.js";
export { HerokuErrorType, ErrorSeverity, ErrorCategory, type HerokuErrorResponse, type ErrorMetadata, } from "./utils/error-types.js";
//# sourceMappingURL=index.d.ts.map