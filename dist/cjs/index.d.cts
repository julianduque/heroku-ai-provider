import { HerokuChatLanguageModel } from "./models/chat.js";
import { HerokuEmbeddingModel } from "./models/embedding.js";
/**
 * Configuration settings for the Heroku AI provider.
 *
 * @interface HerokuProviderSettings
 * @example
 * ```typescript
 * // Using environment variables (recommended)
 * const heroku = createHerokuProvider();
 *
 * // Or with explicit configuration
 * const heroku = createHerokuProvider({
 *   chatApiKey: "your_inference_api_key",
 *   embeddingsApiKey: "your_embedding_api_key",
 *   chatBaseUrl: "https://us.inference.heroku.com/v1/chat/completions",
 *   embeddingsBaseUrl: "https://us.inference.heroku.com/v1/embeddings"
 * });
 * ```
 */
export interface HerokuProviderSettings {
    /**
     * API key for chat completions. Falls back to HEROKU_INFERENCE_KEY environment variable.
     * @default process.env.HEROKU_INFERENCE_KEY
     */
    chatApiKey?: string;
    /**
     * API key for embeddings. Falls back to HEROKU_EMBEDDING_KEY environment variable.
     * @default process.env.HEROKU_EMBEDDING_KEY
     */
    embeddingsApiKey?: string;
    /**
     * Base URL for chat completions API. Falls back to HEROKU_INFERENCE_URL environment variable.
     * @default process.env.HEROKU_INFERENCE_URL || "https://us.inference.heroku.com/v1/chat/completions"
     */
    chatBaseUrl?: string;
    /**
     * Base URL for embeddings API. Falls back to HEROKU_EMBEDDING_URL environment variable.
     * @default process.env.HEROKU_EMBEDDING_URL || "https://us.inference.heroku.com/v1/embeddings"
     */
    embeddingsBaseUrl?: string;
}
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
export declare function createHerokuProvider(settings?: HerokuProviderSettings): {
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
    chat: (model: string) => HerokuChatLanguageModel;
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
    embedding: (model: string) => HerokuEmbeddingModel;
};
export { HerokuChatLanguageModel } from "./models/chat.js";
export { HerokuEmbeddingModel, createEmbedFunction, } from "./models/embedding.js";
export type { EmbeddingOptions } from "./models/embedding.js";
export { createUserFriendlyError, formatUserFriendlyError, createSimpleErrorMessage, createDetailedErrorReport, isConfigurationError, isTemporaryServiceError, getContextualHelp, type UserFriendlyError, } from "./utils/user-friendly-errors.js";
export { HerokuErrorType, ErrorSeverity, ErrorCategory, type HerokuErrorResponse, type ErrorMetadata, } from "./utils/error-types.js";
//# sourceMappingURL=index.d.ts.map