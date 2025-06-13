"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HerokuEmbeddingModel = void 0;
exports.createEmbedFunction = createEmbedFunction;
const provider_1 = require("@ai-sdk/provider");
const api_client_js_1 = require('../utils/api-client.cjs');
const error_handling_js_1 = require('../utils/error-handling.cjs');
class HerokuEmbeddingModel {
    constructor(model, apiKey, baseUrl) {
        this.model = model;
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.specificationVersion = "v1";
        this.provider = "heroku";
        this.maxEmbeddingsPerCall = 100; // Reasonable default limit
        this.supportsParallelCalls = true;
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
            throw (0, error_handling_js_1.createValidationError)("Model must be a non-empty string", "model", model);
        }
        if (model.trim().length === 0) {
            throw (0, error_handling_js_1.createValidationError)("Model cannot be empty or contain only whitespace", "model", model);
        }
        // Validate API key parameter
        if (!apiKey || typeof apiKey !== "string") {
            throw (0, error_handling_js_1.createValidationError)("API key must be a non-empty string", "apiKey", "[REDACTED]");
        }
        if (apiKey.trim().length === 0) {
            throw (0, error_handling_js_1.createValidationError)("API key cannot be empty or contain only whitespace", "apiKey", "[REDACTED]");
        }
        // Basic API key format validation
        if (apiKey.length < 10) {
            throw (0, error_handling_js_1.createValidationError)("API key appears to be too short to be valid", "apiKey", "[REDACTED]");
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
        // Validate against Heroku's supported embedding models
        const supportedHerokuEmbeddingModels = ["cohere-embed-multilingual"];
        if (!supportedHerokuEmbeddingModels.includes(model)) {
            console.warn(`Model '${model}' is not in the list of known Heroku-supported embedding models: ${supportedHerokuEmbeddingModels.join(", ")}. This may cause API errors.`);
        }
        // Validate base URL points to an embedding endpoint
        if (!baseUrl.includes("/embed") &&
            !baseUrl.includes("/v1") &&
            !baseUrl.includes("/vector")) {
            console.warn(`Base URL '${baseUrl}' doesn't appear to be an embeddings endpoint. This may cause API errors.`);
        }
    }
    async doEmbed(input, options = {}) {
        // Normalize input to array format
        const inputArray = Array.isArray(input) ? input : [input];
        // Validate input
        if (inputArray.length === 0) {
            throw new provider_1.APICallError({
                message: "Input cannot be empty",
                url: this.baseUrl,
                requestBodyValues: { input },
                statusCode: 400,
                responseBody: "",
            });
        }
        // Check for empty strings
        const hasEmptyStrings = inputArray.some((text) => !text || text.trim().length === 0);
        if (hasEmptyStrings) {
            throw new provider_1.APICallError({
                message: "Input cannot contain empty strings",
                url: this.baseUrl,
                requestBodyValues: { input: inputArray },
                statusCode: 400,
                responseBody: "",
            });
        }
        // Check batch size limit
        if (inputArray.length > this.maxEmbeddingsPerCall) {
            throw new provider_1.APICallError({
                message: `Batch size exceeds maximum limit of ${this.maxEmbeddingsPerCall}`,
                url: this.baseUrl,
                requestBodyValues: { input: inputArray },
                statusCode: 400,
                responseBody: "",
            });
        }
        // Build request body
        const body = {
            model: this.model,
            input: inputArray,
        };
        // Add optional parameters if provided
        if (options.inputType) {
            body.input_type = options.inputType;
        }
        if (options.embeddingType) {
            body.embedding_type = options.embeddingType;
        }
        if (options.truncate) {
            body.truncate = options.truncate;
        }
        try {
            // Make API request with enhanced error handling
            const response = (await (0, api_client_js_1.makeHerokuRequest)(this.baseUrl, this.apiKey, body, {
                maxRetries: 3,
                timeout: 30000,
            }));
            // Validate response structure
            if (!response.data || !Array.isArray(response.data)) {
                throw new provider_1.APICallError({
                    message: "Invalid response format: missing data array",
                    url: this.baseUrl,
                    requestBodyValues: body,
                    statusCode: 500,
                    responseBody: JSON.stringify(response),
                });
            }
            if (response.data.length !== inputArray.length) {
                throw new provider_1.APICallError({
                    message: `Response data length (${response.data.length}) does not match input length (${inputArray.length})`,
                    url: this.baseUrl,
                    requestBodyValues: body,
                    statusCode: 500,
                    responseBody: JSON.stringify(response),
                });
            }
            // Extract and validate embeddings
            const embeddings = [];
            for (let i = 0; i < response.data.length; i++) {
                const item = response.data[i];
                if (!item.embedding || !Array.isArray(item.embedding)) {
                    throw new provider_1.APICallError({
                        message: `Invalid embedding format at index ${i}`,
                        url: this.baseUrl,
                        requestBodyValues: body,
                        statusCode: 500,
                        responseBody: JSON.stringify(response),
                    });
                }
                if (item.embedding.length === 0) {
                    throw new provider_1.APICallError({
                        message: `Empty embedding vector at index ${i}`,
                        url: this.baseUrl,
                        requestBodyValues: body,
                        statusCode: 500,
                        responseBody: JSON.stringify(response),
                    });
                }
                // Validate that all values are numbers
                const hasInvalidValues = item.embedding.some((val) => typeof val !== "number" || !isFinite(val));
                if (hasInvalidValues) {
                    throw new provider_1.APICallError({
                        message: `Invalid embedding values at index ${i}: contains non-numeric or infinite values`,
                        url: this.baseUrl,
                        requestBodyValues: body,
                        statusCode: 500,
                        responseBody: JSON.stringify(response),
                    });
                }
                embeddings.push(item.embedding);
            }
            return {
                embeddings,
                // Include additional metadata for debugging/monitoring
                rawResponse: {
                    model: response.model,
                    usage: response.usage,
                },
            };
        }
        catch (error) {
            // Re-throw APICallErrors as-is
            if (error instanceof provider_1.APICallError) {
                throw error;
            }
            // Wrap other errors in APICallError
            throw new provider_1.APICallError({
                message: "Failed to generate embeddings",
                url: this.baseUrl,
                requestBodyValues: body,
                statusCode: 500,
                responseBody: "",
                cause: error,
            });
        }
    }
    // Helper method for single embedding (convenience method)
    async embedSingle(text, options = {}) {
        const result = await this.doEmbed(text, options);
        return {
            embedding: result.embeddings[0],
        };
    }
    // Helper method for batch processing with automatic chunking
    async embedBatch(texts, options = {}, chunkSize = this.maxEmbeddingsPerCall) {
        if (texts.length <= chunkSize) {
            return this.doEmbed(texts, options);
        }
        // Process in chunks
        const allEmbeddings = [];
        for (let i = 0; i < texts.length; i += chunkSize) {
            const chunk = texts.slice(i, i + chunkSize);
            const result = await this.doEmbed(chunk, options);
            allEmbeddings.push(...result.embeddings);
        }
        return { embeddings: allEmbeddings };
    }
}
exports.HerokuEmbeddingModel = HerokuEmbeddingModel;
// Helper function to integrate with AI SDK's embed function
function createEmbedFunction(model) {
    return async function embed(input, options) {
        const result = await model.doEmbed(input, options);
        // Return format compatible with AI SDK expectations
        if (typeof input === "string") {
            return {
                embedding: result.embeddings[0],
                usage: result.rawResponse
                    ?.usage,
            };
        }
        else {
            return {
                embeddings: result.embeddings,
                usage: result.rawResponse
                    ?.usage,
            };
        }
    };
}
//# sourceMappingURL=embedding.js.map