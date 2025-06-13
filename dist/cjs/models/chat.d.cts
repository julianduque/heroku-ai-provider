import { LanguageModelV1, LanguageModelV1CallOptions, LanguageModelV1FunctionTool, LanguageModelV1ProviderDefinedTool, LanguageModelV1ToolChoice, LanguageModelV1FunctionToolCall, LanguageModelV1StreamPart, LanguageModelV1FinishReason } from "@ai-sdk/provider";
export type ToolInput = LanguageModelV1FunctionTool | LanguageModelV1ProviderDefinedTool;
export type ToolChoiceInput = LanguageModelV1ToolChoice;
/**
 * Heroku chat language model implementation compatible with AI SDK v1.1.3.
 *
 * This class provides chat completion capabilities using Heroku's AI infrastructure,
 * specifically designed to work seamlessly with the Vercel AI SDK's chat functions.
 * Supports both streaming and non-streaming responses, tool calling, and all standard
 * AI SDK features.
 *
 * @class HerokuChatLanguageModel
 * @implements {LanguageModelV1}
 *
 * @example
 * Basic usage with AI SDK:
 * ```typescript
 * import { generateText, streamText } from "ai";
 * import { createHerokuProvider } from "heroku-ai-provider";
 *
 * const heroku = createHerokuProvider();
 * const model = heroku.chat("claude-3-5-sonnet-latest");
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
 *   maxSteps: 5 // Enable multi-step tool conversations
 * });
 * ```
 *
 * @example
 * Direct model usage:
 * ```typescript
 * import { HerokuChatLanguageModel } from "heroku-ai-provider";
 *
 * const model = new HerokuChatLanguageModel(
 *   "claude-3-5-sonnet-latest",
 *   process.env.HEROKU_INFERENCE_KEY!,
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
export declare class HerokuChatLanguageModel implements LanguageModelV1 {
    private readonly model;
    private readonly apiKey;
    private readonly baseUrl;
    readonly specificationVersion: "v1";
    readonly provider: "heroku";
    readonly modelId: string;
    readonly defaultObjectGenerationMode: "json";
    /**
     * Creates a new HerokuChatLanguageModel instance.
     *
     * @param model - The Heroku chat model identifier (e.g., "claude-3-5-sonnet-latest")
     * @param apiKey - Your Heroku AI API key for chat completions
     * @param baseUrl - The base URL for the Heroku chat completions API
     *
     * @throws {ValidationError} When parameters are invalid or missing
     *
     * @example
     * ```typescript
     * const model = new HerokuChatLanguageModel(
     *   "claude-3-5-sonnet-latest",
     *   process.env.HEROKU_INFERENCE_KEY!,
     *   "https://us.inference.heroku.com/v1/chat/completions"
     * );
     * ```
     */
    constructor(model: string, apiKey: string, baseUrl: string);
    /**
     * Validate constructor parameters with detailed error messages
     * @internal
     */
    private validateConstructorParameters;
    /**
     * Generate a chat completion using the Heroku AI API.
     *
     * This method implements the AI SDK v1.1.3 LanguageModelV1 interface for
     * non-streaming chat completions. It supports all standard AI SDK features
     * including tool calling, system messages, and conversation history.
     *
     * @param options - Configuration options for the chat completion
     * @returns Promise resolving to the completion result with text, tool calls, and metadata
     *
     * @throws {APICallError} When the API request fails or input validation fails
     *
     * @example
     * Basic text generation:
     * ```typescript
     * const result = await model.doGenerate({
     *   inputFormat: "prompt",
     *   mode: { type: "regular" },
     *   prompt: "Explain quantum computing in simple terms"
     * });
     *
     * console.log(result.text);
     * console.log(result.usage); // Token usage information
     * ```
     *
     * @example
     * With conversation history:
     * ```typescript
     * const result = await model.doGenerate({
     *   inputFormat: "messages",
     *   mode: { type: "regular" },
     *   messages: [
     *     { role: "system", content: "You are a helpful assistant" },
     *     { role: "user", content: "What is the capital of France?" },
     *     { role: "assistant", content: "The capital of France is Paris." },
     *     { role: "user", content: "What about Germany?" }
     *   ]
     * });
     * ```
     *
     * @example
     * With tool calling:
     * ```typescript
     * const result = await model.doGenerate({
     *   inputFormat: "prompt",
     *   mode: {
     *     type: "regular",
     *     tools: [{
     *       type: "function",
     *       name: "getWeather",
     *       description: "Get current weather",
     *       parameters: {
     *         type: "object",
     *         properties: {
     *           location: { type: "string" }
     *         }
     *       }
     *     }],
     *     toolChoice: { type: "auto" }
     *   },
     *   prompt: "What's the weather in New York?"
     * });
     *
     * if (result.toolCalls?.length > 0) {
     *   console.log("Tool called:", result.toolCalls[0].toolName);
     *   console.log("Arguments:", result.toolCalls[0].args);
     * }
     * ```
     */
    doGenerate(options: LanguageModelV1CallOptions): Promise<{
        text: string;
        toolCalls: LanguageModelV1FunctionToolCall[] | undefined;
        finishReason: LanguageModelV1FinishReason;
        usage: {
            promptTokens: number;
            completionTokens: number;
        };
        rawCall: {
            rawPrompt: unknown;
            rawSettings: {};
        };
        rawResponse: {
            headers: Record<string, string>;
        };
        request: {
            body: string;
        };
        warnings: never[];
    }>;
    /**
     * Generate a streaming chat completion using the Heroku AI API.
     *
     * This method implements the AI SDK v1.1.3 LanguageModelV1 interface for
     * streaming chat completions. It returns a ReadableStream that emits
     * incremental updates as the model generates the response.
     *
     * @param options - Configuration options for the streaming chat completion
     * @returns Promise resolving to a ReadableStream of completion parts
     *
     * @throws {APICallError} When the API request fails or input validation fails
     *
     * @example
     * Basic streaming:
     * ```typescript
     * const stream = await model.doStream({
     *   inputFormat: "prompt",
     *   mode: { type: "regular" },
     *   prompt: "Write a short story about AI"
     * });
     *
     * const reader = stream.getReader();
     * try {
     *   while (true) {
     *     const { done, value } = await reader.read();
     *     if (done) break;
     *
     *     if (value.type === "text-delta") {
     *       process.stdout.write(value.textDelta);
     *     } else if (value.type === "finish") {
     *       console.log("\nFinish reason:", value.finishReason);
     *       console.log("Usage:", value.usage);
     *     }
     *   }
     * } finally {
     *   reader.releaseLock();
     * }
     * ```
     *
     * @example
     * Streaming with tool calls:
     * ```typescript
     * const stream = await model.doStream({
     *   inputFormat: "prompt",
     *   mode: {
     *     type: "regular",
     *     tools: [{
     *       type: "function",
     *       name: "calculate",
     *       description: "Perform calculations",
     *       parameters: {
     *         type: "object",
     *         properties: {
     *           expression: { type: "string" }
     *         }
     *       }
     *     }]
     *   },
     *   prompt: "What is 15 * 24?"
     * });
     *
     * const reader = stream.getReader();
     * try {
     *   while (true) {
     *     const { done, value } = await reader.read();
     *     if (done) break;
     *
     *     switch (value.type) {
     *       case "text-delta":
     *         process.stdout.write(value.textDelta);
     *         break;
     *       case "tool-call":
     *         console.log("Tool call:", value.toolName, value.args);
     *         break;
     *       case "tool-result":
     *         console.log("Tool result:", value.result);
     *         break;
     *     }
     *   }
     * } finally {
     *   reader.releaseLock();
     * }
     * ```
     *
     * @example
     * Error handling with streaming:
     * ```typescript
     * try {
     *   const stream = await model.doStream({
     *     inputFormat: "prompt",
     *     mode: { type: "regular" },
     *     prompt: "Hello, world!"
     *   });
     *
     *   // Process stream...
     * } catch (error) {
     *   if (error instanceof APICallError) {
     *     console.error("API Error:", error.message);
     *     console.error("Status:", error.statusCode);
     *   }
     * }
     * ```
     */
    doStream(options: LanguageModelV1CallOptions): Promise<{
        stream: import("stream/web").ReadableStream<LanguageModelV1StreamPart>;
        rawCall: {
            rawPrompt: unknown;
            rawSettings: Record<string, unknown>;
        };
        rawResponse: {
            headers: {};
        };
        request: {
            body: string;
        };
        warnings: never[];
    }>;
    private mapPromptToMessages;
    private convertMessageToHerokuFormat;
    private mapToolsToHerokuFormat;
    private mapToolChoiceToHerokuFormat;
    private mapResponseToOutput;
    private mapChunkToStreamPart;
    private extractToolCalls;
}
//# sourceMappingURL=chat.d.ts.map