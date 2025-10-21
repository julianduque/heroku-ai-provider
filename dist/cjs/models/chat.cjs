"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HerokuChatLanguageModel = void 0;
const provider_1 = require("@ai-sdk/provider");
const provider_utils_1 = require("@ai-sdk/provider-utils");
const api_client_js_1 = require('../utils/api-client.cjs');
const error_handling_js_1 = require('../utils/error-handling.cjs');
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
class HerokuChatLanguageModel {
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
    constructor(model, apiKey, baseUrl) {
        this.model = model;
        this.specificationVersion = "v2";
        this.provider = "heroku";
        this.supportedUrls = {};
        // Streaming tool calls tracking
        this.streamingToolCalls = new Map();
        // Track finish reason and usage separately for Heroku API
        this.streamingFinishReason = null;
        this.streamingUsage = null;
        this.streamingTextId = null;
        this.streamingTextClosed = false;
        this.currentStructuredOutputToolName = null;
        // Load and validate API key using provider-utils
        this.apiKey = (0, provider_utils_1.loadApiKey)({
            apiKey,
            environmentVariableName: "INFERENCE_KEY",
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
        this.streamingTextId = null;
        this.streamingTextClosed = false;
        this.currentStructuredOutputToolName = null;
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
            "claude-4-sonnet",
            "claude-3-haiku",
            "claude-4-sonnet",
            "claude-4-5-sonnet",
            "claude-3-7-sonnet",
            "claude-3-5-haiku",
            "claude-3-5-sonnet-latest",
            "gpt-oss-120b",
            "nova-lite",
            "nova-pro",
        ];
        if (!supportedHerokuChatModels.includes(model)) {
            throw (0, error_handling_js_1.createValidationError)(`Unsupported chat model '${model}'. Supported models: ${supportedHerokuChatModels.join(", ")}`, "model", model);
        }
    }
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
    async doGenerate(options) {
        if (!options || !options.prompt) {
            throw new provider_1.APICallError({
                message: "Missing required prompt in options",
                url: this.baseUrl,
                requestBodyValues: { options },
            });
        }
        const warnings = this.collectCallWarnings(options);
        try {
            const structuredOutput = this.prepareStructuredOutputConfig(options.responseFormat);
            const messages = this.mapPromptToMessages(options.prompt);
            if (structuredOutput?.systemInstruction) {
                messages.unshift({
                    role: "system",
                    content: structuredOutput.systemInstruction,
                });
            }
            const requestBody = {
                model: this.model,
                messages,
                stream: false,
                temperature: options.temperature,
                max_tokens: options.maxOutputTokens,
                top_p: options.topP,
                stop: options.stopSequences,
                seed: options.seed,
            };
            const requestHeaders = this.normalizeHeaders(options.headers);
            let combinedTools = options.tools ? [...options.tools] : undefined;
            let effectiveToolChoice = options.toolChoice;
            let structuredOutputContext;
            if (structuredOutput) {
                if (combinedTools) {
                    combinedTools = [...combinedTools, structuredOutput.tool];
                }
                else {
                    combinedTools = [structuredOutput.tool];
                }
                effectiveToolChoice = {
                    type: "tool",
                    toolName: structuredOutput.toolName,
                };
                structuredOutputContext = {
                    expectedToolName: structuredOutput.toolName,
                };
            }
            if (combinedTools) {
                if (combinedTools.length === 0) {
                    throw new provider_1.APICallError({
                        message: "Tools must be a non-empty array when provided",
                        url: this.baseUrl,
                        requestBodyValues: { tools: combinedTools },
                    });
                }
                requestBody.tools = this.mapToolsToHerokuFormat(combinedTools);
                if (effectiveToolChoice) {
                    if (this.shouldReleaseToolChoice(effectiveToolChoice, messages)) {
                        requestBody.tool_choice = "auto";
                    }
                    else {
                        requestBody.tool_choice = this.mapToolChoiceToHerokuFormat(effectiveToolChoice, combinedTools);
                    }
                }
            }
            else if (effectiveToolChoice) {
                console.warn("Tool choice provided without tools - ignoring tool choice");
            }
            const response = await (0, api_client_js_1.makeHerokuRequest)(this.baseUrl, this.apiKey, requestBody, {
                maxRetries: 3,
                timeout: 30000,
                headers: requestHeaders,
            });
            return this.mapResponseToOutput(response, requestBody, warnings, structuredOutputContext);
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
     * This method implements the AI SDK v5 LanguageModelV2 interface for
     * streaming chat completions and returns a readable stream of structured parts.
     */
    async doStream(options) {
        if (!options || !options.prompt) {
            throw new provider_1.APICallError({
                message: "Missing required prompt in options",
                url: this.baseUrl,
                requestBodyValues: { options },
            });
        }
        const warnings = this.collectCallWarnings(options);
        try {
            const structuredOutput = this.prepareStructuredOutputConfig(options.responseFormat);
            const messages = this.mapPromptToMessages(options.prompt);
            if (structuredOutput?.systemInstruction) {
                messages.unshift({
                    role: "system",
                    content: structuredOutput.systemInstruction,
                });
            }
            this.resetStreamingState();
            if (structuredOutput) {
                this.currentStructuredOutputToolName = structuredOutput.toolName;
            }
            const requestBody = {
                model: this.model,
                messages,
                stream: true,
                temperature: options.temperature,
                max_tokens: options.maxOutputTokens,
                top_p: options.topP,
                stop: options.stopSequences,
                seed: options.seed,
            };
            let combinedTools = options.tools ? [...options.tools] : undefined;
            let effectiveToolChoice = options.toolChoice;
            if (structuredOutput) {
                if (combinedTools) {
                    combinedTools = [...combinedTools, structuredOutput.tool];
                }
                else {
                    combinedTools = [structuredOutput.tool];
                }
                effectiveToolChoice = {
                    type: "tool",
                    toolName: structuredOutput.toolName,
                };
            }
            if (combinedTools) {
                if (combinedTools.length === 0) {
                    throw new provider_1.APICallError({
                        message: "Tools must be a non-empty array when provided",
                        url: this.baseUrl,
                        requestBodyValues: { tools: combinedTools },
                    });
                }
                requestBody.tools = this.mapToolsToHerokuFormat(combinedTools);
                if (effectiveToolChoice) {
                    if (this.shouldReleaseToolChoice(effectiveToolChoice, messages)) {
                        requestBody.tool_choice = "auto";
                    }
                    else {
                        requestBody.tool_choice = this.mapToolChoiceToHerokuFormat(effectiveToolChoice, combinedTools);
                    }
                }
            }
            else if (effectiveToolChoice) {
                console.warn("Tool choice provided without tools - ignoring tool choice");
            }
            const response = await (0, api_client_js_1.makeHerokuRequest)(this.baseUrl, this.apiKey, requestBody, {
                maxRetries: 3,
                timeout: 30000,
                stream: true,
                headers: this.normalizeHeaders(options.headers),
            });
            const rawStream = (0, api_client_js_1.processHerokuStream)(response, this.baseUrl);
            const transformedStream = rawStream.pipeThrough(new TransformStream({
                transform: async (chunk, controller) => {
                    try {
                        const parts = await this.mapChunkToStreamParts(chunk);
                        for (const part of parts) {
                            controller.enqueue(part);
                        }
                    }
                    catch (streamError) {
                        controller.error(streamError);
                    }
                },
            }));
            const stream = new ReadableStream({
                start: async (controller) => {
                    controller.enqueue({ type: "stream-start", warnings });
                    const reader = transformedStream.getReader();
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) {
                                break;
                            }
                            if (value) {
                                controller.enqueue(value);
                            }
                        }
                    }
                    catch (streamError) {
                        controller.error(streamError);
                    }
                    finally {
                        reader.releaseLock();
                        controller.close();
                    }
                },
                cancel: async () => {
                    await transformedStream.cancel();
                },
            });
            return {
                stream,
                request: {
                    body: requestBody,
                },
                response: {
                    headers: response?.headers
                        ? Object.fromEntries(response.headers.entries())
                        : undefined,
                },
            };
        }
        catch (error) {
            this.currentStructuredOutputToolName = null;
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
                        (!convertedMessage.content ||
                            convertedMessage.content.trim() === "")) {
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
                let content = "";
                if (toolResult.output) {
                    const output = toolResult.output;
                    if (output.type === "text" || output.type === "error-text") {
                        content = String(output.value ?? "");
                    }
                    else if (output.type === "json" || output.type === "error-json") {
                        content = JSON.stringify(output.value, null, 2);
                    }
                }
                else if ("result" in toolResult) {
                    const result = toolResult.result;
                    if (typeof result === "string") {
                        content = result;
                    }
                    else if (typeof result === "object") {
                        content = JSON.stringify(result, null, 2);
                    }
                    else {
                        content = String(result);
                    }
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
                            const toolCall = part;
                            const toolCallId = typeof toolCall.toolCallId === "string"
                                ? toolCall.toolCallId
                                : (0, provider_utils_1.generateId)();
                            const toolName = typeof toolCall.toolName === "string" ? toolCall.toolName : "";
                            if (!toolName) {
                                continue;
                            }
                            const input = "input" in toolCall
                                ? toolCall.input
                                : toolCall.args;
                            let argsString = "{}";
                            if (typeof input === "string") {
                                argsString = input;
                            }
                            else if (input !== undefined) {
                                try {
                                    argsString = JSON.stringify(input);
                                }
                                catch {
                                    argsString = "{}";
                                }
                            }
                            toolCalls.push({
                                id: toolCallId,
                                type: "function",
                                function: {
                                    name: toolName,
                                    arguments: argsString,
                                },
                            });
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
            let schema;
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
                schema = funcObj.parameters || undefined;
            }
            // Handle flat tool format
            else if ("name" in tool) {
                name = tool.name || "";
                description =
                    "description" in tool && typeof tool.description === "string"
                        ? tool.description
                        : "";
                if ("inputSchema" in tool && tool.inputSchema) {
                    schema = tool.inputSchema;
                }
                else if ("parameters" in tool && tool.parameters) {
                    schema = tool.parameters;
                }
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
            let parametersSchema = schema ? JSON.parse(JSON.stringify(schema)) : {};
            if (parametersSchema && typeof parametersSchema === "object") {
                if ("$schema" in parametersSchema) {
                    delete parametersSchema.$schema;
                }
                if (!("type" in parametersSchema)) {
                    parametersSchema.type = "object";
                }
            }
            else {
                parametersSchema = { type: "object" };
            }
            return {
                type: "function",
                function: {
                    name: trimmedName,
                    description: description.trim(),
                    parameters: parametersSchema,
                },
            };
        });
    }
    mapToolChoiceToHerokuFormat(toolChoice, availableTools) {
        if (!toolChoice) {
            return "auto";
        }
        if (typeof toolChoice === "string") {
            if (toolChoice === "auto" || toolChoice === "none") {
                return toolChoice;
            }
            if (toolChoice === "required") {
                return "auto";
            }
            const name = toolChoice.trim();
            this.assertToolExists(name, availableTools, toolChoice);
            return { type: "function", function: { name } };
        }
        switch (toolChoice.type) {
            case "auto":
                return "auto";
            case "none":
                return "none";
            case "required":
                return "auto";
            case "tool": {
                const { toolName } = toolChoice;
                const name = toolName.trim();
                if (!name) {
                    throw new provider_1.APICallError({
                        message: "Tool choice must include a toolName",
                        url: "",
                        requestBodyValues: { toolChoice },
                    });
                }
                this.assertToolExists(name, availableTools, toolChoice);
                return { type: "function", function: { name } };
            }
            default:
                return "auto";
        }
    }
    shouldReleaseToolChoice(toolChoice, messages) {
        if (!toolChoice || !Array.isArray(messages) || messages.length === 0) {
            return false;
        }
        const hasToolResponse = messages.some((message) => message.role === "tool");
        if (!hasToolResponse) {
            return false;
        }
        if (typeof toolChoice === "string") {
            return !["auto", "none", "required"].includes(toolChoice);
        }
        if (toolChoice && typeof toolChoice === "object") {
            const toolChoiceRecord = toolChoice;
            const typeValue = typeof toolChoiceRecord.type === "string"
                ? toolChoiceRecord.type
                : undefined;
            if (!typeValue && typeof toolChoiceRecord.toolName === "string") {
                return true;
            }
            if (!typeValue) {
                return false;
            }
            if (typeValue === "tool" || typeValue === "function") {
                return true;
            }
            if (typeValue === "auto" ||
                typeValue === "none" ||
                typeValue === "required") {
                return false;
            }
        }
        return false;
    }
    assertToolExists(toolName, availableTools, context) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(toolName)) {
            throw new provider_1.APICallError({
                message: `Invalid tool name '${toolName}'. Tool names must match ^[a-zA-Z_][a-zA-Z0-9_]*$`,
                url: "",
                requestBodyValues: { context },
            });
        }
        if (!availableTools) {
            return;
        }
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
                requestBodyValues: { context },
            });
        }
    }
    async mapResponseToOutput(response, requestBody, warnings, structuredOutputContext) {
        if (!response || typeof response !== "object") {
            throw new provider_1.APICallError({
                message: "Invalid response format from Heroku API",
                url: this.baseUrl,
                requestBodyValues: requestBody,
                cause: response,
            });
        }
        const choices = response.choices;
        if (!Array.isArray(choices) || choices.length === 0) {
            throw new provider_1.APICallError({
                message: "No choices in response from Heroku API",
                url: this.baseUrl,
                requestBodyValues: requestBody,
                cause: response,
            });
        }
        const choice = choices[0];
        const message = choice.message;
        const text = this.extractMessageText(message);
        const toolCalls = await this.extractToolCalls(message);
        const content = [];
        let responseText;
        if (structuredOutputContext) {
            responseText = await this.extractStructuredOutputText(toolCalls, structuredOutputContext.expectedToolName);
        }
        if (responseText === undefined && text.trim().length > 0) {
            responseText = text;
        }
        if (responseText === undefined && toolCalls && toolCalls.length > 0) {
            responseText = await this.extractStructuredOutputText(toolCalls);
        }
        if (responseText !== undefined) {
            content.push({ type: "text", text: responseText });
        }
        else {
            content.push({ type: "text", text: "" });
        }
        if (toolCalls && toolCalls.length > 0) {
            content.push(...toolCalls);
        }
        const usageData = response.usage || {};
        const usage = {
            inputTokens: typeof usageData.prompt_tokens === "number"
                ? usageData.prompt_tokens
                : undefined,
            outputTokens: typeof usageData.completion_tokens === "number"
                ? usageData.completion_tokens
                : undefined,
            totalTokens: typeof usageData.total_tokens === "number"
                ? usageData.total_tokens
                : undefined,
            reasoningTokens: typeof usageData.reasoning_tokens === "number"
                ? usageData.reasoning_tokens
                : undefined,
            cachedInputTokens: typeof usageData.cached_input_tokens === "number"
                ? usageData.cached_input_tokens
                : undefined,
        };
        if (usage.totalTokens === undefined &&
            usage.inputTokens !== undefined &&
            usage.outputTokens !== undefined) {
            usage.totalTokens = usage.inputTokens + usage.outputTokens;
        }
        const finishReason = this.normalizeFinishReason(choice.finish_reason);
        const responseMetadata = this.extractResponseMetadata(response);
        return {
            content,
            finishReason,
            usage,
            providerMetadata: undefined,
            request: {
                body: requestBody,
            },
            response: {
                ...responseMetadata,
                body: response,
            },
            warnings,
        };
    }
    extractMessageText(message) {
        if (!message) {
            return "";
        }
        const content = message.content;
        if (typeof content === "string") {
            return content;
        }
        if (Array.isArray(content)) {
            const textParts = content
                .filter((part) => Boolean(part &&
                typeof part === "object" &&
                "type" in part &&
                part.type === "text"))
                .map((part) => {
                const textValue = part.text;
                return typeof textValue === "string" ? textValue : "";
            })
                .filter((value) => value.trim().length > 0);
            return textParts.join("\n");
        }
        if (content &&
            typeof content === "object" &&
            "text" in content &&
            typeof content.text === "string") {
            return content.text;
        }
        return "";
    }
    normalizeFinishReason(value) {
        const reason = typeof value === "string" ? value : "";
        switch (reason) {
            case "stop":
                return "stop";
            case "length":
            case "max_tokens":
                return "length";
            case "content_filter":
                return "content-filter";
            case "tool_calls":
            case "function_call":
                return "tool-calls";
            case "error":
                return "error";
            case "other":
                return "other";
            default:
                return reason ? "other" : "unknown";
        }
    }
    extractResponseMetadata(response) {
        const id = typeof response.id === "string" ? response.id : undefined;
        const modelId = typeof response.model === "string" ? response.model : undefined;
        const created = response.created;
        let timestamp;
        if (typeof created === "number") {
            timestamp = new Date(created * 1000);
        }
        else if (created instanceof Date) {
            timestamp = created;
        }
        return { id, modelId, timestamp };
    }
    collectCallWarnings(options) {
        const warnings = [];
        const addUnsupportedSetting = (setting, enabled, details) => {
            if (enabled) {
                warnings.push({ type: "unsupported-setting", setting, details });
            }
        };
        addUnsupportedSetting("topK", options.topK !== undefined, "Heroku chat models do not support topK sampling.");
        addUnsupportedSetting("presencePenalty", options.presencePenalty !== undefined, "Presence penalty is not supported by Heroku chat models.");
        addUnsupportedSetting("frequencyPenalty", options.frequencyPenalty !== undefined, "Frequency penalty is not supported by Heroku chat models.");
        addUnsupportedSetting("responseFormat", Boolean(options.responseFormat &&
            !this.isSupportedResponseFormat(options.responseFormat)), "Unsupported responseFormat configuration for Heroku chat models.");
        addUnsupportedSetting("seed", options.seed !== undefined, "Deterministic sampling is not currently available.");
        addUnsupportedSetting("includeRawChunks", options.includeRawChunks === true, "Raw stream chunks are not exposed by the Heroku provider.");
        addUnsupportedSetting("abortSignal", options.abortSignal !== undefined, "Request cancellation via abortSignal is not supported by the provider.");
        addUnsupportedSetting("providerOptions", Boolean(options.providerOptions &&
            Object.keys(options.providerOptions).length > 0), "Provider-specific options are not supported.");
        return warnings;
    }
    isSupportedResponseFormat(responseFormat) {
        if (!responseFormat) {
            return true;
        }
        if (responseFormat.type === "text") {
            return true;
        }
        if (responseFormat.type === "json") {
            return true;
        }
        return false;
    }
    normalizeHeaders(headers) {
        if (!headers) {
            return undefined;
        }
        const entries = Object.entries(headers).filter((entry) => typeof entry[1] === "string");
        if (entries.length === 0) {
            return undefined;
        }
        return Object.fromEntries(entries);
    }
    prepareStructuredOutputConfig(responseFormat) {
        if (!responseFormat || responseFormat.type !== "json") {
            return undefined;
        }
        const parametersSchema = this.sanitizeStructuredSchema(responseFormat.schema);
        const toolName = this.normalizeStructuredToolName(responseFormat.name);
        const description = responseFormat.description?.trim() ||
            "Return structured data that satisfies the requested schema.";
        const systemInstruction = this.buildStructuredOutputInstruction(toolName, parametersSchema, responseFormat.description);
        return {
            tool: {
                type: "function",
                name: toolName,
                description,
                inputSchema: parametersSchema,
            },
            toolName,
            systemInstruction,
        };
    }
    sanitizeStructuredSchema(schema) {
        const defaultSchema = {
            type: "object",
            additionalProperties: true,
        };
        if (!schema || typeof schema !== "object") {
            return defaultSchema;
        }
        let cloned;
        try {
            cloned = JSON.parse(JSON.stringify(schema));
        }
        catch {
            return defaultSchema;
        }
        if ("$schema" in cloned) {
            delete cloned.$schema;
        }
        if (!("type" in cloned)) {
            cloned.type = "object";
        }
        return cloned;
    }
    normalizeStructuredToolName(name) {
        const fallback = "deliver_structured_output";
        if (!name || typeof name !== "string") {
            return fallback;
        }
        const normalized = name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+/, "")
            .replace(/_+$/, "");
        if (!normalized || !/^[a-zA-Z_]/.test(normalized)) {
            return fallback;
        }
        return normalized.slice(0, 64);
    }
    buildStructuredOutputInstruction(toolName, schema, description) {
        let schemaText;
        try {
            schemaText = JSON.stringify(schema, null, 2);
        }
        catch {
            schemaText = undefined;
        }
        const instructionParts = [
            `You must provide the final answer by calling the function "${toolName}" exactly once.`,
            "Do not include any narrative text before or after the function call.",
        ];
        if (description && description.trim().length > 0) {
            instructionParts.push(`The structured data should satisfy: ${description.trim()}`);
        }
        if (schemaText) {
            instructionParts.push(`The arguments must strictly conform to this JSON schema:\n${schemaText}`);
        }
        else {
            instructionParts.push("Provide arguments that form a valid JSON object matching the requested schema.");
        }
        instructionParts.push("Return only the tool call with valid JSON arguments (no Markdown code fences).");
        return instructionParts.join("\n");
    }
    async mapChunkToStreamParts(chunk) {
        const parts = [];
        if (!chunk || typeof chunk !== "object") {
            return parts;
        }
        const choices = chunk.choices;
        if (!Array.isArray(choices) || choices.length === 0) {
            return parts;
        }
        const choice = choices[0];
        const delta = choice.delta || {};
        const usageData = chunk.usage;
        if (usageData) {
            this.streamingUsage = {
                inputTokens: typeof usageData.prompt_tokens === "number"
                    ? usageData.prompt_tokens
                    : undefined,
                outputTokens: typeof usageData.completion_tokens === "number"
                    ? usageData.completion_tokens
                    : undefined,
                totalTokens: typeof usageData.total_tokens === "number"
                    ? usageData.total_tokens
                    : undefined,
                reasoningTokens: typeof usageData.reasoning_tokens === "number"
                    ? usageData.reasoning_tokens
                    : undefined,
                cachedInputTokens: typeof usageData.cached_input_tokens === "number"
                    ? usageData.cached_input_tokens
                    : undefined,
            };
            if (this.streamingUsage.totalTokens === undefined &&
                this.streamingUsage.inputTokens !== undefined &&
                this.streamingUsage.outputTokens !== undefined) {
                this.streamingUsage.totalTokens =
                    this.streamingUsage.inputTokens + this.streamingUsage.outputTokens;
            }
        }
        if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
            for (const toolCall of delta.tool_calls) {
                const index = typeof toolCall.index === "number" && toolCall.index >= 0
                    ? toolCall.index
                    : 0;
                let streamingToolCall = this.streamingToolCalls.get(index);
                if (!streamingToolCall) {
                    streamingToolCall = { argsBuffer: "" };
                    this.streamingToolCalls.set(index, streamingToolCall);
                }
                if (typeof toolCall.id === "string") {
                    streamingToolCall.id = toolCall.id;
                }
                const func = toolCall.function;
                if (func) {
                    if (typeof func.name === "string" && func.name.trim().length > 0) {
                        streamingToolCall.name = func.name.trim();
                    }
                    if (typeof func.arguments === "string") {
                        streamingToolCall.argsBuffer += func.arguments;
                    }
                }
            }
        }
        if (typeof delta.content === "string" && delta.content.length > 0) {
            if (!this.streamingTextId) {
                this.streamingTextId = (0, provider_utils_1.generateId)();
                parts.push({ type: "text-start", id: this.streamingTextId });
            }
            parts.push({
                type: "text-delta",
                id: this.streamingTextId,
                delta: delta.content,
            });
        }
        if (choice.finish_reason) {
            this.streamingFinishReason = this.normalizeFinishReason(choice.finish_reason);
        }
        const haveFinish = Boolean(this.streamingFinishReason);
        const haveUsage = Boolean(this.streamingUsage);
        if (haveFinish && this.streamingFinishReason === "tool-calls") {
            const toolCallParts = this.flushStreamingToolCalls();
            const combinedToolCalls = [...toolCallParts];
            const finalMessageToolCalls = await this.extractToolCalls(choice.message);
            if (finalMessageToolCalls && finalMessageToolCalls.length > 0) {
                const existingIds = new Set(combinedToolCalls.map((call) => call.toolCallId));
                for (const call of finalMessageToolCalls) {
                    if (!existingIds.has(call.toolCallId)) {
                        combinedToolCalls.push(call);
                    }
                }
            }
            if (combinedToolCalls.length > 0) {
                let structuredText;
                if (this.currentStructuredOutputToolName) {
                    structuredText = await this.extractStructuredOutputText(combinedToolCalls, this.currentStructuredOutputToolName);
                }
                if (structuredText === undefined) {
                    structuredText =
                        await this.extractStructuredOutputText(combinedToolCalls);
                }
                if (structuredText !== undefined) {
                    if (this.streamingTextId && !this.streamingTextClosed) {
                        parts.push({ type: "text-end", id: this.streamingTextId });
                        this.streamingTextClosed = true;
                    }
                    const streamId = (0, provider_utils_1.generateId)();
                    this.streamingTextId = streamId;
                    this.streamingTextClosed = false;
                    parts.push({ type: "text-start", id: streamId });
                    parts.push({
                        type: "text-delta",
                        id: streamId,
                        delta: structuredText,
                    });
                    parts.push({ type: "text-end", id: streamId });
                    this.streamingTextClosed = true;
                }
                parts.push(...combinedToolCalls);
            }
        }
        if (haveFinish && this.streamingTextId && !this.streamingTextClosed) {
            parts.push({ type: "text-end", id: this.streamingTextId });
            this.streamingTextClosed = true;
        }
        if (haveFinish && haveUsage) {
            parts.push({
                type: "finish",
                finishReason: this.streamingFinishReason,
                usage: this.streamingUsage,
            });
            this.resetStreamingState();
        }
        return parts;
    }
    flushStreamingToolCalls() {
        const toolCallParts = [];
        for (const entry of this.streamingToolCalls.values()) {
            if (!entry.name) {
                continue;
            }
            const toolCallId = entry.id && entry.id.trim().length > 0 ? entry.id : (0, provider_utils_1.generateId)();
            const input = entry.argsBuffer.length > 0 ? entry.argsBuffer : "{}";
            toolCallParts.push({
                type: "tool-call",
                toolCallId,
                toolName: entry.name,
                input,
            });
        }
        this.streamingToolCalls.clear();
        return toolCallParts;
    }
    async extractStructuredOutputText(toolCalls, expectedToolName) {
        if (!toolCalls || toolCalls.length === 0) {
            return undefined;
        }
        const matchingCall = toolCalls.find((call) => expectedToolName &&
            call.toolName === expectedToolName &&
            typeof call.input === "string" &&
            call.input.trim().length > 0) ??
            toolCalls.find((call) => typeof call.input === "string" && call.input.trim().length > 0);
        if (!matchingCall || typeof matchingCall.input !== "string") {
            return undefined;
        }
        const rawInput = matchingCall.input.trim();
        try {
            const parseResult = await (0, provider_utils_1.safeParseJSON)({ text: rawInput });
            if (parseResult.success) {
                try {
                    return JSON.stringify(parseResult.value);
                }
                catch (serializationError) {
                    console.warn(`Failed to serialize structured output for tool "${matchingCall.toolName}"`, (0, provider_utils_1.getErrorMessage)(serializationError));
                    return rawInput;
                }
            }
            console.warn(`Structured output tool "${matchingCall.toolName}" returned invalid JSON arguments.`, parseResult.error ? (0, provider_utils_1.getErrorMessage)(parseResult.error) : undefined);
        }
        catch (error) {
            console.warn(`Failed to parse structured output for tool "${matchingCall.toolName}"`, (0, provider_utils_1.getErrorMessage)(error));
        }
        return rawInput;
    }
    collectToolCallCandidates(message) {
        if (!message) {
            return [];
        }
        const candidates = [];
        const directToolCalls = message.tool_calls;
        if (Array.isArray(directToolCalls)) {
            for (const call of directToolCalls) {
                if (call && typeof call === "object") {
                    candidates.push(call);
                }
            }
        }
        const content = message.content;
        if (Array.isArray(content)) {
            for (const part of content) {
                if (!part || typeof part !== "object") {
                    continue;
                }
                const partRecord = part;
                const typeValue = typeof partRecord.type === "string"
                    ? partRecord.type.toLowerCase()
                    : undefined;
                if (typeValue === "tool_calls" &&
                    Array.isArray(partRecord.tool_calls)) {
                    for (const call of partRecord.tool_calls) {
                        if (call && typeof call === "object") {
                            candidates.push(call);
                        }
                    }
                    continue;
                }
                if (typeValue === "tool_call" ||
                    typeValue === "tool-use" ||
                    typeValue === "tool_use" ||
                    typeValue === "function_call") {
                    const normalized = {};
                    const functionObj = {};
                    const partFunction = partRecord.function;
                    if (partFunction && typeof partFunction === "object") {
                        Object.assign(functionObj, partFunction);
                    }
                    if (typeof partRecord.name === "string" && !functionObj.name) {
                        functionObj.name = partRecord.name;
                    }
                    const argsCandidate = partRecord.arguments ??
                        partRecord.args ??
                        partRecord.input ??
                        functionObj.arguments;
                    if (functionObj.arguments === undefined &&
                        argsCandidate !== undefined) {
                        functionObj.arguments = argsCandidate;
                    }
                    normalized.function = functionObj;
                    normalized.id =
                        partRecord.id ??
                            partRecord.toolCallId ??
                            partRecord.tool_call_id ??
                            functionObj.id;
                    candidates.push(normalized);
                }
            }
        }
        return candidates;
    }
    async extractToolCalls(message) {
        const candidates = this.collectToolCallCandidates(message);
        if (candidates.length === 0) {
            return undefined;
        }
        const mappedCalls = [];
        for (const [index, call] of candidates.entries()) {
            if (!call || typeof call !== "object") {
                console.warn(`Tool call at index ${index}: Invalid format, expected object, got`, typeof call);
                continue;
            }
            const toolCall = call;
            const func = toolCall.function;
            const toolCallId = typeof toolCall.id === "string" && toolCall.id.trim().length > 0
                ? toolCall.id
                : (0, provider_utils_1.generateId)();
            const toolNameCandidate = (func && typeof func.name === "string" ? func.name : undefined) ??
                (typeof toolCall.name === "string" ? toolCall.name : undefined) ??
                (typeof toolCall.tool_name === "string"
                    ? toolCall.tool_name
                    : undefined) ??
                (typeof toolCall.toolName === "string"
                    ? toolCall.toolName
                    : undefined);
            const toolName = toolNameCandidate && toolNameCandidate.trim().length > 0
                ? toolNameCandidate.trim()
                : "";
            if (!toolName) {
                console.warn(`Tool call at index ${index}: Missing tool name, skipping entry`);
                continue;
            }
            const argumentSources = [];
            if (func && "arguments" in func) {
                argumentSources.push(func.arguments);
            }
            if ("arguments" in toolCall) {
                argumentSources.push(toolCall.arguments);
            }
            if ("args" in toolCall) {
                argumentSources.push(toolCall.args);
            }
            if ("input" in toolCall) {
                argumentSources.push(toolCall.input);
            }
            let input = "{}";
            let parsedSuccessfully = false;
            for (const source of argumentSources) {
                if (source === undefined || source === null) {
                    continue;
                }
                if (typeof source === "string") {
                    const trimmed = source.trim();
                    if (trimmed.length === 0) {
                        continue;
                    }
                    input = trimmed;
                    try {
                        const parseResult = await (0, provider_utils_1.safeParseJSON)({ text: trimmed });
                        if (!parseResult.success) {
                            console.warn(`Tool call at index ${index}: Failed to parse arguments JSON`, (0, provider_utils_1.getErrorMessage)(parseResult.error));
                        }
                        else {
                            parsedSuccessfully = true;
                        }
                    }
                    catch (parseError) {
                        console.warn(`Tool call at index ${index}: Unexpected error parsing arguments`, (0, provider_utils_1.getErrorMessage)(parseError));
                    }
                    break;
                }
                if (typeof source === "object") {
                    try {
                        input = JSON.stringify(source);
                        parsedSuccessfully = true;
                        break;
                    }
                    catch {
                        console.warn(`Tool call at index ${index}: Failed to serialize arguments object`);
                    }
                }
            }
            if (!parsedSuccessfully && input === "{}") {
                console.warn(`Tool call at index ${index}: No usable arguments found, defaulting to empty object`);
            }
            mappedCalls.push({
                type: "tool-call",
                toolCallId,
                toolName,
                input,
            });
        }
        return mappedCalls.length > 0 ? mappedCalls : undefined;
    }
}
exports.HerokuChatLanguageModel = HerokuChatLanguageModel;
//# sourceMappingURL=chat.js.map