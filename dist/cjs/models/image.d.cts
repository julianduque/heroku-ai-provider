import { ImageModelV2, ImageModelV2CallWarning, ImageModelV2ProviderMetadata, SharedV2ProviderOptions } from "@ai-sdk/provider";
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
export declare class HerokuImageModel implements ImageModelV2 {
    private readonly model;
    private readonly apiKey;
    private readonly baseUrl;
    readonly specificationVersion: "v2";
    readonly provider: "heroku";
    readonly modelId: string;
    readonly maxImagesPerCall = 10;
    constructor(model: string, apiKey: string, baseUrl: string);
    private validateConstructorParameters;
    doGenerate(options: {
        prompt: string;
        n: number;
        size: `${number}x${number}` | undefined;
        aspectRatio: `${number}:${number}` | undefined;
        seed: number | undefined;
        providerOptions: SharedV2ProviderOptions;
        abortSignal?: AbortSignal;
        headers?: Record<string, string | undefined>;
    }): Promise<{
        images: Array<string>;
        warnings: Array<ImageModelV2CallWarning>;
        providerMetadata?: ImageModelV2ProviderMetadata;
        response: {
            timestamp: Date;
            modelId: string;
            headers: Record<string, string> | undefined;
        };
    }>;
    private handleResponse;
}
//# sourceMappingURL=image.d.ts.map