import { LanguageModelV2, LanguageModelV2CallOptions, LanguageModelV2CallWarning, LanguageModelV2Content, LanguageModelV2FinishReason, LanguageModelV2FunctionTool, LanguageModelV2ProviderDefinedTool, LanguageModelV2StreamPart, LanguageModelV2ToolChoice, LanguageModelV2Usage } from "@ai-sdk/provider";
export type ToolInput = LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool;
export type ToolChoiceInput = LanguageModelV2ToolChoice | "auto" | "none" | "required" | string;
/**
 * Heroku chat language model implementation compatible with AI SDK v5.
 *
 * This class provides chat completion capabilities using Heroku's AI infrastructure,
 * specifically designed to work seamlessly with the Vercel AI SDK's chat functions.
 * Supports both streaming and non-streaming responses, tool calling, and all standard
 * AI SDK features.
 *
 * @class HerokuChatLanguageModel
 * Implements the LanguageModelV2 interface from @ai-sdk/provider.
 *
 * @example
 * Basic usage with AI SDK:
 * ```typescript
 * import { generateText, streamText } from "ai";
 * import { heroku } from "heroku-ai-provider";
 *
 * const model = heroku.chat("claude-4-sonnet");

 *
 * // Generate text
 * const { text } = await generateText({
 *   model,
 *   prompt: "Explain quantum computing"
 * });
 *
 * // Stream text
 * const { textStream } = await streamText({
 *   model,
 *   prompt: "Write a story about AI"
 * });
 *
 * for await (const delta of textStream) {
 *   process.stdout.write(delta);
 * }
 * ```
 *
 * @example
 * Advanced usage with tools:
 * ```typescript
 * import { generateText, tool } from "ai";
 * import { z } from "zod";
 *
 * const { text } = await generateText({
 *   model,
 *   prompt: "What's the weather like in New York?",
 *   tools: {
 *     getWeather: tool({
 *       description: "Get current weather for a location",
 *       parameters: z.object({
 *         location: z.string().describe("The city name")
 *       }),
 *       execute: async ({ location }) => {
 *         return { temperature: 72, condition: "sunny" };
 *       }
 *     })
 *   },
 *   stopWhen: stepCountIs(5)
 * });
 * ```
 *
 * @example
 * Direct model usage:
 * ```typescript
 * import { HerokuChatLanguageModel } from "heroku-ai-provider";
 *
 * const model = new HerokuChatLanguageModel(
 *   "claude-4-sonnet",
 *   process.env.INFERENCE_KEY!,
 *   "https://us.inference.heroku.com/v1/chat/completions"
 * );
 *
 * const result = await model.doGenerate({
 *   inputFormat: "prompt",
 *   mode: { type: "regular" },
 *   prompt: "Hello, world!"
 * });
 *
 * console.log(result.text);
 * ```
 */
export declare class HerokuChatLanguageModel implements LanguageModelV2 {
    private readonly model;
    readonly specificationVersion: "v2";
    readonly provider: "heroku";
    readonly modelId: string;
    readonly supportedUrls: Record<string, RegExp[]>;
    private readonly apiKey;
    private readonly baseUrl;
    private streamingToolCalls;
    private streamingFinishReason;
    private streamingUsage;
    private streamingTextId;
    private streamingTextClosed;
    private currentStructuredOutputToolName;
    /**
     * Constructor for the Heroku Chat Language Model.
     *
     * @param model - The Heroku chat model identifier (e.g., "claude-4-sonnet")
     * @param apiKey - Your Heroku AI API key for chat completions
     * @param baseUrl - The base URL for the Heroku chat completions API
     *
     * @throws {ValidationError} When parameters are invalid or missing
     *
     * @example
     * ```typescript
     * const model = new HerokuChatLanguageModel(
     *   "claude-4-sonnet",
     *   process.env.INFERENCE_KEY!,
     *   "https://us.inference.heroku.com/v1/chat/completions"
     * );
     * ```
     */
    constructor(model: string, apiKey: string, baseUrl: string);
    /**
     * Reset streaming state to prevent pollution between requests
     * @internal
     */
    private resetStreamingState;
    /**
     * Validate constructor parameters with detailed error messages
     * @internal
     */
    private validateConstructorParameters;
    /**
     * Generate a chat completion using the Heroku AI API.
     *
     * This method implements the AI SDK v5 LanguageModelV2 interface for
     * non-streaming chat completions, including tool calling and conversation history.
     *
     * @param options - Configuration options for the chat completion
     * @returns Completion content, usage metadata, and any provider warnings
     *
     * @throws {APICallError} When the API request fails or input validation fails
     *
     * @example
     * ```typescript
     * const result = await model.doGenerate({
     *   prompt: [
     *     { role: "user", content: [{ type: "text", text: "Tell me a joke" }] },
     *   ],
     * });
     * console.log(result.content[0]);
     * ```
     */
    doGenerate(options: LanguageModelV2CallOptions): Promise<{
        content: LanguageModelV2Content[];
        finishReason: LanguageModelV2FinishReason;
        usage: LanguageModelV2Usage;
        providerMetadata: undefined;
        request: {
            body: Record<string, unknown>;
        };
        response: {
            body: Record<string, unknown>;
            id?: string;
            timestamp?: Date;
            modelId?: string;
        };
        warnings: LanguageModelV2CallWarning[];
    }>;
    /**
     * Generate a streaming chat completion using the Heroku AI API.
     *
     * This method implements the AI SDK v5 LanguageModelV2 interface for
     * streaming chat completions and returns a readable stream of structured parts.
     */
    doStream(options: LanguageModelV2CallOptions): Promise<{
        stream: ReadableStream<LanguageModelV2StreamPart>;
        request: {
            body: Record<string, unknown>;
        };
        response: {
            headers: {
                [k: string]: string;
            } | undefined;
        };
    }>;
    private mapPromptToMessages;
    /**
     * Process messages in simple chronological order (no tool pairing needed).
     * Used when there are no tool messages that require special handling.
     * @internal
     */
    private processMessagesSimple;
    /**
     * Process messages ensuring proper tool call/result pairing to prevent API validation errors.
     * This method processes messages chronologically while ensuring assistant messages have proper content.
     * @internal
     */
    private processMessagesWithToolPairing;
    /**
     * Check if a message should be skipped because it would result in empty content.
     * This prevents messages that have no meaningful content from being sent to Heroku API.
     * @internal
     */
    private shouldSkipMessage;
    /**
     * Split a tool message containing multiple tool results into separate messages.
     * This ensures each tool result gets its own message, matching the expected API format.
     * @internal
     */
    private splitToolMessage;
    private convertMessageToHerokuFormat;
    private mapToolsToHerokuFormat;
    private mapToolChoiceToHerokuFormat;
    private shouldReleaseToolChoice;
    private assertToolExists;
    private mapResponseToOutput;
    private extractMessageText;
    private normalizeFinishReason;
    private extractResponseMetadata;
    private collectCallWarnings;
    private isSupportedResponseFormat;
    private normalizeHeaders;
    private prepareStructuredOutputConfig;
    private sanitizeStructuredSchema;
    private normalizeStructuredToolName;
    private buildStructuredOutputInstruction;
    private mapChunkToStreamParts;
    private flushStreamingToolCalls;
    private extractStructuredOutputText;
    private collectToolCallCandidates;
    private extractToolCalls;
}
//# sourceMappingURL=chat.d.ts.map