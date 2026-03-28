import { LanguageModelV2, LanguageModelV2CallOptions, LanguageModelV2CallWarning, LanguageModelV2Content, LanguageModelV2FinishReason, LanguageModelV2FunctionTool, LanguageModelV3ProviderTool, LanguageModelV2StreamPart, LanguageModelV2ToolChoice, LanguageModelV2Usage } from "@ai-sdk/provider";
/**
 * Tool input types
 */
export type ToolInput = LanguageModelV2FunctionTool | LanguageModelV3ProviderTool;
export type ToolChoiceInput = LanguageModelV2ToolChoice | "auto" | "none" | "required" | string;
/**
 * Heroku Anthropic language model implementation compatible with AI SDK v5.
 *
 * This class provides native Anthropic Messages API capabilities using Heroku's
 * managed infrastructure, enabling Anthropic-specific features like extended
 * thinking, prompt caching, and native tool use format.
 *
 * @class HerokuAnthropicModel
 * Implements the LanguageModelV2 interface from @ai-sdk/provider.
 *
 * @example
 * Basic usage with AI SDK:
 * ```typescript
 * import { generateText, streamText } from "ai";
 * import { heroku } from "heroku-ai-provider";
 *
 * const model = heroku.anthropic("claude-4-sonnet");
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
 * Extended thinking (Claude 3.7+):
 * ```typescript
 * const { text } = await generateText({
 *   model: heroku.anthropic("claude-3-7-sonnet"),
 *   prompt: "Solve this complex math problem...",
 *   providerOptions: {
 *     anthropic: {
 *       thinking: { type: "enabled", budgetTokens: 10000 }
 *     }
 *   }
 * });
 * ```
 */
export declare class HerokuAnthropicModel implements LanguageModelV2 {
    private readonly model;
    readonly specificationVersion: "v2";
    readonly provider: "heroku.anthropic";
    readonly modelId: string;
    readonly supportedUrls: Record<string, RegExp[]>;
    private readonly apiKey;
    private readonly baseUrl;
    private streamingContentBlocks;
    private streamingFinishReason;
    private streamingUsage;
    private streamingTextId;
    private streamingTextClosed;
    private currentStructuredOutputToolName;
    private streamingMessageId;
    /**
     * Constructor for the Heroku Anthropic Language Model.
     *
     * @param model - The Anthropic model identifier (e.g., "claude-4-sonnet")
     * @param apiKey - Your Heroku AI API key
     * @param baseUrl - The base URL for the Anthropic Messages API endpoint
     *
     * @throws {ValidationError} When parameters are invalid or missing
     */
    constructor(model: string, apiKey: string, baseUrl: string);
    /**
     * Reset streaming state between requests
     * @internal
     */
    private resetStreamingState;
    /**
     * Validate constructor parameters
     * @internal
     */
    private validateConstructorParameters;
    /**
     * Generate a completion using the Anthropic Messages API.
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
     * Generate a streaming completion using the Anthropic Messages API.
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
    /**
     * Map AI SDK prompt to Anthropic format with separate system message
     * @internal
     */
    private mapPromptToAnthropicFormat;
    /**
     * Convert user content to Anthropic format
     * @internal
     */
    private convertUserContent;
    /**
     * Convert assistant content to Anthropic format
     * @internal
     */
    private convertAssistantContent;
    /**
     * Convert tool results to Anthropic format
     * @internal
     */
    private convertToolResults;
    /**
     * Map tools to Anthropic format
     * @internal
     */
    private mapToolsToAnthropicFormat;
    /**
     * Map tool choice to Anthropic format
     * @internal
     */
    private mapToolChoiceToAnthropicFormat;
    /**
     * Map Anthropic response to AI SDK output format
     * @internal
     */
    private mapResponseToOutput;
    /**
     * Map Anthropic stream events to AI SDK stream parts
     * @internal
     */
    private mapStreamEventToStreamParts;
    /**
     * Normalize Anthropic finish reason to AI SDK format
     * @internal
     */
    private normalizeFinishReason;
    /**
     * Collect warnings for unsupported options
     * @internal
     */
    private collectCallWarnings;
    /**
     * Prepare structured output configuration
     * @internal
     */
    private prepareStructuredOutputConfig;
    /**
     * Sanitize schema for structured output
     * @internal
     */
    private sanitizeStructuredSchema;
    /**
     * Normalize tool name for structured output
     * @internal
     */
    private normalizeStructuredToolName;
    /**
     * Build system instruction for structured output
     * @internal
     */
    private buildStructuredOutputInstruction;
    /**
     * Normalize headers
     * @internal
     */
    private normalizeHeaders;
}
//# sourceMappingURL=anthropic.d.ts.map