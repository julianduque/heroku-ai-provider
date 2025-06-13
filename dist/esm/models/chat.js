import { APICallError, } from "@ai-sdk/provider";
import { makeHerokuRequest, processHerokuStream } from "../utils/api-client.js";
import { createValidationError } from "../utils/error-handling.js";
export class HerokuChatLanguageModel {
    constructor(model, apiKey, baseUrl) {
        this.model = model;
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.specificationVersion = "v1";
        this.provider = "heroku";
        this.defaultObjectGenerationMode = "json";
        // Comprehensive parameter validation
        this.validateConstructorParameters(model, apiKey, baseUrl);
        this.modelId = model;
    }
    /**
     * Validate constructor parameters with detailed error messages
     */
    validateConstructorParameters(model, apiKey, baseUrl) {
        // Validate model parameter
        if (!model || typeof model !== "string") {
            throw createValidationError("Model must be a non-empty string", "model", model);
        }
        if (model.trim().length === 0) {
            throw createValidationError("Model cannot be empty or contain only whitespace", "model", model);
        }
        // Validate API key parameter
        if (!apiKey || typeof apiKey !== "string") {
            throw createValidationError("API key must be a non-empty string", "apiKey", "[REDACTED]");
        }
        if (apiKey.trim().length === 0) {
            throw createValidationError("API key cannot be empty or contain only whitespace", "apiKey", "[REDACTED]");
        }
        // Basic API key format validation (should look like a token)
        if (apiKey.length < 10) {
            throw createValidationError("API key appears to be too short to be valid", "apiKey", "[REDACTED]");
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
            // Handle tools if provided
            if (options.mode?.type === "regular" && options.mode.tools) {
                // Validate tools is not empty array
                if (Array.isArray(options.mode.tools) &&
                    options.mode.tools.length === 0) {
                    throw new APICallError({
                        message: "Tools must be a non-empty array when provided",
                        url: "",
                        requestBodyValues: { tools: options.mode.tools },
                    });
                }
                requestBody.tools = this.mapToolsToHerokuFormat(options.mode.tools);
                if (options.mode.toolChoice) {
                    requestBody.tool_choice = this.mapToolChoiceToHerokuFormat(options.mode.toolChoice, options.mode.tools);
                }
            }
            else if (options.mode?.type === "regular" && options.mode.toolChoice) {
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
                message: `Failed to generate completion: ${error instanceof Error ? error.message : String(error)}`,
                url: this.baseUrl,
                requestBodyValues: {},
                cause: error,
            });
        }
    }
    async doStream(options) {
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
            // Handle tools if provided
            if (options.mode?.type === "regular" && options.mode.tools) {
                // Validate tools is not empty array
                if (Array.isArray(options.mode.tools) &&
                    options.mode.tools.length === 0) {
                    throw new APICallError({
                        message: "Tools must be a non-empty array when provided",
                        url: "",
                        requestBodyValues: { tools: options.mode.tools },
                    });
                }
                requestBody.tools = this.mapToolsToHerokuFormat(options.mode.tools);
                if (options.mode.toolChoice) {
                    requestBody.tool_choice = this.mapToolChoiceToHerokuFormat(options.mode.toolChoice, options.mode.tools);
                }
            }
            else if (options.mode?.type === "regular" && options.mode.toolChoice) {
                // Warn if tool choice is provided without tools
                console.warn("Tool choice provided without tools - ignoring tool choice");
            }
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
                    headers: {},
                },
            };
        }
        catch (error) {
            if (error instanceof APICallError) {
                throw error;
            }
            throw new APICallError({
                message: `Failed to stream completion: ${error instanceof Error ? error.message : String(error)}`,
                url: this.baseUrl,
                requestBodyValues: {},
                cause: error,
            });
        }
    }
    mapPromptToMessages(prompt) {
        const messages = [];
        // Handle string prompt (convert to user message)
        if (typeof prompt === "string") {
            messages.push({
                role: "user",
                content: prompt,
            });
            return messages;
        }
        // Handle array of messages
        if (Array.isArray(prompt)) {
            for (const item of prompt) {
                const convertedMessage = this.convertMessageToHerokuFormat(item);
                messages.push(convertedMessage);
            }
            return messages;
        }
        throw createValidationError("Prompt must be a string or array of messages", "prompt", prompt);
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
        const finishReason = choice.finish_reason || "stop";
        return {
            text,
            toolCalls: mappedToolCalls,
            finishReason,
            usage: {
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens,
            },
            rawCall: {
                rawPrompt: null,
                rawSettings: {},
            },
            rawResponse: {
                headers: response.headers || {},
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
            return null;
        }
        // Handle text delta
        if (delta.content && typeof delta.content === "string") {
            return {
                type: "text-delta",
                textDelta: delta.content,
            };
        }
        // Handle tool calls (simplified for now)
        if (delta.tool_calls) {
            // Return a simple finish part for tool calls
            return {
                type: "finish",
                finishReason: "tool-calls",
                usage: {
                    promptTokens: 0,
                    completionTokens: 0,
                },
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
            if (func?.arguments) {
                try {
                    if (typeof func.arguments === "string") {
                        args = func.arguments.trim() ? JSON.parse(func.arguments) : {};
                    }
                    else if (typeof func.arguments === "object" &&
                        func.arguments !== null) {
                        args = func.arguments;
                    }
                }
                catch (error) {
                    console.warn(`Tool call at index ${index}: Failed to parse function arguments as JSON:`, func.arguments, "Error:", error instanceof Error ? error.message : String(error));
                    args = {};
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