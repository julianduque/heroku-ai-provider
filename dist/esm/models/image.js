import { APICallError, } from "@ai-sdk/provider";
import { makeHerokuRequest } from "../utils/api-client.js";
import { createValidationError } from "../utils/error-handling.js";
/**
 * Heroku image generation model implementation compatible with AI SDK v5.
 *
 * This model integrates the Heroku Inference Image Generation API with the
 * Vercel AI SDK. It currently supports the `stable-image-ultra` model.
 *
 * @remarks
 * - Images are returned in base64 by default.
 * - Custom aspect ratios and deterministic seeds are not yet supported.
 * - Additional provider options can be supplied under the `heroku` key.
 *
 * ```typescript
 * import { generateImage } from "ai";
 * import { heroku } from "heroku-ai-provider";
 *
 * const { images } = await generateImage({
 *   model: heroku.image("stable-image-ultra"),
 *   prompt: "A watercolor painting of a lighthouse at dusk"
 * });
 *
 * console.log(images[0]); // base64 encoded PNG
 * ```
 */
export class HerokuImageModel {
    constructor(model, apiKey, baseUrl) {
        this.model = model;
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.specificationVersion = "v2";
        this.provider = "heroku";
        this.maxImagesPerCall = 10;
        this.validateConstructorParameters(model, apiKey, baseUrl);
        this.modelId = model;
    }
    validateConstructorParameters(model, apiKey, baseUrl) {
        if (!model || typeof model !== "string" || model.trim().length === 0) {
            throw createValidationError("model must be a non-empty string", "model", model);
        }
        if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
            throw createValidationError("apiKey must be a non-empty string", "apiKey", "[REDACTED]");
        }
        if (!baseUrl ||
            typeof baseUrl !== "string" ||
            baseUrl.trim().length === 0) {
            throw createValidationError("baseUrl must be a non-empty string", "baseUrl", baseUrl);
        }
        try {
            const parsed = new URL(baseUrl);
            if (!["http:", "https:"].includes(parsed.protocol)) {
                throw createValidationError("baseUrl must use HTTP or HTTPS protocol", "baseUrl", baseUrl);
            }
        }
        catch (error) {
            if (error instanceof Error && error.name === "TypeError") {
                throw createValidationError(`baseUrl is not a valid URL: ${error.message}`, "baseUrl", baseUrl);
            }
            throw error;
        }
    }
    async doGenerate(options) {
        if (options.abortSignal?.aborted) {
            throw new APICallError({
                message: "Image generation request was aborted before it started",
                url: this.baseUrl,
                requestBodyValues: {},
                statusCode: 499,
            });
        }
        const warnings = [];
        if (options.aspectRatio) {
            warnings.push({
                type: "unsupported-setting",
                setting: "aspectRatio",
                details: "Heroku image generation currently does not support custom aspect ratios. Request will continue using provider defaults.",
            });
        }
        if (options.seed !== undefined) {
            warnings.push({
                type: "unsupported-setting",
                setting: "seed",
                details: "Heroku image generation currently does not support deterministic seeds.",
            });
        }
        if (!options.prompt || options.prompt.trim().length === 0) {
            throw createValidationError("prompt must be a non-empty string", "prompt", options.prompt);
        }
        if (!Number.isInteger(options.n) || options.n <= 0) {
            throw createValidationError("n must be a positive integer", "n", options.n);
        }
        if (options.n > this.maxImagesPerCall) {
            throw new APICallError({
                message: `Requested number of images (${options.n}) exceeds the maximum of ${this.maxImagesPerCall}`,
                url: this.baseUrl,
                requestBodyValues: { n: options.n },
                statusCode: 400,
            });
        }
        if (options.size) {
            const sizePattern = /^\d+x\d+$/;
            if (!sizePattern.test(options.size)) {
                throw createValidationError("size must be in the format {width}x{height}", "size", options.size);
            }
        }
        const baseRequest = {
            model: this.model,
            prompt: options.prompt,
            response_format: "b64_json",
        };
        if (options.n !== 1) {
            baseRequest.n = options.n;
        }
        if (options.size) {
            baseRequest.size = options.size;
        }
        const providerSpecific = options.providerOptions?.heroku &&
            typeof options.providerOptions.heroku === "object"
            ? options.providerOptions.heroku
            : undefined;
        const requestBody = providerSpecific
            ? { ...baseRequest, ...providerSpecific }
            : baseRequest;
        const headers = options.headers
            ? Object.fromEntries(Object.entries(options.headers).filter(([, value]) => value !== undefined))
            : undefined;
        const response = (await makeHerokuRequest(this.baseUrl, this.apiKey, requestBody, {
            maxRetries: 2,
            timeout: 60000,
            headers,
        }));
        return this.handleResponse(response, warnings);
    }
    handleResponse(response, warnings) {
        if (!response || !Array.isArray(response.data)) {
            throw new APICallError({
                message: "Invalid response format: missing data array",
                url: this.baseUrl,
                requestBodyValues: {},
                statusCode: 502,
                responseBody: JSON.stringify(response),
            });
        }
        const images = response.data.map((item, index) => {
            if (typeof item.b64_json === "string") {
                return item.b64_json;
            }
            if (typeof item.url === "string") {
                warnings.push({
                    type: "other",
                    message: `Image ${index} returned as URL instead of base64. Returning URL value.`,
                });
                return item.url;
            }
            throw new APICallError({
                message: `Image at index ${index} did not include base64 data or URL`,
                url: this.baseUrl,
                requestBodyValues: {},
                statusCode: 502,
                responseBody: JSON.stringify(item),
            });
        });
        const metadata = {
            heroku: {
                images: response.data.map((item) => {
                    const meta = {};
                    if (typeof item.revised_prompt === "string") {
                        meta.revised_prompt = item.revised_prompt;
                    }
                    if (typeof item.url === "string") {
                        meta.url = item.url;
                    }
                    return meta;
                }),
                model: response.model ?? this.model,
                created: response.created ?? Date.now(),
            },
        };
        const timestamp = typeof response.created === "number"
            ? new Date(response.created * 1000)
            : new Date();
        return {
            images,
            warnings,
            providerMetadata: metadata,
            response: {
                timestamp,
                modelId: this.model,
                headers: undefined,
            },
        };
    }
}
//# sourceMappingURL=image.js.map