import { LanguageModelV1, LanguageModelV1CallOptions, LanguageModelV1FunctionTool, LanguageModelV1ProviderDefinedTool, LanguageModelV1ToolChoice, LanguageModelV1FunctionToolCall, LanguageModelV1StreamPart, LanguageModelV1FinishReason } from "@ai-sdk/provider";
export type ToolInput = LanguageModelV1FunctionTool | LanguageModelV1ProviderDefinedTool;
export type ToolChoiceInput = LanguageModelV1ToolChoice;
export declare class HerokuChatLanguageModel implements LanguageModelV1 {
    private readonly model;
    private readonly apiKey;
    private readonly baseUrl;
    readonly specificationVersion: "v1";
    readonly provider: "heroku";
    readonly modelId: string;
    readonly defaultObjectGenerationMode: "json";
    constructor(model: string, apiKey: string, baseUrl: string);
    /**
     * Validate constructor parameters with detailed error messages
     */
    private validateConstructorParameters;
    doGenerate(options: LanguageModelV1CallOptions): Promise<{
        text: string;
        toolCalls: LanguageModelV1FunctionToolCall[] | undefined;
        finishReason: LanguageModelV1FinishReason;
        usage: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
        };
        rawCall: {
            rawPrompt: null;
            rawSettings: {};
        };
        rawResponse: {
            headers: Record<string, string>;
        };
    }>;
    doStream(options: LanguageModelV1CallOptions): Promise<{
        stream: import("stream/web").ReadableStream<LanguageModelV1StreamPart>;
        rawCall: {
            rawPrompt: unknown;
            rawSettings: Record<string, unknown>;
        };
        rawResponse: {
            headers: {};
        };
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