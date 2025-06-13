import { HerokuChatLanguageModel } from "./models/chat.js";
import { HerokuEmbeddingModel } from "./models/embedding.js";
export interface HerokuProviderSettings {
    chatApiKey?: string;
    embeddingsApiKey?: string;
    chatBaseUrl?: string;
    embeddingsBaseUrl?: string;
}
export declare function createHerokuProvider(settings?: HerokuProviderSettings): {
    chat: (model: string) => HerokuChatLanguageModel;
    embedding: (model: string) => HerokuEmbeddingModel;
};
export { HerokuChatLanguageModel } from "./models/chat.js";
export { HerokuEmbeddingModel, createEmbedFunction, } from "./models/embedding.js";
export type { EmbeddingOptions } from "./models/embedding.js";
export { createUserFriendlyError, formatUserFriendlyError, createSimpleErrorMessage, createDetailedErrorReport, isConfigurationError, isTemporaryServiceError, getContextualHelp, type UserFriendlyError, } from "./utils/user-friendly-errors.js";
export { HerokuErrorType, ErrorSeverity, ErrorCategory, type HerokuErrorResponse, type ErrorMetadata, } from "./utils/error-types.js";
//# sourceMappingURL=index.d.ts.map