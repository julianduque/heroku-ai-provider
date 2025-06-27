"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HerokuChatLanguageModel = void 0;
const provider_1 = require("@ai-sdk/provider");
const provider_utils_1 = require("@ai-sdk/provider-utils");
const api_client_js_1 = require('../utils/api-client.cjs');
const error_handling_js_1 = require('../utils/error-handling.cjs');
/**
 * Heroku chat language model implementation compatible with AI SDK v1.1.3.
 *
 * This class provides chat completion capabilities using Heroku's AI infrastructure,
 * specifically designed to work seamlessly with the Vercel AI SDK's chat functions.
 * Supports both streaming and non-streaming responses, tool calling, and all standard
 * AI SDK features.
 *
 * @class HerokuChatLanguageModel
 * Implements the LanguageModelV1 interface from @ai-sdk/provider.
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
class HerokuChatLanguageModel {
    /**
     * Constructor for the Heroku Chat Language Model.
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
    constructor(model, apiKey, baseUrl) {
        this.model = model;
        this.specificationVersion = "v1";
        this.provider = "heroku";
        this.defaultObjectGenerationMode = "json";
        // Streaming tool calls tracking
        this.streamingToolCalls = new Map();
        // Track finish reason and usage separately for Heroku API
        this.streamingFinishReason = null;
        this.streamingUsage = null;
        // Load and validate API key using provider-utils
        this.apiKey = (0, provider_utils_1.loadApiKey)({
            apiKey,
            environmentVariableName: "HEROKU_INFERENCE_KEY",
            apiKeyParameterName: "apiKey",
            description: "Heroku AI API key for chat completions",
        });
        // Normalize base URL by removing trailing slash
        this.baseUrl = (0, provider_utils_1.withoutTrailingSlash)(baseUrl) || baseUrl;
        // Comprehensive parameter validation
        this.validateConstructorParameters(model, this.apiKey, this.baseUrl);
        this.modelId = model;
    }
    /**
     * Reset streaming state to prevent pollution between requests
     * @internal
     */
    resetStreamingState() {
        this.streamingToolCalls.clear();
        this.streamingFinishReason = null;
        this.streamingUsage = null;
    }
    /**
     * Validate constructor parameters with detailed error messages
     * @internal
     */
    validateConstructorParameters(model, apiKey, baseUrl) {
        // Validate model parameter
        if (!model || typeof model !== "string") {
            throw (0, error_handling_js_1.createValidationError)("Model must be a non-empty string", "model", model);
        }
        if (model.trim().length === 0) {
            throw (0, error_handling_js_1.createValidationError)("Model cannot be empty or contain only whitespace", "model", model);
        }
        // Validate base URL parameter
        if (!baseUrl || typeof baseUrl !== "string") {
            throw (0, error_handling_js_1.createValidationError)("Base URL must be a non-empty string", "baseUrl", baseUrl);
        }
        if (baseUrl.trim().length === 0) {
            throw (0, error_handling_js_1.createValidationError)("Base URL cannot be empty or contain only whitespace", "baseUrl", baseUrl);
        }
        // Validate URL format
        try {
            const url = new URL(baseUrl);
            // Ensure it's HTTP or HTTPS
            if (!["http:", "https:"].includes(url.protocol)) {
                throw (0, error_handling_js_1.createValidationError)("Base URL must use HTTP or HTTPS protocol", "baseUrl", baseUrl);
            }
            // Ensure it has a valid hostname
            if (!url.hostname || url.hostname.length === 0) {
                throw (0, error_handling_js_1.createValidationError)("Base URL must have a valid hostname", "baseUrl", baseUrl);
            }
        }
        catch (urlError) {
            if (urlError instanceof Error && urlError.name === "TypeError") {
                throw (0, error_handling_js_1.createValidationError)(`Base URL is not a valid URL format: ${urlError.message}`, "baseUrl", baseUrl);
            }
            // Re-throw validation errors as-is
            throw urlError;
        }
        // Validate against Heroku's supported chat completion models
        const supportedHerokuChatModels = [
            "claude-3-5-sonnet-latest",
            "claude-3-haiku",
            "claude-4-sonnet",
            "claude-3-7-sonnet",
            "claude-3-5-haiku",
        ];
        if (!supportedHerokuChatModels.includes(model)) {
            throw (0, error_handling_js_1.createValidationError)(`Unsupported chat model '${model}'. Supported models: ${supportedHerokuChatModels.join(", ")}`, "model", model);
        }
    }
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
    async doGenerate(options) {
        // Validate options
        if (!options || !options.prompt) {
            throw new provider_1.APICallError({
                message: "Missing required prompt in options",
                url: "",
                requestBodyValues: { options },
            });
        }
        try {
            // Map prompt to Heroku messages format
            const messages = this.mapPromptToMessages(options.prompt);
            // Build request body
            const requestBody = {
                model: this.model,
                messages,
                stream: false,
                temperature: options.temperature,
                max_tokens: options.maxTokens,
                top_p: options.topP,
                stop: options.stopSequences,
            };
            // Handle tools if provided. Prioritize top-level tools definition.
            const extendedOptions = options;
            const tools = extendedOptions.tools ??
                (options.mode?.type === "regular" ? options.mode.tools : undefined);
            const toolChoice = extendedOptions.toolChoice ??
                (options.mode?.type === "regular"
                    ? options.mode.toolChoice
                    : undefined);
            if (tools) {
                // Validate tools is not empty array
                if (Array.isArray(tools) && tools.length === 0) {
                    throw new provider_1.APICallError({
                        message: "Tools must be a non-empty array when provided",
                        url: "",
                        requestBodyValues: { tools },
                    });
                }
                requestBody.tools = this.mapToolsToHerokuFormat(tools);
                if (toolChoice) {
                    requestBody.tool_choice = this.mapToolChoiceToHerokuFormat(toolChoice, tools);
                }
            }
            else if (toolChoice) {
                // Warn if tool choice is provided without tools
                console.warn("Tool choice provided without tools - ignoring tool choice");
            }
            // Make API request
            const response = await (0, api_client_js_1.makeHerokuRequest)(this.baseUrl, this.apiKey, requestBody, {
                maxRetries: 3,
                timeout: 30000,
            });
            return this.mapResponseToOutput(response, options);
        }
        catch (error) {
            if (error instanceof provider_1.APICallError) {
                throw error;
            }
            throw new provider_1.APICallError({
                message: `Failed to generate completion: ${(0, provider_utils_1.getErrorMessage)(error)}`,
                url: this.baseUrl,
                requestBodyValues: {},
                cause: error,
            });
        }
    }
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
    async doStream(options) {
        // Reset streaming state for new request
        this.resetStreamingState();
        // Validate options
        if (!options || !options.prompt) {
            throw new provider_1.APICallError({
                message: "Missing required prompt in options",
                url: "",
                requestBodyValues: { options },
            });
        }
        try {
            // Map prompt to Heroku messages format
            const messages = this.mapPromptToMessages(options.prompt);
            // Handle tools if provided
            const extendedOptions = options;
            const tools = extendedOptions.tools ??
                (options.mode?.type === "regular" ? options.mode.tools : undefined);
            const toolChoice = extendedOptions.toolChoice ??
                (options.mode?.type === "regular"
                    ? options.mode.toolChoice
                    : undefined);
            // Build request body for streaming
            const requestBody = {
                model: this.model,
                messages,
                stream: true,
                temperature: options.temperature,
                max_tokens: options.maxTokens,
                top_p: options.topP,
                stop: options.stopSequences,
            };
            // Add tools to request body if provided
            if (tools) {
                // Validate tools is not empty array
                if (Array.isArray(tools) && tools.length === 0) {
                    throw new provider_1.APICallError({
                        message: "Tools must be a non-empty array when provided",
                        url: "",
                        requestBodyValues: { tools },
                    });
                }
                requestBody.tools = this.mapToolsToHerokuFormat(tools);
                // Add tool choice if provided
                if (toolChoice) {
                    requestBody.tool_choice = this.mapToolChoiceToHerokuFormat(toolChoice, tools);
                }
            }
            else if (toolChoice) {
                // Warn if tool choice is provided without tools
                console.warn("Tool choice provided without tools - ignoring tool choice");
            }
            // Make API request
            const response = await (0, api_client_js_1.makeHerokuRequest)(this.baseUrl, this.apiKey, requestBody, {
                maxRetries: 3,
                timeout: 30000,
                stream: true,
            });
            // Create streaming response
            const rawStream = (0, api_client_js_1.processHerokuStream)(response, this.baseUrl);
            // Transform the stream to match AI SDK interface
            const mapChunkToStreamPart = this.mapChunkToStreamPart.bind(this);
            const stream = rawStream.pipeThrough(new TransformStream({
                transform(chunk, controller) {
                    const streamPart = mapChunkToStreamPart(chunk);
                    if (streamPart) {
                        controller.enqueue(streamPart);
                    }
                },
            }));
            return {
                stream,
                rawCall: {
                    rawPrompt: options.prompt,
                    rawSettings: requestBody,
                },
                rawResponse: {
                    headers: response?.headers
                        ? Object.fromEntries(response.headers.entries())
                        : undefined,
                },
                warnings: [],
            };
        }
        catch (error) {
            if (error instanceof provider_1.APICallError) {
                throw error;
            }
            throw new provider_1.APICallError({
                message: `Failed to stream completion: ${(0, provider_utils_1.getErrorMessage)(error)}`,
                url: this.baseUrl,
                requestBodyValues: {},
                cause: error,
            });
        }
    }
    mapPromptToMessages(prompt) {
        const messages = [];
        let systemMessageContent = "";
        // The prompt from tests can be a string, so we need to handle it.
        // We also create a copy of the prompt array to avoid mutating the original.
        const promptMessages = typeof prompt === "string"
            ? [{ role: "user", content: prompt }]
            : [...prompt];
        // DEBUG: Add logging to see what messages we're processing
        console.log("\n--- MAP PROMPT TO MESSAGES DEBUG ---");
        console.log("promptMessages:", JSON.stringify(promptMessages, null, 2));
        // Extract existing system message from the copied array
        const systemMessageIndex = promptMessages.findIndex((m) => m.role === "system");
        if (systemMessageIndex !== -1) {
            const systemMessage = promptMessages.splice(systemMessageIndex, 1)[0];
            if (typeof systemMessage.content === "string") {
                systemMessageContent = systemMessage.content;
            }
        }
        // Add the system message to the start if it exists
        if (systemMessageContent.trim() !== "") {
            messages.push({ role: "system", content: systemMessageContent.trim() });
        }
        // Check if there are any tool messages that need special pairing
        const hasToolMessages = promptMessages.some((item) => item &&
            typeof item === "object" &&
            "role" in item &&
            item.role === "tool");
        if (hasToolMessages) {
            // Use the tool pairing processor when tool messages are present
            this.processMessagesWithToolPairing(promptMessages, messages);
        }
        else {
            // Use the simple processor for regular messages
            this.processMessagesSimple(promptMessages, messages);
        }
        console.log("Final messages:", JSON.stringify(messages, null, 2));
        console.log("--- END MAP PROMPT DEBUG ---\n");
        return messages;
    }
    /**
     * Process messages in simple chronological order (no tool pairing needed).
     * Used when there are no tool messages that require special handling.
     * @internal
     */
    processMessagesSimple(promptMessages, messages) {
        for (const item of promptMessages) {
            if (this.shouldSkipMessage(item)) {
                continue;
            }
            if (item && typeof item === "object" && "role" in item) {
                const convertedMessage = this.convertMessageToHerokuFormat(item);
                messages.push(convertedMessage);
            }
        }
    }
    /**
     * Process messages ensuring proper tool call/result pairing to prevent API validation errors.
     * This method processes messages chronologically while ensuring assistant messages have proper content.
     * @internal
     */
    processMessagesWithToolPairing(promptMessages, messages) {
        // Simple strategy: Process messages chronologically and ensure proper content
        // The AI SDK already handles the pairing correctly, we just need to avoid breaking it
        for (const item of promptMessages) {
            if (this.shouldSkipMessage(item)) {
                continue;
            }
            if (item && typeof item === "object" && "role" in item) {
                const messageItem = item;
                if (messageItem.role === "tool") {
                    // Handle tool messages - split if needed and add directly
                    const toolMessages = this.splitToolMessage(item);
                    messages.push(...toolMessages);
                }
                else {
                    // Regular message (user, assistant, system)
                    const convertedMessage = this.convertMessageToHerokuFormat(item);
                    // For assistant messages with tool calls but no content, provide default content
                    if (convertedMessage.role === "assistant" &&
                        convertedMessage.tool_calls &&
                        convertedMessage.tool_calls.length > 0 &&
                        (!convertedMessage.content || convertedMessage.content.trim() === "")) {
                        convertedMessage.content = "I'll help you with that.";
                    }
                    messages.push(convertedMessage);
                }
            }
        }
    }
    /**
     * Check if a message should be skipped because it would result in empty content.
     * This prevents messages that have no meaningful content from being sent to Heroku API.
     * @internal
     */
    shouldSkipMessage(item) {
        if (!item || typeof item !== "object") {
            return false;
        }
        const messageItem = item;
        const role = messageItem.role;
        // Only check assistant messages
        if (role !== "assistant") {
            return false;
        }
        // If content is a string, don't skip
        if (typeof messageItem.content === "string") {
            return false;
        }
        // If content is an array, check if it contains any text parts or tool calls
        if (Array.isArray(messageItem.content)) {
            const hasTextContent = messageItem.content.some((part) => {
                return (part &&
                    typeof part === "object" &&
                    "type" in part &&
                    part.type === "text" &&
                    "text" in part &&
                    typeof part.text === "string" &&
                    part.text.trim() !== "");
            });
            const hasToolCalls = messageItem.content.some((part) => {
                return (part &&
                    typeof part === "object" &&
                    "type" in part &&
                    part.type === "tool-call");
            });
            // Don't skip if there are tool calls, even without text content
            if (hasToolCalls) {
                return false;
            }
            // Skip if no text content and no tool calls
            return !hasTextContent;
        }
        return false;
    }
    /**
     * Split a tool message containing multiple tool results into separate messages.
     * This ensures each tool result gets its own message, matching the expected API format.
     * @internal
     */
    splitToolMessage(item) {
        if (!item || typeof item !== "object") {
            throw (0, error_handling_js_1.createValidationError)("Tool message item must be an object", "toolMessageItem", item);
        }
        const messageItem = item;
        if (!Array.isArray(messageItem.content)) {
            throw (0, error_handling_js_1.createValidationError)("Tool message content must be an array of tool results", "content", messageItem.content);
        }
        const toolMessages = [];
        for (const part of messageItem.content) {
            if (part &&
                typeof part === "object" &&
                "type" in part &&
                part.type === "tool-result") {
                const toolResult = part;
                const result = toolResult.result;
                let content = "";
                // Format tool result as text that the model can understand
                if (typeof result === "string") {
                    content = result;
                }
                else if (typeof result === "object") {
                    // If result is an array, wrap it in an object to ensure valid JSON object format
                    if (Array.isArray(result)) {
                        content = JSON.stringify({ result }, null, 2);
                    }
                    else {
                        content = JSON.stringify(result, null, 2);
                    }
                }
                else {
                    content = String(result);
                }
                toolMessages.push({
                    role: "tool",
                    content,
                    tool_call_id: toolResult.toolCallId,
                });
            }
        }
        return toolMessages;
    }
    convertMessageToHerokuFormat(item) {
        // Validate that item is an object
        if (!item || typeof item !== "object") {
            throw (0, error_handling_js_1.createValidationError)("Prompt item must be an object", "promptItem", item);
        }
        const messageItem = item;
        // Validate role
        if (!messageItem.role || typeof messageItem.role !== "string") {
            throw (0, error_handling_js_1.createValidationError)("Message role must be a string", "role", messageItem.role);
        }
        const role = messageItem.role;
        // Validate role values
        if (!["system", "user", "assistant", "tool"].includes(role)) {
            throw new provider_1.APICallError({
                message: `Invalid message role: ${role}`,
                url: "",
                requestBodyValues: { role },
            });
        }
        // Handle content and tool calls based on message type
        if (role === "system") {
            if (typeof messageItem.content === "string") {
                return {
                    role: "system",
                    content: messageItem.content,
                };
            }
            else {
                throw (0, error_handling_js_1.createValidationError)("System message content must be a string", "content", messageItem.content);
            }
        }
        else if (role === "user") {
            let content = "";
            if (typeof messageItem.content === "string") {
                content = messageItem.content;
            }
            else if (Array.isArray(messageItem.content)) {
                // Handle array content (text + images)
                const textParts = [];
                for (const part of messageItem.content) {
                    if (part &&
                        typeof part === "object" &&
                        "type" in part &&
                        part.type === "text" &&
                        "text" in part &&
                        typeof part.text === "string") {
                        textParts.push(part.text);
                    }
                }
                content = textParts.join("\n");
            }
            else if (messageItem.content &&
                typeof messageItem.content === "object" &&
                "text" in messageItem.content &&
                typeof messageItem.content.text === "string") {
                // Handle object content with text property
                content = messageItem.content.text;
            }
            else {
                throw (0, error_handling_js_1.createValidationError)("User message content must be a string, array, or object with text property", "content", messageItem.content);
            }
            // Validate content is not empty or whitespace-only
            if (!content || content.trim() === "") {
                throw new provider_1.APICallError({
                    message: "Message content cannot be empty",
                    url: "",
                    requestBodyValues: { content },
                });
            }
            return {
                role: "user",
                content,
            };
        }
        else if (role === "assistant") {
            let content = null;
            const toolCalls = [];
            if (typeof messageItem.content === "string") {
                content = messageItem.content;
            }
            else if (Array.isArray(messageItem.content)) {
                // Handle array content for assistant messages (text + tool calls)
                const textParts = [];
                for (const part of messageItem.content) {
                    if (part && typeof part === "object" && "type" in part) {
                        if (part.type === "text" &&
                            "text" in part &&
                            typeof part.text === "string") {
                            textParts.push(part.text);
                        }
                        else if (part.type === "tool-call") {
                            // Extract tool call information
                            const toolCall = part;
                            if ("toolCallId" in toolCall &&
                                "toolName" in toolCall &&
                                "args" in toolCall &&
                                typeof toolCall.toolCallId === "string" &&
                                typeof toolCall.toolName === "string") {
                                toolCalls.push({
                                    id: toolCall.toolCallId,
                                    type: "function",
                                    function: {
                                        name: toolCall.toolName,
                                        arguments: typeof toolCall.args === "string"
                                            ? toolCall.args
                                            : JSON.stringify(toolCall.args),
                                    },
                                });
                            }
                        }
                    }
                }
                content = textParts.length > 0 ? textParts.join("\n") : null;
            }
            else if (messageItem.content === null ||
                messageItem.content === undefined) {
                // Allow null content for assistant messages with tool calls
                content = null;
            }
            else {
                throw (0, error_handling_js_1.createValidationError)("Assistant message content must be a string, array, or null", "content", messageItem.content);
            }
            const result = {
                role: "assistant",
                content: content || (toolCalls.length > 0 ? null : ""),
            };
            if (toolCalls.length > 0) {
                result.tool_calls = toolCalls;
            }
            return result;
        }
        throw new provider_1.APICallError({
            message: `Unsupported message role: ${role}`,
            url: "",
            requestBodyValues: { role },
        });
    }
    mapToolsToHerokuFormat(tools) {
        if (!Array.isArray(tools)) {
            throw (0, error_handling_js_1.createValidationError)("Tools must be an array", "tools", tools);
        }
        return tools.map((tool, index) => {
            // Validate tool is an object
            if (!tool || typeof tool !== "object") {
                throw new provider_1.APICallError({
                    message: `Tool at index ${index}: Invalid tool format`,
                    url: "",
                    requestBodyValues: { [`tools[${index}]`]: tool },
                });
            }
            let name = "";
            let description = "";
            let parameters = {};
            // Handle nested function format (OpenAI-style)
            if ("type" in tool && tool.type === "function" && "function" in tool) {
                const func = tool.function;
                if (!func || typeof func !== "object") {
                    throw new provider_1.APICallError({
                        message: `Tool at index ${index}: Invalid function object structure`,
                        url: "",
                        requestBodyValues: { [`tools[${index}]`]: tool },
                    });
                }
                const funcObj = func;
                name = funcObj.name || "";
                description = funcObj.description || "";
                parameters = funcObj.parameters || {};
            }
            // Handle flat tool format
            else if ("name" in tool) {
                name = tool.name || "";
                description =
                    "description" in tool && typeof tool.description === "string"
                        ? tool.description
                        : "";
                parameters =
                    "parameters" in tool && tool.parameters
                        ? tool.parameters
                        : {};
            }
            else {
                throw new provider_1.APICallError({
                    message: `Tool at index ${index}: Invalid tool format. Expected object with 'name' and 'description' properties or nested function object`,
                    url: "",
                    requestBodyValues: { [`tools[${index}]`]: tool },
                });
            }
            // Validate name
            if (!name || name.trim() === "") {
                throw new provider_1.APICallError({
                    message: `Tool at index ${index}: Tool must have a non-empty name`,
                    url: "",
                    requestBodyValues: { [`tools[${index}]`]: tool },
                });
            }
            // Validate description
            if (!description || description.trim() === "") {
                throw new provider_1.APICallError({
                    message: `Tool at index ${index}: Tool must have a non-empty description`,
                    url: "",
                    requestBodyValues: { [`tools[${index}]`]: tool },
                });
            }
            // Validate tool name format (basic function name validation)
            const trimmedName = name.trim();
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
                throw new provider_1.APICallError({
                    message: `Tool name '${trimmedName}' is invalid. Must be a valid function name (letters, numbers, underscores only, cannot start with number)`,
                    url: "",
                    requestBodyValues: { [`tools[${index}]`]: tool },
                });
            }
            // Remove $schema property that zod adds, as Heroku API doesn't accept it
            const cleanParameters = { ...parameters };
            if (cleanParameters.$schema) {
                delete cleanParameters.$schema;
            }
            return {
                type: "function",
                function: {
                    name: trimmedName,
                    description: description.trim(),
                    parameters: cleanParameters,
                },
            };
        });
    }
    mapToolChoiceToHerokuFormat(toolChoice, availableTools) {
        if (!toolChoice) {
            return "auto";
        }
        // Handle string values
        if (typeof toolChoice === "string") {
            if (toolChoice === "auto" || toolChoice === "none") {
                return toolChoice;
            }
            if (toolChoice === "required") {
                return "auto"; // Heroku might not support "required", fallback to "auto"
            }
            // Validate tool name format
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(toolChoice)) {
                throw new provider_1.APICallError({
                    message: `Invalid tool name in tool choice: '${toolChoice}'`,
                    url: "",
                    requestBodyValues: { toolChoice },
                });
            }
            // Validate tool exists
            if (availableTools) {
                const toolExists = availableTools.some((tool) => {
                    if ("name" in tool) {
                        return tool.name === toolChoice;
                    }
                    if ("type" in tool &&
                        tool.type === "function" &&
                        "function" in tool) {
                        const func = tool.function;
                        return func.name === toolChoice;
                    }
                    return false;
                });
                if (!toolExists) {
                    throw new provider_1.APICallError({
                        message: `Tool choice references non-existent tool: '${toolChoice}'`,
                        url: "",
                        requestBodyValues: { toolChoice },
                    });
                }
            }
            return {
                type: "function",
                function: { name: toolChoice },
            };
        }
        // Handle object format
        if (typeof toolChoice === "object") {
            if ("type" in toolChoice) {
                const typedToolChoice = toolChoice;
                if (typedToolChoice.type === "auto") {
                    return "auto";
                }
                if (typedToolChoice.type === "none") {
                    return "none";
                }
                if (typedToolChoice.type === "required") {
                    return "auto"; // Heroku might not support "required", fallback to "auto"
                }
                if (typedToolChoice.type === "tool" && "toolName" in typedToolChoice) {
                    const toolName = typedToolChoice.toolName;
                    if (!toolName || toolName.trim() === "") {
                        throw new provider_1.APICallError({
                            message: "Tool choice must have a toolName",
                            url: "",
                            requestBodyValues: { toolChoice },
                        });
                    }
                    // Validate tool exists
                    if (availableTools) {
                        const toolExists = availableTools.some((tool) => {
                            if ("name" in tool) {
                                return tool.name === toolName;
                            }
                            if ("type" in tool &&
                                tool.type === "function" &&
                                "function" in tool) {
                                const func = tool.function;
                                return func.name === toolName;
                            }
                            return false;
                        });
                        if (!toolExists) {
                            throw new provider_1.APICallError({
                                message: `Tool choice references non-existent tool: '${toolName}'`,
                                url: "",
                                requestBodyValues: { toolChoice },
                            });
                        }
                    }
                    return {
                        type: "function",
                        function: { name: toolName },
                    };
                }
                if (typedToolChoice.type !== "function") {
                    throw new provider_1.APICallError({
                        message: `Unsupported tool choice type: '${typedToolChoice.type}'`,
                        url: "",
                        requestBodyValues: { toolChoice },
                    });
                }
                if ("function" in toolChoice) {
                    const func = typedToolChoice.function;
                    const toolName = func.name;
                    if (!toolName || toolName.trim() === "") {
                        throw new provider_1.APICallError({
                            message: "Tool choice function must have a name",
                            url: "",
                            requestBodyValues: { toolChoice },
                        });
                    }
                    // Validate tool exists
                    if (availableTools) {
                        const toolExists = availableTools.some((tool) => {
                            if ("name" in tool) {
                                return tool.name === toolName;
                            }
                            if ("type" in tool &&
                                tool.type === "function" &&
                                "function" in tool) {
                                const toolFunc = tool.function;
                                return toolFunc.name === toolName;
                            }
                            return false;
                        });
                        if (!toolExists) {
                            throw new provider_1.APICallError({
                                message: `Tool choice references non-existent tool: '${toolName}'`,
                                url: "",
                                requestBodyValues: { toolChoice },
                            });
                        }
                    }
                    return {
                        type: "function",
                        function: { name: toolName },
                    };
                }
            }
            // Handle shorthand format
            if ("function" in toolChoice) {
                const func = toolChoice.function;
                const toolName = func.name;
                if (!toolName || toolName.trim() === "") {
                    throw new provider_1.APICallError({
                        message: "Tool choice function must have a name",
                        url: "",
                        requestBodyValues: { toolChoice },
                    });
                }
                return {
                    type: "function",
                    function: { name: toolName },
                };
            }
        }
        // Invalid format
        throw new provider_1.APICallError({
            message: "Invalid tool choice format",
            url: "",
            requestBodyValues: { toolChoice },
        });
    }
    mapResponseToOutput(response, _options) {
        // Validate response structure
        if (!response || typeof response !== "object") {
            throw new provider_1.APICallError({
                message: "Invalid response format from Heroku API",
                url: this.baseUrl,
                requestBodyValues: {},
                cause: response,
            });
        }
        // Extract choices
        const choices = response.choices;
        if (!Array.isArray(choices) || choices.length === 0) {
            throw new provider_1.APICallError({
                message: "No choices in response from Heroku API",
                url: this.baseUrl,
                requestBodyValues: {},
                cause: response,
            });
        }
        const choice = choices[0];
        const message = choice.message;
        // Extract text content
        const text = message?.content || "";
        // Extract tool calls
        const toolCalls = this.extractToolCalls(message);
        // Map tool calls to LanguageModelV1FunctionToolCall format
        const mappedToolCalls = toolCalls?.map((call) => ({
            toolCallType: "function",
            toolCallId: call.toolCallId,
            toolName: call.toolName,
            args: call.rawArgs || JSON.stringify(call.args), // Use raw JSON string from API
        }));
        // Extract usage information
        const usage = response.usage || {};
        const promptTokens = usage.prompt_tokens || 0;
        const completionTokens = usage.completion_tokens || 0;
        // Extract finish reason
        const rawFinishReason = choice.finish_reason || "stop";
        // Normalize finish reason - map Heroku API finish reasons to AI SDK format
        let finishReason = "stop";
        const finishReasonStr = String(rawFinishReason);
        if (finishReasonStr === "tool_calls" ||
            finishReasonStr === "function_call") {
            finishReason = "tool-calls";
        }
        else if (finishReasonStr === "content_filter") {
            finishReason = "content-filter";
        }
        else if (finishReasonStr === "max_tokens") {
            finishReason = "length";
        }
        else {
            const validFinishReasons = [
                "stop",
                "length",
                "content-filter",
                "tool-calls",
                "error",
                "other",
            ];
            finishReason = validFinishReasons.includes(finishReasonStr)
                ? finishReasonStr
                : "other";
        }
        return {
            text,
            toolCalls: mappedToolCalls,
            finishReason,
            usage: {
                promptTokens,
                completionTokens,
            },
            rawCall: {
                rawPrompt: _options.prompt,
                rawSettings: {},
            },
        };
    }
    mapChunkToStreamPart(chunk) {
        if (!chunk || typeof chunk !== "object") {
            return null;
        }
        const choices = chunk.choices;
        if (!Array.isArray(choices) || choices.length === 0) {
            return null;
        }
        const choice = choices[0];
        const delta = choice.delta;
        // Handle usage information - Heroku may send usage info separately from finish reason
        const usage = chunk.usage || {};
        const promptTokens = usage.prompt_tokens || 0;
        const completionTokens = usage.completion_tokens || 0;
        // Store usage info if present and not zero
        if (promptTokens > 0 || completionTokens > 0) {
            this.streamingUsage = {
                promptTokens,
                completionTokens,
            };
        }
        // Handle finish reason
        const finishReason = choice.finish_reason;
        if (finishReason && finishReason.trim() !== "") {
            // Store finish reason for later use
            if (finishReason === "tool_calls" || finishReason === "function_call") {
                this.streamingFinishReason = "tool-calls";
            }
            else if (finishReason === "content_filter") {
                this.streamingFinishReason = "content-filter";
            }
            else if (finishReason === "max_tokens") {
                this.streamingFinishReason = "length";
            }
            else if (finishReason === "stop") {
                this.streamingFinishReason = "stop";
            }
            else {
                this.streamingFinishReason = "other";
            }
            // Handle tool calls completion immediately
            if (finishReason === "tool_calls") {
                // Emit all completed tool calls when finish_reason is tool_calls
                const completedToolCalls = [];
                for (const [_index, toolCall] of this.streamingToolCalls.entries()) {
                    if (toolCall.id && toolCall.name && toolCall.argsBuffer) {
                        const parsedArgs = (0, provider_utils_1.safeParseJSON)({ text: toolCall.argsBuffer });
                        if (parsedArgs.success) {
                            completedToolCalls.push({
                                type: "tool-call",
                                toolCallType: "function",
                                toolCallId: toolCall.id,
                                toolName: toolCall.name,
                                args: toolCall.argsBuffer, // Use raw JSON string for streaming
                            });
                        }
                    }
                }
                // Clear the buffer after processing
                this.streamingToolCalls.clear();
                // Return the first tool call (limitation: we can only return one at a time)
                if (completedToolCalls.length > 0) {
                    return completedToolCalls[0];
                }
            }
            // For other finish reasons, check if we have accumulated usage info
            // If we have both finish reason and usage, emit the finish event
            if (this.streamingUsage || promptTokens > 0 || completionTokens > 0) {
                const finalUsage = this.streamingUsage || {
                    promptTokens,
                    completionTokens,
                };
                // Reset state for next request
                this.streamingUsage = null;
                const finalFinishReason = this.streamingFinishReason || "stop";
                this.streamingFinishReason = null;
                return {
                    type: "finish",
                    finishReason: finalFinishReason,
                    usage: finalUsage,
                };
            }
        }
        // If we have a finish reason but no usage yet, and this chunk has usage info
        // (Heroku pattern: finish reason in one chunk, usage in another)
        if (this.streamingFinishReason &&
            (promptTokens > 0 || completionTokens > 0)) {
            const finalFinishReason = this.streamingFinishReason;
            const finalUsage = this.streamingUsage || {
                promptTokens,
                completionTokens,
            };
            // Reset state for next request
            this.streamingFinishReason = null;
            this.streamingUsage = null;
            return {
                type: "finish",
                finishReason: finalFinishReason,
                usage: finalUsage,
            };
        }
        // Handle tool calls in delta
        if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
            for (const toolCall of delta.tool_calls) {
                const toolCallData = toolCall;
                const index = toolCallData.index;
                // Get or create tool call entry
                let streamingToolCall = this.streamingToolCalls.get(index);
                if (!streamingToolCall) {
                    streamingToolCall = {
                        argsBuffer: "",
                    };
                    this.streamingToolCalls.set(index, streamingToolCall);
                }
                // Update tool call data
                if (toolCallData.id) {
                    streamingToolCall.id = toolCallData.id;
                }
                if (toolCallData.function?.name) {
                    streamingToolCall.name = toolCallData.function.name;
                }
                if (toolCallData.function?.arguments) {
                    streamingToolCall.argsBuffer += toolCallData.function.arguments;
                }
            }
            // Don't return anything yet, wait for finish_reason
            return null;
        }
        // Handle text delta
        if (delta && delta.content && typeof delta.content === "string") {
            return {
                type: "text-delta",
                textDelta: delta.content,
            };
        }
        return null;
    }
    extractToolCalls(message) {
        if (!message || !message.tool_calls) {
            return undefined;
        }
        const toolCalls = message.tool_calls;
        if (!Array.isArray(toolCalls)) {
            console.warn("Invalid tool_calls format: expected array, got", typeof message.tool_calls);
            return undefined;
        }
        const validToolCalls = [];
        toolCalls.forEach((call, index) => {
            // Validate tool call is an object
            if (!call || typeof call !== "object") {
                console.warn(`Tool call at index ${index}: Invalid format, expected object, got`, typeof call);
                return;
            }
            const toolCall = call;
            const func = toolCall.function;
            let args = {};
            let rawArgs = undefined;
            if (func?.arguments) {
                if (typeof func.arguments === "string") {
                    rawArgs = func.arguments; // Preserve the raw JSON string
                    if (func.arguments.trim()) {
                        const parseResult = (0, provider_utils_1.safeParseJSON)({ text: func.arguments });
                        if (parseResult.success) {
                            args = parseResult.value;
                        }
                        else {
                            console.warn(`Tool call at index ${index}: Failed to parse function arguments as JSON:`, func.arguments, "Error:", (0, provider_utils_1.getErrorMessage)(parseResult.error));
                            args = {};
                        }
                    }
                }
                else if (typeof func.arguments === "object" &&
                    func.arguments !== null) {
                    args = func.arguments;
                    rawArgs = JSON.stringify(args); // Convert object to JSON string
                }
            }
            const toolCallId = toolCall.id || "";
            const toolName = func?.name || "";
            // Warn about missing ID
            if (!toolCall.id || typeof toolCall.id !== "string") {
                console.warn(`Tool call at index ${index}: Missing or invalid ID, expected string, got`, typeof toolCall.id);
            }
            // Warn about missing function object
            if (!func || typeof func !== "object") {
                console.warn(`Tool call at index ${index}: Missing or invalid function object, expected object, got`, typeof func);
            }
            // Only filter out tool calls with BOTH no ID AND no name
            if (!toolCallId && !toolName) {
                console.warn("Filtering out invalid tool call with no ID or name");
                return;
            }
            validToolCalls.push({
                toolCallId,
                toolCallType: "function",
                toolName,
                args,
                rawArgs,
            });
        });
        return validToolCalls;
    }
}
exports.HerokuChatLanguageModel = HerokuChatLanguageModel;
//# sourceMappingURL=chat.js.map