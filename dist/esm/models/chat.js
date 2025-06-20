import { APICallError, } from "@ai-sdk/provider";
import { generateId, loadApiKey, withoutTrailingSlash, safeParseJSON, isParsableJson, getErrorMessage, } from "@ai-sdk/provider-utils";
import { makeHerokuRequest, processHerokuStream } from "../utils/api-client.js";
import { createValidationError } from "../utils/error-handling.js";
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
export class HerokuChatLanguageModel {
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
    constructor(model, apiKey, baseUrl) {
        this.model = model;
        this.specificationVersion = "v1";
        this.provider = "heroku";
        this.defaultObjectGenerationMode = "json";
        // Track streaming tool call state
        this.streamingToolCalls = new Map();
        // Buffer for text content to detect tool calls
        this.textBuffer = "";
        // Load and validate API key using provider-utils
        this.apiKey = loadApiKey({
            apiKey,
            environmentVariableName: "HEROKU_INFERENCE_KEY",
            apiKeyParameterName: "apiKey",
            description: "Heroku AI API key for chat completions",
        });
        // Normalize base URL by removing trailing slash
        this.baseUrl = withoutTrailingSlash(baseUrl) || baseUrl;
        // Comprehensive parameter validation
        this.validateConstructorParameters(model, this.apiKey, this.baseUrl);
        this.modelId = model;
    }
    /**
     * Validate constructor parameters with detailed error messages
     * @internal
     */
    validateConstructorParameters(model, apiKey, baseUrl) {
        // Validate model parameter
        if (!model || typeof model !== "string") {
            throw createValidationError("Model must be a non-empty string", "model", model);
        }
        if (model.trim().length === 0) {
            throw createValidationError("Model cannot be empty or contain only whitespace", "model", model);
        }
        // Validate base URL parameter
        if (!baseUrl || typeof baseUrl !== "string") {
            throw createValidationError("Base URL must be a non-empty string", "baseUrl", baseUrl);
        }
        if (baseUrl.trim().length === 0) {
            throw createValidationError("Base URL cannot be empty or contain only whitespace", "baseUrl", baseUrl);
        }
        // Validate URL format
        try {
            const url = new URL(baseUrl);
            // Ensure it's HTTP or HTTPS
            if (!["http:", "https:"].includes(url.protocol)) {
                throw createValidationError("Base URL must use HTTP or HTTPS protocol", "baseUrl", baseUrl);
            }
            // Ensure it has a valid hostname
            if (!url.hostname || url.hostname.length === 0) {
                throw createValidationError("Base URL must have a valid hostname", "baseUrl", baseUrl);
            }
        }
        catch (urlError) {
            if (urlError instanceof Error && urlError.name === "TypeError") {
                throw createValidationError(`Base URL is not a valid URL format: ${urlError.message}`, "baseUrl", baseUrl);
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
            throw createValidationError(`Unsupported chat model '${model}'. Supported models: ${supportedHerokuChatModels.join(", ")}`, "model", model);
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
            throw new APICallError({
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
                    throw new APICallError({
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
            const response = await makeHerokuRequest(this.baseUrl, this.apiKey, requestBody, {
                maxRetries: 3,
                timeout: 30000,
            });
            return this.mapResponseToOutput(response, options);
        }
        catch (error) {
            if (error instanceof APICallError) {
                throw error;
            }
            throw new APICallError({
                message: `Failed to generate completion: ${getErrorMessage(error)}`,
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
        // Validate options
        if (!options || !options.prompt) {
            throw new APICallError({
                message: "Missing required prompt in options",
                url: "",
                requestBodyValues: { options },
            });
        }
        // Clear the buffer at the start of a new stream
        this.textBuffer = "";
        try {
            // Clear streaming tool calls state for new stream
            this.streamingToolCalls.clear();
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
                    throw new APICallError({
                        message: "Tools must be a non-empty array when provided",
                        url: "",
                        requestBodyValues: { tools },
                    });
                }
            }
            else if (toolChoice) {
                // Warn if tool choice is provided without tools
                console.warn("Tool choice provided without tools - ignoring tool choice");
            }
            // Map prompt to Heroku messages format, injecting tools into system prompt
            const messages = this.mapPromptToMessages(options.prompt, tools);
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
            // Tools and tool_choice are now injected into the system prompt,
            // so we no longer need to send them as separate parameters.
            // Make API request
            const response = await makeHerokuRequest(this.baseUrl, this.apiKey, requestBody, {
                maxRetries: 3,
                timeout: 30000,
                stream: true,
            });
            // Create streaming response
            const rawStream = processHerokuStream(response, this.baseUrl);
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
            if (error instanceof APICallError) {
                throw error;
            }
            throw new APICallError({
                message: `Failed to stream completion: ${getErrorMessage(error)}`,
                url: this.baseUrl,
                requestBodyValues: {},
                cause: error,
            });
        }
    }
    mapPromptToMessages(prompt, tools) {
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
        // Inject tool definitions into the system prompt if tools are provided
        if (tools && tools.length > 0) {
            const toolDefinitions = this.mapToolsToHerokuFormat(tools)
                .map((tool) => `{"type": "function", "function": ${JSON.stringify(tool.function)}}`)
                .join("\n");
            systemMessageContent += `\n\nYou have access to the following tools. Use them when appropriate:\n${toolDefinitions}`;
        }
        // Add the (potentially modified) system message to the start
        if (systemMessageContent.trim() !== "") {
            messages.push({ role: "system", content: systemMessageContent.trim() });
        }
        // Handle the rest of the messages
        for (const item of promptMessages) {
            const convertedMessage = this.convertMessageToHerokuFormat(item);
            messages.push(convertedMessage);
        }
        return messages;
    }
    convertMessageToHerokuFormat(item) {
        // Validate that item is an object
        if (!item || typeof item !== "object") {
            throw createValidationError("Prompt item must be an object", "promptItem", item);
        }
        const messageItem = item;
        // Validate role
        if (!messageItem.role || typeof messageItem.role !== "string") {
            throw createValidationError("Message role must be a string", "role", messageItem.role);
        }
        const role = messageItem.role;
        // Validate role values
        if (!["system", "user", "assistant", "tool"].includes(role)) {
            throw new APICallError({
                message: `Invalid message role: ${role}`,
                url: "",
                requestBodyValues: { role },
            });
        }
        // Handle content based on message type
        let content = "";
        if (role === "system") {
            if (typeof messageItem.content === "string") {
                content = messageItem.content;
            }
            else {
                throw createValidationError("System message content must be a string", "content", messageItem.content);
            }
        }
        else if (role === "user") {
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
                throw createValidationError("User message content must be a string, array, or object with text property", "content", messageItem.content);
            }
            // Validate content is not empty or whitespace-only
            if (!content || content.trim() === "") {
                throw new APICallError({
                    message: "Message content cannot be empty",
                    url: "",
                    requestBodyValues: { content },
                });
            }
        }
        else if (role === "assistant") {
            if (typeof messageItem.content === "string") {
                content = messageItem.content;
            }
            else if (Array.isArray(messageItem.content)) {
                // Handle array content for assistant messages
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
            else {
                throw createValidationError("Assistant message content must be a string or array", "content", messageItem.content);
            }
        }
        else if (role === "tool") {
            // Handle tool result messages from the AI SDK
            if (Array.isArray(messageItem.content)) {
                const toolResults = [];
                for (const part of messageItem.content) {
                    if (part &&
                        typeof part === "object" &&
                        "type" in part &&
                        part.type === "tool-result") {
                        const toolResult = part;
                        const toolName = toolResult.toolName || "unknown_tool";
                        const result = toolResult.result;
                        // Format tool result as text that the model can understand
                        let resultText = "";
                        if (typeof result === "string") {
                            resultText = result;
                        }
                        else if (typeof result === "object") {
                            resultText = JSON.stringify(result, null, 2);
                        }
                        else {
                            resultText = String(result);
                        }
                        toolResults.push(`Tool "${toolName}" returned: ${resultText}`);
                    }
                }
                content = toolResults.join("\n\n");
            }
            else {
                throw createValidationError("Tool message content must be an array of tool results", "content", messageItem.content);
            }
        }
        // Convert tool messages to user messages since Heroku API may not support tool role
        const finalRole = role === "tool" ? "user" : role;
        return {
            role: finalRole,
            content,
        };
    }
    mapToolsToHerokuFormat(tools) {
        if (!Array.isArray(tools)) {
            throw createValidationError("Tools must be an array", "tools", tools);
        }
        return tools.map((tool, index) => {
            // Validate tool is an object
            if (!tool || typeof tool !== "object") {
                throw new APICallError({
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
                    throw new APICallError({
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
                throw new APICallError({
                    message: `Tool at index ${index}: Invalid tool format. Expected object with 'name' and 'description' properties or nested function object`,
                    url: "",
                    requestBodyValues: { [`tools[${index}]`]: tool },
                });
            }
            // Validate name
            if (!name || name.trim() === "") {
                throw new APICallError({
                    message: `Tool at index ${index}: Tool must have a non-empty name`,
                    url: "",
                    requestBodyValues: { [`tools[${index}]`]: tool },
                });
            }
            // Validate description
            if (!description || description.trim() === "") {
                throw new APICallError({
                    message: `Tool at index ${index}: Tool must have a non-empty description`,
                    url: "",
                    requestBodyValues: { [`tools[${index}]`]: tool },
                });
            }
            // Validate tool name format (basic function name validation)
            const trimmedName = name.trim();
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
                throw new APICallError({
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
                throw new APICallError({
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
                    throw new APICallError({
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
                        throw new APICallError({
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
                            throw new APICallError({
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
                    throw new APICallError({
                        message: `Unsupported tool choice type: '${typedToolChoice.type}'`,
                        url: "",
                        requestBodyValues: { toolChoice },
                    });
                }
                if ("function" in toolChoice) {
                    const func = typedToolChoice.function;
                    const toolName = func.name;
                    if (!toolName || toolName.trim() === "") {
                        throw new APICallError({
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
                            throw new APICallError({
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
                    throw new APICallError({
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
        throw new APICallError({
            message: "Invalid tool choice format",
            url: "",
            requestBodyValues: { toolChoice },
        });
    }
    mapResponseToOutput(response, _options) {
        // Validate response structure
        if (!response || typeof response !== "object") {
            throw new APICallError({
                message: "Invalid response format from Heroku API",
                url: this.baseUrl,
                requestBodyValues: {},
                cause: response,
            });
        }
        // Extract choices
        const choices = response.choices;
        if (!Array.isArray(choices) || choices.length === 0) {
            throw new APICallError({
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
            args: JSON.stringify(call.args), // Convert to JSON string as expected by AI SDK
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
        if (!delta) {
            // Handle finish reason when delta is not present
            const finishReason = choice.finish_reason;
            if (finishReason) {
                // Extract usage from the chunk if available
                const usage = chunk.usage || {};
                const promptTokens = usage.prompt_tokens || 0;
                const completionTokens = usage.completion_tokens || 0;
                // Normalize finish reason - map Heroku API finish reasons to AI SDK format
                let normalizedFinishReason = finishReason;
                // Convert string to LanguageModelV1FinishReason
                const finishReasonStr = String(finishReason);
                if (finishReasonStr === "tool_calls" ||
                    finishReasonStr === "function_call") {
                    // AI SDK uses "tool-calls" with hyphen, not underscore
                    normalizedFinishReason = "tool-calls";
                }
                else if (finishReasonStr === "content_filter") {
                    normalizedFinishReason =
                        "content-filter";
                }
                else if (finishReasonStr === "max_tokens") {
                    normalizedFinishReason = "length";
                }
                else {
                    // Default valid finish reasons: "stop", "length", "content-filter", "tool-calls", "error", "other"
                    const validFinishReasons = [
                        "stop",
                        "length",
                        "content-filter",
                        "tool-calls",
                        "error",
                        "other",
                    ];
                    normalizedFinishReason = validFinishReasons.includes(finishReasonStr)
                        ? finishReasonStr
                        : "other";
                }
                return {
                    type: "finish",
                    finishReason: normalizedFinishReason,
                    usage: {
                        promptTokens,
                        completionTokens,
                    },
                };
            }
            return null;
        }
        // Handle text delta
        if (delta.content && typeof delta.content === "string") {
            this.textBuffer += delta.content;
            // Attempt to find a complete JSON object in the buffer
            const jsonMatch = this.textBuffer.match(/{[\s\S]*}/);
            if (jsonMatch) {
                const potentialJson = jsonMatch[0];
                const parsed = safeParseJSON({ text: potentialJson });
                if (parsed.success) {
                    const toolCallData = parsed.value;
                    let toolName;
                    let args;
                    // Heuristic to identify if this is a tool call object
                    if (toolCallData.function &&
                        typeof toolCallData.function === "string") {
                        toolName = toolCallData.function;
                        args = JSON.stringify(toolCallData.arguments ?? {});
                    }
                    else if (Object.keys(toolCallData).length === 1) {
                        toolName = Object.keys(toolCallData)[0];
                        const potentialArgs = toolCallData[toolName];
                        if (typeof potentialArgs === "object") {
                            args = JSON.stringify(potentialArgs);
                        }
                    }
                    if (toolName && args) {
                        // It's a tool call, clear the buffer and return the tool call part
                        this.textBuffer = "";
                        return {
                            type: "tool-call",
                            toolCallType: "function",
                            toolCallId: generateId(),
                            toolName,
                            args,
                        };
                    }
                }
            }
            // If no valid tool call found yet, return the text delta
            return {
                type: "text-delta",
                textDelta: delta.content,
            };
        }
        // Handle tool calls in streaming
        if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
            const toolCallDeltas = delta.tool_calls;
            // Process each tool call delta
            for (const toolCallDelta of toolCallDeltas) {
                if (!toolCallDelta || typeof toolCallDelta !== "object") {
                    continue;
                }
                const toolCallId = toolCallDelta.id;
                const functionDelta = toolCallDelta.function;
                // Generate a stable ID if not provided using provider-utils
                const stableId = toolCallId || generateId();
                // Handle tool call start (when we get an ID and function name)
                if (functionDelta?.name) {
                    const toolName = functionDelta.name;
                    const initialArgs = functionDelta.arguments || "";
                    // Initialize or update the tool call in our tracking
                    this.streamingToolCalls.set(stableId, {
                        id: stableId,
                        name: toolName,
                        argsBuffer: initialArgs,
                    });
                    // If we have complete arguments already, try to parse and return complete tool call
                    if (initialArgs && this.isValidJson(initialArgs)) {
                        const parsedArgs = safeParseJSON({ text: initialArgs });
                        if (parsedArgs.success) {
                            // Clean up tracking since we have complete args
                            this.streamingToolCalls.delete(stableId);
                            return {
                                type: "tool-call",
                                toolCallType: "function",
                                toolCallId: stableId,
                                toolName: toolName,
                                args: initialArgs,
                            };
                        }
                    }
                    // Return a tool call delta for streaming start
                    return {
                        type: "tool-call-delta",
                        toolCallType: "function",
                        toolCallId: stableId,
                        toolName: toolName,
                        argsTextDelta: initialArgs,
                    };
                }
                // Handle tool call argument deltas
                if (functionDelta?.arguments &&
                    typeof functionDelta.arguments === "string") {
                    const argsDelta = functionDelta.arguments;
                    const existingCall = this.streamingToolCalls.get(stableId);
                    if (existingCall) {
                        // Append to existing args buffer
                        existingCall.argsBuffer += argsDelta;
                        // Check if we now have complete JSON
                        if (this.isValidJson(existingCall.argsBuffer)) {
                            const parsedArgs = safeParseJSON({
                                text: existingCall.argsBuffer,
                            });
                            if (parsedArgs.success) {
                                // Return complete tool call
                                const result = {
                                    type: "tool-call",
                                    toolCallType: "function",
                                    toolCallId: stableId,
                                    toolName: existingCall.name,
                                    args: existingCall.argsBuffer, // Keep as JSON string for AI SDK
                                };
                                // Clean up the tracking for this tool call
                                this.streamingToolCalls.delete(stableId);
                                return result;
                            }
                        }
                    }
                    // Return delta
                    return {
                        type: "tool-call-delta",
                        toolCallType: "function",
                        toolCallId: stableId,
                        toolName: existingCall?.name || "",
                        argsTextDelta: argsDelta,
                    };
                }
            }
        }
        // Handle finish reason in delta
        const finishReason = choice.finish_reason;
        if (finishReason) {
            // Extract usage from the chunk if available
            const usage = chunk.usage || {};
            const promptTokens = usage.prompt_tokens || 0;
            const completionTokens = usage.completion_tokens || 0;
            // Normalize finish reason - map Heroku API finish reasons to AI SDK format
            let normalizedFinishReason = finishReason;
            const finishReasonStr = String(finishReason);
            if (finishReasonStr === "tool_calls" ||
                finishReasonStr === "function_call") {
                normalizedFinishReason = "tool-calls";
            }
            else if (finishReasonStr === "content_filter") {
                normalizedFinishReason =
                    "content-filter";
            }
            else if (finishReasonStr === "max_tokens") {
                normalizedFinishReason = "length";
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
                normalizedFinishReason = validFinishReasons.includes(finishReasonStr)
                    ? finishReasonStr
                    : "other";
            }
            return {
                type: "finish",
                finishReason: normalizedFinishReason,
                usage: {
                    promptTokens,
                    completionTokens,
                },
            };
        }
        return null;
    }
    /**
     * Helper method to check if a string is valid JSON using provider-utils
     * @private
     */
    isValidJson(str) {
        if (!str || str.trim() === "") {
            return false;
        }
        return isParsableJson(str);
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
            if (func?.arguments) {
                if (typeof func.arguments === "string") {
                    if (func.arguments.trim()) {
                        const parseResult = safeParseJSON({ text: func.arguments });
                        if (parseResult.success) {
                            args = parseResult.value;
                        }
                        else {
                            console.warn(`Tool call at index ${index}: Failed to parse function arguments as JSON:`, func.arguments, "Error:", getErrorMessage(parseResult.error));
                            args = {};
                        }
                    }
                }
                else if (typeof func.arguments === "object" &&
                    func.arguments !== null) {
                    args = func.arguments;
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
            });
        });
        return validToolCalls;
    }
}
//# sourceMappingURL=chat.js.map