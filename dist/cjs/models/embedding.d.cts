export interface EmbeddingOptions {
    inputType?: "search_document" | "search_query" | "classification" | "clustering";
    embeddingType?: "float" | "int8";
    truncate?: "NONE" | "START" | "END";
}
export declare class HerokuEmbeddingModel {
    private readonly model;
    private readonly apiKey;
    private readonly baseUrl;
    readonly specificationVersion: "v1";
    readonly provider: "heroku";
    readonly modelId: string;
    readonly maxEmbeddingsPerCall = 100;
    readonly supportsParallelCalls = true;
    constructor(model: string, apiKey: string, baseUrl: string);
    /**
     * Validate constructor parameters with detailed error messages
     */
    private validateConstructorParameters;
    doEmbed(input: string | string[], options?: EmbeddingOptions): Promise<{
        embeddings: number[][];
        rawResponse?: {
            model: string;
            usage: unknown;
        };
    }>;
    embedSingle(text: string, options?: EmbeddingOptions): Promise<{
        embedding: number[];
    }>;
    embedBatch(texts: string[], options?: EmbeddingOptions, chunkSize?: number): Promise<{
        embeddings: number[][];
    }>;
}
export declare function createEmbedFunction(model: HerokuEmbeddingModel): (input: string | string[], options?: EmbeddingOptions) => Promise<{
    embedding: number[];
    usage: unknown;
    embeddings?: undefined;
} | {
    embeddings: number[][];
    usage: unknown;
    embedding?: undefined;
}>;
//# sourceMappingURL=embedding.d.ts.map