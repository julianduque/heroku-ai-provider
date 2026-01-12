import {
  SUPPORTED_CHAT_MODELS,
  SUPPORTED_EMBEDDING_MODELS,
  SUPPORTED_IMAGE_MODELS,
  SUPPORTED_RERANKING_MODELS,
  isSupportedChatModel,
  isSupportedEmbeddingModel,
  isSupportedImageModel,
  isSupportedRerankingModel,
  getSupportedChatModelsString,
  getSupportedEmbeddingModelsString,
  getSupportedImageModelsString,
  getSupportedRerankingModelsString,
  fetchAvailableModels,
  getSupportedChatModels,
  getSupportedEmbeddingModels,
  getSupportedImageModels,
  getSupportedRerankingModels,
  clearModelCache,
} from "../../src/utils/supported-models";

describe("Supported Models Module", () => {
  beforeEach(() => {
    clearModelCache();
  });

  describe("SUPPORTED_CHAT_MODELS", () => {
    it("should be a non-empty frozen array", () => {
      expect(Array.isArray(SUPPORTED_CHAT_MODELS)).toBe(true);
      expect(SUPPORTED_CHAT_MODELS.length).toBeGreaterThan(0);
      expect(Object.isFrozen(SUPPORTED_CHAT_MODELS)).toBe(true);
    });

    it("should contain known chat models", () => {
      expect(SUPPORTED_CHAT_MODELS).toContain("claude-4-sonnet");
      expect(SUPPORTED_CHAT_MODELS).toContain("claude-4-5-sonnet");
      expect(SUPPORTED_CHAT_MODELS).toContain("claude-3-7-sonnet");
      expect(SUPPORTED_CHAT_MODELS).toContain("gpt-oss-120b");
      expect(SUPPORTED_CHAT_MODELS).toContain("nova-lite");
      expect(SUPPORTED_CHAT_MODELS).toContain("nova-pro");
    });

    it("should not contain embedding or image models", () => {
      expect(SUPPORTED_CHAT_MODELS).not.toContain("cohere-embed-multilingual");
      expect(SUPPORTED_CHAT_MODELS).not.toContain("stable-image-ultra");
    });
  });

  describe("SUPPORTED_EMBEDDING_MODELS", () => {
    it("should be a non-empty frozen array", () => {
      expect(Array.isArray(SUPPORTED_EMBEDDING_MODELS)).toBe(true);
      expect(SUPPORTED_EMBEDDING_MODELS.length).toBeGreaterThan(0);
      expect(Object.isFrozen(SUPPORTED_EMBEDDING_MODELS)).toBe(true);
    });

    it("should contain cohere-embed-multilingual", () => {
      expect(SUPPORTED_EMBEDDING_MODELS).toContain("cohere-embed-multilingual");
    });
  });

  describe("SUPPORTED_IMAGE_MODELS", () => {
    it("should be a non-empty frozen array", () => {
      expect(Array.isArray(SUPPORTED_IMAGE_MODELS)).toBe(true);
      expect(SUPPORTED_IMAGE_MODELS.length).toBeGreaterThan(0);
      expect(Object.isFrozen(SUPPORTED_IMAGE_MODELS)).toBe(true);
    });

    it("should contain stable-image-ultra", () => {
      expect(SUPPORTED_IMAGE_MODELS).toContain("stable-image-ultra");
    });
  });

  describe("SUPPORTED_RERANKING_MODELS", () => {
    it("should be a non-empty frozen array", () => {
      expect(Array.isArray(SUPPORTED_RERANKING_MODELS)).toBe(true);
      expect(SUPPORTED_RERANKING_MODELS.length).toBeGreaterThan(0);
      expect(Object.isFrozen(SUPPORTED_RERANKING_MODELS)).toBe(true);
    });

    it("should contain cohere-rerank-3-5", () => {
      expect(SUPPORTED_RERANKING_MODELS).toContain("cohere-rerank-3-5");
    });

    it("should contain amazon-rerank-1-0", () => {
      expect(SUPPORTED_RERANKING_MODELS).toContain("amazon-rerank-1-0");
    });

    it("should not contain chat or embedding models", () => {
      expect(SUPPORTED_RERANKING_MODELS).not.toContain("claude-4-sonnet");
      expect(SUPPORTED_RERANKING_MODELS).not.toContain(
        "cohere-embed-multilingual",
      );
    });
  });

  describe("isSupportedChatModel", () => {
    it("should return true for supported chat models", () => {
      expect(isSupportedChatModel("claude-4-sonnet")).toBe(true);
      expect(isSupportedChatModel("claude-4-5-sonnet")).toBe(true);
      expect(isSupportedChatModel("gpt-oss-120b")).toBe(true);
    });

    it("should return false for unsupported models", () => {
      expect(isSupportedChatModel("unknown-model")).toBe(false);
      expect(isSupportedChatModel("")).toBe(false);
      expect(isSupportedChatModel("cohere-embed-multilingual")).toBe(false);
    });
  });

  describe("isSupportedEmbeddingModel", () => {
    it("should return true for supported embedding models", () => {
      expect(isSupportedEmbeddingModel("cohere-embed-multilingual")).toBe(true);
    });

    it("should return false for unsupported models", () => {
      expect(isSupportedEmbeddingModel("unknown-model")).toBe(false);
      expect(isSupportedEmbeddingModel("claude-4-sonnet")).toBe(false);
    });
  });

  describe("isSupportedImageModel", () => {
    it("should return true for supported image models", () => {
      expect(isSupportedImageModel("stable-image-ultra")).toBe(true);
    });

    it("should return false for unsupported models", () => {
      expect(isSupportedImageModel("unknown-model")).toBe(false);
      expect(isSupportedImageModel("dalle-3")).toBe(false);
    });
  });

  describe("isSupportedRerankingModel", () => {
    it("should return true for supported reranking models", () => {
      expect(isSupportedRerankingModel("cohere-rerank-3-5")).toBe(true);
      expect(isSupportedRerankingModel("amazon-rerank-1-0")).toBe(true);
    });

    it("should return false for unsupported models", () => {
      expect(isSupportedRerankingModel("unknown-model")).toBe(false);
      expect(isSupportedRerankingModel("claude-4-sonnet")).toBe(false);
      expect(isSupportedRerankingModel("cohere-embed-multilingual")).toBe(
        false,
      );
    });
  });

  describe("getSupportedChatModelsString", () => {
    it("should return a comma-separated string of chat models", () => {
      const result = getSupportedChatModelsString();
      expect(typeof result).toBe("string");
      expect(result).toContain("claude-4-sonnet");
      expect(result).toContain(", ");
    });
  });

  describe("getSupportedEmbeddingModelsString", () => {
    it("should return a string containing embedding models", () => {
      const result = getSupportedEmbeddingModelsString();
      expect(typeof result).toBe("string");
      expect(result).toContain("cohere-embed-multilingual");
    });
  });

  describe("getSupportedImageModelsString", () => {
    it("should return a string containing image models", () => {
      const result = getSupportedImageModelsString();
      expect(typeof result).toBe("string");
      expect(result).toContain("stable-image-ultra");
    });
  });

  describe("getSupportedRerankingModelsString", () => {
    it("should return a string containing reranking models", () => {
      const result = getSupportedRerankingModelsString();
      expect(typeof result).toBe("string");
      expect(result).toContain("cohere-rerank-3-5");
      expect(result).toContain("amazon-rerank-1-0");
    });
  });

  describe("fetchAvailableModels", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
      clearModelCache();
    });

    it("should return null when fetch fails", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const result = await fetchAvailableModels({ timeout: 1000 });
      expect(result).toBeNull();
    });

    it("should return null when response is not ok", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await fetchAvailableModels({ timeout: 1000 });
      expect(result).toBeNull();
    });

    it("should return null when response is not valid JSON array", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: "response" }),
      });

      const result = await fetchAvailableModels({ timeout: 1000 });
      expect(result).toBeNull();
    });

    it("should return models when fetch succeeds", async () => {
      const mockModels = [
        { model_id: "test-model", type: ["text-to-text"], regions: ["us"] },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      });

      const result = await fetchAvailableModels({ timeout: 1000 });
      expect(result).toEqual(mockModels);
    });

    it("should use cache when available and valid", async () => {
      const mockModels = [
        { model_id: "cached-model", type: ["text-to-text"], regions: ["us"] },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      });

      // First call populates cache
      await fetchAvailableModels({ timeout: 1000 });
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result = await fetchAvailableModels({ timeout: 1000 });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockModels);
    });

    it("should bypass cache when useCache is false", async () => {
      const mockModels = [
        { model_id: "new-model", type: ["text-to-text"], regions: ["us"] },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      });

      // First call
      await fetchAvailableModels({ timeout: 1000 });
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call with cache bypass
      await fetchAvailableModels({ timeout: 1000, useCache: false });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("getSupportedChatModels", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
      clearModelCache();
    });

    it("should return fetched models when API succeeds", async () => {
      const mockModels = [
        { model_id: "api-chat-model", type: ["text-to-text"], regions: ["us"] },
        {
          model_id: "api-embed-model",
          type: ["text-to-embedding"],
          regions: ["us"],
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      });

      const result = await getSupportedChatModels({ timeout: 1000 });
      expect(result).toContain("api-chat-model");
      expect(result).not.toContain("api-embed-model");
    });

    it("should return fallback list when API fails", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const result = await getSupportedChatModels({ timeout: 1000 });
      expect(result).toEqual([...SUPPORTED_CHAT_MODELS]);
    });
  });

  describe("getSupportedEmbeddingModels", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
      clearModelCache();
    });

    it("should return fetched models when API succeeds", async () => {
      const mockModels = [
        { model_id: "chat-model", type: ["text-to-text"], regions: ["us"] },
        {
          model_id: "api-embed-model",
          type: ["text-to-embedding"],
          regions: ["us"],
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      });

      const result = await getSupportedEmbeddingModels({ timeout: 1000 });
      expect(result).toContain("api-embed-model");
      expect(result).not.toContain("chat-model");
    });

    it("should return fallback list when API fails", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const result = await getSupportedEmbeddingModels({ timeout: 1000 });
      expect(result).toEqual([...SUPPORTED_EMBEDDING_MODELS]);
    });
  });

  describe("getSupportedImageModels", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
      clearModelCache();
    });

    it("should return fetched models when API succeeds", async () => {
      const mockModels = [
        { model_id: "chat-model", type: ["text-to-text"], regions: ["us"] },
        {
          model_id: "api-image-model",
          type: ["text-to-image"],
          regions: ["us"],
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      });

      const result = await getSupportedImageModels({ timeout: 1000 });
      expect(result).toContain("api-image-model");
      expect(result).not.toContain("chat-model");
    });

    it("should return fallback list when API fails", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const result = await getSupportedImageModels({ timeout: 1000 });
      expect(result).toEqual([...SUPPORTED_IMAGE_MODELS]);
    });
  });

  describe("getSupportedRerankingModels", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
      clearModelCache();
    });

    it("should return fetched models when API succeeds", async () => {
      const mockModels = [
        { model_id: "chat-model", type: ["text-to-text"], regions: ["us"] },
        {
          model_id: "api-rerank-model",
          type: ["text-to-ranking"],
          regions: ["us"],
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      });

      const result = await getSupportedRerankingModels({ timeout: 1000 });
      expect(result).toContain("api-rerank-model");
      expect(result).not.toContain("chat-model");
    });

    it("should return fallback list when API fails", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const result = await getSupportedRerankingModels({ timeout: 1000 });
      expect(result).toEqual([...SUPPORTED_RERANKING_MODELS]);
    });
  });
});
