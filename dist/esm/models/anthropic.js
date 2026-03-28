import { APICallError, } from "@ai-sdk/provider";
import { loadApiKey, withoutTrailingSlash, getErrorMessage, generateId, } from "@ai-sdk/provider-utils";
import { makeHerokuRequest, processAnthropicStream, } from "../utils/api-client.js";
import { createValidationError } from "../utils/error-handling.js";
import { SUPPORTED_ANTHROPIC_MODELS, getSupportedAnthropicModelsString, } from "../utils/supported-models.js";
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
export class HerokuAnthropicModel {
    /**
     * Constructor for the Heroku Anthropic Language Model.
     *
     * @param model - The Anthropic model identifier (e.g., "claude-4-sonnet")
     * @param apiKey - Your Heroku AI API key
     * @param baseUrl - The base URL for the Anthropic Messages API endpoint
     *
     * @throws {ValidationError} When parameters are invalid or missing
     */
    constructor(model, apiKey, baseUrl) {
        this.model = model;
        this.specificationVersion = "v2";
        this.provider = "heroku.anthropic";
        this.supportedUrls = {};
        // Streaming state
        this.streamingContentBlocks = new Map();
        this.streamingFinishReason = null;
        this.streamingUsage = null;
        this.streamingTextId = null;
        this.streamingTextClosed = false;
        this.currentStructuredOutputToolName = null;
        this.streamingMessageId = null;
        this.apiKey = loadApiKey({
            apiKey,
            environmentVariableName: "INFERENCE_KEY",
            apiKeyParameterName: "apiKey",
            description: "Heroku AI API key for Anthropic Messages API",
        });
        this.baseUrl = withoutTrailingSlash(baseUrl) || baseUrl;
        this.validateConstructorParameters(model, this.apiKey, this.baseUrl);
        this.modelId = model;
    }
    /**
     * Reset streaming state between requests
     * @internal
     */
    resetStreamingState() {
        this.streamingContentBlocks.clear();
        this.streamingFinishReason = null;
        this.streamingUsage = null;
        this.streamingTextId = null;
        this.streamingTextClosed = false;
        this.currentStructuredOutputToolName = null;
        this.streamingMessageId = null;
    }
    /**
     * Validate constructor parameters
     * @internal
     */
    validateConstructorParameters(model, apiKey, baseUrl) {
        if (!model || typeof model !== "string") {
            throw createValidationError("Model must be a non-empty string", "model", model);
        }
        if (model.trim().length === 0) {
            throw createValidationError("Model cannot be empty or contain only whitespace", "model", model);
        }
        if (!baseUrl || typeof baseUrl !== "string") {
            throw createValidationError("Base URL must be a non-empty string", "baseUrl", baseUrl);
        }
        if (baseUrl.trim().length === 0) {
            throw createValidationError("Base URL cannot be empty or contain only whitespace", "baseUrl", baseUrl);
        }
        try {
            const url = new URL(baseUrl);
            if (!["http:", "https:"].includes(url.protocol)) {
                throw createValidationError("Base URL must use HTTP or HTTPS protocol", "baseUrl", baseUrl);
            }
            if (!url.hostname || url.hostname.length === 0) {
                throw createValidationError("Base URL must have a valid hostname", "baseUrl", baseUrl);
            }
        }
        catch (urlError) {
            if (urlError instanceof Error && urlError.name === "TypeError") {
                throw createValidationError(`Base URL is not a valid URL format: ${urlError.message}`, "baseUrl", baseUrl);
            }
            throw urlError;
        }
        if (!SUPPORTED_ANTHROPIC_MODELS.includes(model)) {
            throw createValidationError(`Unsupported Anthropic model '${model}'. Supported models: ${getSupportedAnthropicModelsString()}`, "model", model);
        }
    }
    /**
     * Generate a completion using the Anthropic Messages API.
     */
    async doGenerate(options) {
        if (!options || !options.prompt) {
            throw new APICallError({
                message: "Missing required prompt in options",
                url: this.baseUrl,
                requestBodyValues: { options },
            });
        }
        const warnings = this.collectCallWarnings(options);
        try {
            const structuredOutput = this.prepareStructuredOutputConfig(options.responseFormat);
            const { system, messages } = this.mapPromptToAnthropicFormat(options.prompt, options.providerOptions?.anthropic);
            const maxTokens = options.maxOutputTokens ?? 4096;
            const requestBody = {
                model: this.model,
                messages,
                max_tokens: maxTokens,
                stream: false,
            };
            // Combine existing system with structured output instruction if needed
            if (structuredOutput?.systemInstruction) {
                if (system) {
                    // Prepend structured output instruction to existing system
                    if (typeof system === "string") {
                        requestBody.system = `${structuredOutput.systemInstruction}\n\n${system}`;
                    }
                    else {
                        // system is an array of text blocks
                        requestBody.system = [
                            { type: "text", text: structuredOutput.systemInstruction },
                            ...system,
                        ];
                    }
                }
                else {
                    requestBody.system = structuredOutput.systemInstruction;
                }
            }
            else if (system) {
                requestBody.system = system;
            }
            if (options.temperature !== undefined) {
                requestBody.temperature = options.temperature;
            }
            if (options.topP !== undefined) {
                requestBody.top_p = options.topP;
            }
            if (options.topK !== undefined) {
                requestBody.top_k = options.topK;
            }
            if (options.stopSequences) {
                requestBody.stop_sequences = options.stopSequences;
            }
            // Handle extended thinking
            const anthropicOptions = options.providerOptions?.anthropic;
            if (anthropicOptions?.thinking?.type === "enabled") {
                requestBody.thinking = {
                    type: "enabled",
                    budget_tokens: anthropicOptions.thinking.budgetTokens,
                };
            }
            if (anthropicOptions?.metadata?.userId) {
                requestBody.metadata = { user_id: anthropicOptions.metadata.userId };
            }
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
            if (combinedTools && combinedTools.length > 0) {
                requestBody.tools = this.mapToolsToAnthropicFormat(combinedTools, anthropicOptions?.cacheControl?.tools);
                if (effectiveToolChoice) {
                    requestBody.tool_choice =
                        this.mapToolChoiceToAnthropicFormat(effectiveToolChoice);
                }
            }
            const requestHeaders = this.normalizeHeaders(options.headers);
            const response = await makeHerokuRequest(this.baseUrl, this.apiKey, requestBody, {
                maxRetries: 3,
                timeout: 60000,
                headers: {
                    ...requestHeaders,
                    "anthropic-version": "2023-06-01",
                },
                authMode: "x-api-key",
            });
            return this.mapResponseToOutput(response, requestBody, warnings, structuredOutputContext);
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
     * Generate a streaming completion using the Anthropic Messages API.
     */
    async doStream(options) {
        if (!options || !options.prompt) {
            throw new APICallError({
                message: "Missing required prompt in options",
                url: this.baseUrl,
                requestBodyValues: { options },
            });
        }
        const warnings = this.collectCallWarnings(options);
        try {
            const structuredOutput = this.prepareStructuredOutputConfig(options.responseFormat);
            const { system, messages } = this.mapPromptToAnthropicFormat(options.prompt, options.providerOptions?.anthropic);
            this.resetStreamingState();
            if (structuredOutput) {
                this.currentStructuredOutputToolName = structuredOutput.toolName;
            }
            const maxTokens = options.maxOutputTokens ?? 4096;
            const requestBody = {
                model: this.model,
                messages,
                max_tokens: maxTokens,
                stream: true,
            };
            // Combine existing system with structured output instruction if needed
            if (structuredOutput?.systemInstruction) {
                if (system) {
                    if (typeof system === "string") {
                        requestBody.system = `${structuredOutput.systemInstruction}\n\n${system}`;
                    }
                    else {
                        requestBody.system = [
                            { type: "text", text: structuredOutput.systemInstruction },
                            ...system,
                        ];
                    }
                }
                else {
                    requestBody.system = structuredOutput.systemInstruction;
                }
            }
            else if (system) {
                requestBody.system = system;
            }
            if (options.temperature !== undefined) {
                requestBody.temperature = options.temperature;
            }
            if (options.topP !== undefined) {
                requestBody.top_p = options.topP;
            }
            if (options.topK !== undefined) {
                requestBody.top_k = options.topK;
            }
            if (options.stopSequences) {
                requestBody.stop_sequences = options.stopSequences;
            }
            const anthropicOptions = options.providerOptions?.anthropic;
            if (anthropicOptions?.thinking?.type === "enabled") {
                requestBody.thinking = {
                    type: "enabled",
                    budget_tokens: anthropicOptions.thinking.budgetTokens,
                };
            }
            if (anthropicOptions?.metadata?.userId) {
                requestBody.metadata = { user_id: anthropicOptions.metadata.userId };
            }
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
            if (combinedTools && combinedTools.length > 0) {
                requestBody.tools = this.mapToolsToAnthropicFormat(combinedTools, anthropicOptions?.cacheControl?.tools);
                if (effectiveToolChoice) {
                    requestBody.tool_choice =
                        this.mapToolChoiceToAnthropicFormat(effectiveToolChoice);
                }
            }
            const response = await makeHerokuRequest(this.baseUrl, this.apiKey, requestBody, {
                maxRetries: 3,
                timeout: 60000,
                stream: true,
                headers: {
                    ...this.normalizeHeaders(options.headers),
                    "anthropic-version": "2023-06-01",
                },
                authMode: "x-api-key",
            });
            const rawStream = processAnthropicStream(response, this.baseUrl);
            const transformedStream = rawStream.pipeThrough(new TransformStream({
                transform: async (event, controller) => {
                    try {
                        const parts = await this.mapStreamEventToStreamParts(event);
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
                            if (done)
                                break;
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
    /**
     * Map AI SDK prompt to Anthropic format with separate system message
     * @internal
     */
    mapPromptToAnthropicFormat(prompt, anthropicOptions) {
        const messages = [];
        let systemContent;
        const promptMessages = typeof prompt === "string"
            ? [{ role: "user", content: prompt }]
            : [...prompt];
        // Extract system message
        const systemMessageIndex = promptMessages.findIndex((m) => m.role === "system");
        if (systemMessageIndex !== -1) {
            const systemMessage = promptMessages.splice(systemMessageIndex, 1)[0];
            if (typeof systemMessage.content === "string") {
                if (anthropicOptions?.cacheControl?.systemPrompt) {
                    systemContent = [
                        {
                            type: "text",
                            text: systemMessage.content,
                            cache_control: { type: "ephemeral" },
                        },
                    ];
                }
                else {
                    systemContent = systemMessage.content;
                }
            }
        }
        // Process remaining messages
        for (const item of promptMessages) {
            if (!item || typeof item !== "object" || !("role" in item)) {
                continue;
            }
            const messageItem = item;
            const role = messageItem.role;
            if (role === "user") {
                const content = this.convertUserContent(messageItem.content);
                if (content) {
                    messages.push({ role: "user", content });
                }
            }
            else if (role === "assistant") {
                const content = this.convertAssistantContent(messageItem.content);
                if (content) {
                    messages.push({ role: "assistant", content });
                }
            }
            else if (role === "tool") {
                // Tool results go as user messages in Anthropic format
                const toolResultBlocks = this.convertToolResults(messageItem.content);
                if (toolResultBlocks.length > 0) {
                    // If last message is user, append to it; otherwise create new user message
                    const lastMessage = messages[messages.length - 1];
                    if (lastMessage && lastMessage.role === "user") {
                        if (typeof lastMessage.content === "string") {
                            lastMessage.content = [
                                { type: "text", text: lastMessage.content },
                                ...toolResultBlocks,
                            ];
                        }
                        else {
                            lastMessage.content = [...lastMessage.content, ...toolResultBlocks];
                        }
                    }
                    else {
                        messages.push({ role: "user", content: toolResultBlocks });
                    }
                }
            }
        }
        return { system: systemContent, messages };
    }
    /**
     * Convert user content to Anthropic format
     * @internal
     */
    convertUserContent(content) {
        if (typeof content === "string") {
            return content;
        }
        if (Array.isArray(content)) {
            const blocks = [];
            for (const part of content) {
                if (!part || typeof part !== "object" || !("type" in part)) {
                    continue;
                }
                if (part.type === "text" && "text" in part) {
                    blocks.push({
                        type: "text",
                        text: String(part.text),
                    });
                }
                else if (part.type === "image" && "image" in part) {
                    const imageData = part.image;
                    if (imageData.type === "base64" && imageData.data) {
                        blocks.push({
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: imageData.mimeType || "image/png",
                                data: imageData.data,
                            },
                        });
                    }
                }
            }
            return blocks.length > 0 ? blocks : null;
        }
        return null;
    }
    /**
     * Convert assistant content to Anthropic format
     * @internal
     */
    convertAssistantContent(content) {
        if (typeof content === "string") {
            return content;
        }
        if (Array.isArray(content)) {
            const blocks = [];
            for (const part of content) {
                if (!part || typeof part !== "object" || !("type" in part)) {
                    continue;
                }
                if (part.type === "text" && "text" in part) {
                    blocks.push({
                        type: "text",
                        text: String(part.text),
                    });
                }
                else if (part.type === "tool-call") {
                    const toolCall = part;
                    const toolCallId = typeof toolCall.toolCallId === "string"
                        ? toolCall.toolCallId
                        : generateId();
                    const toolName = typeof toolCall.toolName === "string" ? toolCall.toolName : "";
                    if (!toolName)
                        continue;
                    const input = "input" in toolCall
                        ? toolCall.input
                        : toolCall.args;
                    let inputObj = {};
                    if (typeof input === "string") {
                        try {
                            inputObj = JSON.parse(input);
                        }
                        catch {
                            inputObj = {};
                        }
                    }
                    else if (typeof input === "object" && input !== null) {
                        inputObj = input;
                    }
                    blocks.push({
                        type: "tool_use",
                        id: toolCallId,
                        name: toolName,
                        input: inputObj,
                    });
                }
            }
            return blocks.length > 0 ? blocks : null;
        }
        return null;
    }
    /**
     * Convert tool results to Anthropic format
     * @internal
     */
    convertToolResults(content) {
        if (!Array.isArray(content)) {
            return [];
        }
        const blocks = [];
        for (const part of content) {
            if (!part ||
                typeof part !== "object" ||
                !("type" in part) ||
                part.type !== "tool-result") {
                continue;
            }
            const toolResult = part;
            let resultContent = "";
            let isError = false;
            if (toolResult.output) {
                const output = toolResult.output;
                if (output.type === "text") {
                    resultContent = String(output.value ?? "");
                }
                else if (output.type === "error-text") {
                    resultContent = String(output.value ?? "");
                    isError = true;
                }
                else if (output.type === "json") {
                    resultContent = JSON.stringify(output.value);
                }
                else if (output.type === "error-json") {
                    resultContent = JSON.stringify(output.value);
                    isError = true;
                }
            }
            else if ("result" in toolResult) {
                const result = toolResult.result;
                if (typeof result === "string") {
                    resultContent = result;
                }
                else if (typeof result === "object") {
                    resultContent = JSON.stringify(result);
                }
                else {
                    resultContent = String(result);
                }
            }
            blocks.push({
                type: "tool_result",
                tool_use_id: toolResult.toolCallId,
                content: resultContent,
                ...(isError && { is_error: true }),
            });
        }
        return blocks;
    }
    /**
     * Map tools to Anthropic format
     * @internal
     */
    mapToolsToAnthropicFormat(tools, enableCacheControl) {
        return tools.map((tool, index) => {
            let name = "";
            let description = "";
            let schema;
            if ("type" in tool && tool.type === "function" && "function" in tool) {
                const func = tool.function;
                name = func.name || "";
                description = func.description || "";
                schema = func.parameters || undefined;
            }
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
            if (!name || !description) {
                throw new APICallError({
                    message: `Tool at index ${index}: Tool must have name and description`,
                    url: "",
                    requestBodyValues: { [`tools[${index}]`]: tool },
                });
            }
            // Clean up schema
            const inputSchema = schema ? JSON.parse(JSON.stringify(schema)) : { type: "object" };
            if (inputSchema && typeof inputSchema === "object") {
                if ("$schema" in inputSchema) {
                    delete inputSchema.$schema;
                }
                if (!("type" in inputSchema)) {
                    inputSchema.type = "object";
                }
            }
            const anthropicTool = {
                name: name.trim(),
                description: description.trim(),
                input_schema: inputSchema,
            };
            // Add cache control to last tool if enabled
            if (enableCacheControl && index === tools.length - 1) {
                anthropicTool.cache_control = { type: "ephemeral" };
            }
            return anthropicTool;
        });
    }
    /**
     * Map tool choice to Anthropic format
     * @internal
     */
    mapToolChoiceToAnthropicFormat(toolChoice) {
        if (!toolChoice) {
            return { type: "auto" };
        }
        if (typeof toolChoice === "string") {
            if (toolChoice === "auto" || toolChoice === "none") {
                return { type: "auto" };
            }
            if (toolChoice === "required") {
                return { type: "any" };
            }
            return { type: "tool", name: toolChoice.trim() };
        }
        switch (toolChoice.type) {
            case "auto":
                return { type: "auto" };
            case "none":
                return { type: "auto" };
            case "required":
                return { type: "any" };
            case "tool": {
                const { toolName } = toolChoice;
                return { type: "tool", name: toolName.trim() };
            }
            default:
                return { type: "auto" };
        }
    }
    /**
     * Map Anthropic response to AI SDK output format
     * @internal
     */
    mapResponseToOutput(response, requestBody, warnings, structuredOutputContext) {
        const content = [];
        const toolCalls = [];
        let textContent = "";
        for (const block of response.content) {
            if (block.type === "text") {
                textContent += block.text;
            }
            else if (block.type === "tool_use") {
                toolCalls.push({
                    type: "tool-call",
                    toolCallId: block.id,
                    toolName: block.name,
                    input: JSON.stringify(block.input),
                });
            }
            else if (block.type === "thinking") {
                // Include thinking in reasoning tokens or as metadata
            }
        }
        // Handle structured output
        let responseText;
        if (structuredOutputContext && toolCalls.length > 0) {
            const matchingCall = toolCalls.find((call) => call.toolName === structuredOutputContext.expectedToolName);
            if (matchingCall) {
                responseText = matchingCall.input;
            }
        }
        if (responseText === undefined && textContent) {
            responseText = textContent;
        }
        if (responseText === undefined && toolCalls.length > 0) {
            // Fall back to first tool call input for structured output
            responseText = toolCalls[0].input;
        }
        if (responseText !== undefined) {
            content.push({ type: "text", text: responseText });
        }
        else {
            content.push({ type: "text", text: "" });
        }
        content.push(...toolCalls);
        const usage = {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            cachedInputTokens: (response.usage.cache_read_input_tokens ?? 0) +
                (response.usage.cache_creation_input_tokens ?? 0),
        };
        const finishReason = this.normalizeFinishReason(response.stop_reason);
        const responseMetadata = {
            id: response.id,
            modelId: response.model,
        };
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
    /**
     * Map Anthropic stream events to AI SDK stream parts
     * @internal
     */
    async mapStreamEventToStreamParts(event) {
        const parts = [];
        switch (event.type) {
            case "message_start": {
                const message = event.message;
                if (message?.id) {
                    this.streamingMessageId = message.id;
                }
                if (message?.usage) {
                    const usage = message.usage;
                    const inputTokens = typeof usage.input_tokens === "number"
                        ? usage.input_tokens
                        : 0;
                    this.streamingUsage = {
                        inputTokens,
                        outputTokens: 0,
                        totalTokens: inputTokens,
                    };
                }
                break;
            }
            case "content_block_start": {
                const index = event.index ?? 0;
                const contentBlock = event.content_block;
                if (contentBlock) {
                    const blockType = contentBlock.type;
                    this.streamingContentBlocks.set(index, {
                        type: blockType,
                        id: contentBlock.id,
                        name: contentBlock.name,
                        textBuffer: "",
                        inputBuffer: "",
                    });
                    if (blockType === "text") {
                        if (!this.streamingTextId) {
                            this.streamingTextId = generateId();
                            parts.push({ type: "text-start", id: this.streamingTextId });
                        }
                    }
                }
                break;
            }
            case "content_block_delta": {
                const index = event.index ?? 0;
                const delta = event.delta;
                const block = this.streamingContentBlocks.get(index);
                if (delta && block) {
                    const deltaType = delta.type;
                    if (deltaType === "text_delta" && delta.text) {
                        const text = delta.text;
                        block.textBuffer += text;
                        if (this.streamingTextId) {
                            parts.push({
                                type: "text-delta",
                                id: this.streamingTextId,
                                delta: text,
                            });
                        }
                    }
                    else if (deltaType === "input_json_delta" && delta.partial_json) {
                        block.inputBuffer += delta.partial_json;
                    }
                }
                break;
            }
            case "content_block_stop": {
                const index = event.index ?? 0;
                const block = this.streamingContentBlocks.get(index);
                if (block && block.type === "tool_use" && block.name) {
                    const input = block.inputBuffer || "{}";
                    // Check for structured output
                    if (this.currentStructuredOutputToolName &&
                        block.name === this.currentStructuredOutputToolName) {
                        // Close current text block and emit structured output
                        if (this.streamingTextId && !this.streamingTextClosed) {
                            parts.push({ type: "text-end", id: this.streamingTextId });
                            this.streamingTextClosed = true;
                        }
                        const streamId = generateId();
                        this.streamingTextId = streamId;
                        this.streamingTextClosed = false;
                        parts.push({ type: "text-start", id: streamId });
                        parts.push({ type: "text-delta", id: streamId, delta: input });
                        parts.push({ type: "text-end", id: streamId });
                        this.streamingTextClosed = true;
                    }
                    parts.push({
                        type: "tool-call",
                        toolCallId: block.id || generateId(),
                        toolName: block.name,
                        input,
                    });
                }
                break;
            }
            case "message_delta": {
                const delta = event.delta;
                const usage = event.usage;
                if (delta?.stop_reason) {
                    this.streamingFinishReason = this.normalizeFinishReason(delta.stop_reason);
                }
                if (usage?.output_tokens) {
                    const outputTokens = usage.output_tokens;
                    if (this.streamingUsage) {
                        this.streamingUsage.outputTokens = outputTokens;
                        const inputTokens = this.streamingUsage.inputTokens ?? 0;
                        this.streamingUsage.totalTokens = inputTokens + outputTokens;
                    }
                    else {
                        this.streamingUsage = {
                            inputTokens: 0,
                            outputTokens,
                            totalTokens: outputTokens,
                        };
                    }
                }
                break;
            }
            case "message_stop": {
                // Close any open text block
                if (this.streamingTextId && !this.streamingTextClosed) {
                    parts.push({ type: "text-end", id: this.streamingTextId });
                    this.streamingTextClosed = true;
                }
                // Emit finish
                if (this.streamingFinishReason && this.streamingUsage) {
                    parts.push({
                        type: "finish",
                        finishReason: this.streamingFinishReason,
                        usage: this.streamingUsage,
                    });
                }
                this.resetStreamingState();
                break;
            }
            case "error": {
                // Stream errors are handled by the caller through the error event
                // We don't log here as the error will be propagated through the stream
                break;
            }
        }
        return parts;
    }
    /**
     * Normalize Anthropic finish reason to AI SDK format
     * @internal
     */
    normalizeFinishReason(value) {
        const reason = typeof value === "string" ? value : "";
        switch (reason) {
            case "end_turn":
                return "stop";
            case "stop_sequence":
                return "stop";
            case "max_tokens":
                return "length";
            case "tool_use":
                return "tool-calls";
            default:
                return reason ? "other" : "unknown";
        }
    }
    /**
     * Collect warnings for unsupported options
     * @internal
     */
    collectCallWarnings(options) {
        const warnings = [];
        const addUnsupportedSetting = (setting, enabled, details) => {
            if (enabled) {
                warnings.push({ type: "unsupported-setting", setting, details });
            }
        };
        addUnsupportedSetting("presencePenalty", options.presencePenalty !== undefined, "Anthropic does not support presence penalty.");
        addUnsupportedSetting("frequencyPenalty", options.frequencyPenalty !== undefined, "Anthropic does not support frequency penalty.");
        addUnsupportedSetting("seed", options.seed !== undefined, "Anthropic does not support deterministic sampling with seed.");
        return warnings;
    }
    /**
     * Prepare structured output configuration
     * @internal
     */
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
    /**
     * Sanitize schema for structured output
     * @internal
     */
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
    /**
     * Normalize tool name for structured output
     * @internal
     */
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
    /**
     * Build system instruction for structured output
     * @internal
     */
    buildStructuredOutputInstruction(toolName, schema, description) {
        let schemaText;
        try {
            schemaText = JSON.stringify(schema, null, 2);
        }
        catch {
            schemaText = undefined;
        }
        const instructionParts = [
            `CRITICAL INSTRUCTION: You MUST respond ONLY by calling the tool/function named "${toolName}".`,
            "DO NOT write any text response. DO NOT include any explanation or narrative.",
            "Your ENTIRE response must be a single tool call to the specified function.",
            "Failure to use the tool will result in an error.",
        ];
        if (description && description.trim().length > 0) {
            instructionParts.push(`The data you provide should satisfy: ${description.trim()}`);
        }
        if (schemaText) {
            instructionParts.push(`The tool arguments must conform to this JSON schema:\n${schemaText}`);
        }
        instructionParts.push(`Remember: Your response must be ONLY a call to "${toolName}" with valid JSON arguments.`);
        return instructionParts.join("\n");
    }
    /**
     * Normalize headers
     * @internal
     */
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
}
//# sourceMappingURL=anthropic.js.map