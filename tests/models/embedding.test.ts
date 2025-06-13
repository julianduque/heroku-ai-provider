import {
  HerokuEmbeddingModel,
  createEmbedFunction,
} from "../../src/models/embedding";
import { APICallError } from "@ai-sdk/provider";
import { makeHerokuRequest } from "../../src/utils/api-client";

// Mock the API client
jest.mock("../../src/utils/api-client");
const mockMakeHerokuRequest = makeHerokuRequest as jest.MockedFunction<
  typeof makeHerokuRequest
>;

describe("HerokuEmbeddingModel", () => {
  const testModel = "cohere-embed-multilingual";
  const testApiKey = "test-api-key";
  const testBaseUrl = "https://api.heroku.com/ai";

  let model: HerokuEmbeddingModel;

  beforeEach(() => {
    model = new HerokuEmbeddingModel(testModel, testApiKey, testBaseUrl);
    mockMakeHerokuRequest.mockClear();
  });

  describe("Constructor", () => {
    it("should initialize with correct properties", () => {
      expect(model.modelId).toBe(testModel);
      expect(model.specificationVersion).toBe("v1");
      expect(model.provider).toBe("heroku");
      expect(model.maxEmbeddingsPerCall).toBe(100);
    });
  });

  describe("Input Validation", () => {
    it("should throw error for empty input array", async () => {
      await expect(model.doEmbed({ values: [] })).rejects.toThrow(APICallError);
      await expect(model.doEmbed({ values: [] })).rejects.toThrow(
        "Input cannot be empty",
      );
    });

    it("should throw error for empty strings in input", async () => {
      await expect(
        model.doEmbed({ values: ["valid text", "", "another valid text"] }),
      ).rejects.toThrow(APICallError);
      await expect(
        model.doEmbed({ values: ["valid text", "", "another valid text"] }),
      ).rejects.toThrow("Input must be non-empty strings only");
    });

    it("should throw error for whitespace-only strings", async () => {
      await expect(
        model.doEmbed({ values: ["valid text", "   ", "another valid text"] }),
      ).rejects.toThrow(APICallError);
      await expect(
        model.doEmbed({ values: ["valid text", "   ", "another valid text"] }),
      ).rejects.toThrow("Input must be non-empty strings only");
    });

    it("should throw error for batch size exceeding limit", async () => {
      const largeInput = Array(101).fill("test text");
      await expect(model.doEmbed({ values: largeInput })).rejects.toThrow(
        APICallError,
      );
      await expect(model.doEmbed({ values: largeInput })).rejects.toThrow(
        "Batch size exceeds maximum limit of 100",
      );
    });
  });

  describe("Single Text Embedding", () => {
    it("should handle single string input", async () => {
      const mockResponse = {
        data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
        model: testModel,
        usage: { prompt_tokens: 5, total_tokens: 5 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const result = await model.doEmbed({ values: ["Hello, world!"] });

      expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
      expect(result.usage).toEqual({ tokens: 5 });
      expect(result.rawResponse).toEqual({ headers: {} });
      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          model: testModel,
          input: ["Hello, world!"],
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 30000,
        }),
      );
    });

    it("should handle single string with headers", async () => {
      const mockResponse = {
        data: [{ embedding: [0.4, 0.5, 0.6], index: 0 }],
        model: testModel,
        usage: { prompt_tokens: 8, total_tokens: 8 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const result = await model.doEmbed({
        values: ["Search query text"],
        headers: { "X-Custom-Header": "test-value" },
      });

      expect(result.embeddings).toEqual([[0.4, 0.5, 0.6]]);
      expect(result.usage).toEqual({ tokens: 8 });
      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          model: testModel,
          input: ["Search query text"],
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 30000,
        }),
      );
    });
  });

  describe("Batch Text Embedding", () => {
    it("should handle array of strings", async () => {
      const mockResponse = {
        data: [
          { embedding: [0.1, 0.2, 0.3], index: 0 },
          { embedding: [0.4, 0.5, 0.6], index: 1 },
          { embedding: [0.7, 0.8, 0.9], index: 2 },
        ],
        model: testModel,
        usage: { prompt_tokens: 15, total_tokens: 15 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const texts = ["First text", "Second text", "Third text"];
      const result = await model.doEmbed({ values: texts });

      expect(result.embeddings).toEqual([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
      ]);
      expect(result.usage).toEqual({ tokens: 15 });
      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          model: testModel,
          input: texts,
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 30000,
        }),
      );
    });

    it("should handle missing usage in response", async () => {
      const mockResponse = {
        data: [{ embedding: [0.1, 0.2], index: 0 }],
        model: testModel,
        // No usage field
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const result = await model.doEmbed({ values: ["Test text"] });

      expect(result.embeddings).toEqual([[0.1, 0.2]]);
      expect(result.usage).toBeUndefined();
      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          model: testModel,
          input: ["Test text"],
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 30000,
        }),
      );
    });
  });

  describe("Response Validation", () => {
    it("should throw error for missing data array in response", async () => {
      const invalidResponse = {
        model: testModel,
        usage: { prompt_tokens: 5, total_tokens: 5 },
        // Missing data array
      };
      mockMakeHerokuRequest.mockResolvedValue(invalidResponse);

      await expect(model.doEmbed({ values: ["Test"] })).rejects.toThrow(
        APICallError,
      );
      await expect(model.doEmbed({ values: ["Test"] })).rejects.toThrow(
        "Invalid response format: missing data array",
      );
    });

    it("should throw error for mismatched response length", async () => {
      const invalidResponse = {
        data: [
          { embedding: [0.1, 0.2], index: 0 },
          // Only one embedding for two inputs
        ],
        model: testModel,
        usage: { prompt_tokens: 10, total_tokens: 10 },
      };
      mockMakeHerokuRequest.mockResolvedValue(invalidResponse);

      await expect(
        model.doEmbed({ values: ["Text 1", "Text 2"] }),
      ).rejects.toThrow(APICallError);
      await expect(
        model.doEmbed({ values: ["Text 1", "Text 2"] }),
      ).rejects.toThrow(
        "Response data length (1) does not match input length (2)",
      );
    });

    it("should throw error for invalid embedding format", async () => {
      const invalidResponse = {
        data: [{ embedding: "not an array", index: 0 }],
        model: testModel,
        usage: { prompt_tokens: 5, total_tokens: 5 },
      };
      mockMakeHerokuRequest.mockResolvedValue(invalidResponse);

      await expect(model.doEmbed({ values: ["Test"] })).rejects.toThrow(
        APICallError,
      );
      await expect(model.doEmbed({ values: ["Test"] })).rejects.toThrow(
        "Invalid embedding format at index 0",
      );
    });

    it("should throw error for empty embedding vector", async () => {
      const invalidResponse = {
        data: [{ embedding: [], index: 0 }],
        model: testModel,
        usage: { prompt_tokens: 5, total_tokens: 5 },
      };
      mockMakeHerokuRequest.mockResolvedValue(invalidResponse);

      await expect(model.doEmbed({ values: ["Test"] })).rejects.toThrow(
        APICallError,
      );
      await expect(model.doEmbed({ values: ["Test"] })).rejects.toThrow(
        "Empty embedding vector at index 0",
      );
    });

    it("should throw error for non-numeric embedding values", async () => {
      const invalidResponse = {
        data: [{ embedding: [0.1, "invalid", 0.3], index: 0 }],
        model: testModel,
        usage: { prompt_tokens: 5, total_tokens: 5 },
      };
      mockMakeHerokuRequest.mockResolvedValue(invalidResponse);

      await expect(model.doEmbed({ values: ["Test"] })).rejects.toThrow(
        APICallError,
      );
      await expect(model.doEmbed({ values: ["Test"] })).rejects.toThrow(
        "Invalid embedding values at index 0: contains non-numeric or infinite values",
      );
    });

    it("should throw error for infinite embedding values", async () => {
      const invalidResponse = {
        data: [{ embedding: [0.1, Infinity, 0.3], index: 0 }],
        model: testModel,
        usage: { prompt_tokens: 5, total_tokens: 5 },
      };
      mockMakeHerokuRequest.mockResolvedValue(invalidResponse);

      await expect(model.doEmbed({ values: ["Test"] })).rejects.toThrow(
        APICallError,
      );
      await expect(model.doEmbed({ values: ["Test"] })).rejects.toThrow(
        "Invalid embedding values at index 0: contains non-numeric or infinite values",
      );
    });
  });

  describe("Error Handling", () => {
    it("should re-throw APICallError from API client", async () => {
      const apiError = new APICallError({
        message: "API rate limit exceeded",
        url: testBaseUrl,
        requestBodyValues: {},
        statusCode: 429,
        responseBody: "",
      });
      mockMakeHerokuRequest.mockRejectedValue(apiError);

      await expect(model.doEmbed({ values: ["Test"] })).rejects.toThrow(
        APICallError,
      );
      await expect(model.doEmbed({ values: ["Test"] })).rejects.toThrow(
        "API rate limit exceeded",
      );
    });

    it("should wrap other errors in APICallError", async () => {
      const networkError = new Error("Network connection failed");
      mockMakeHerokuRequest.mockRejectedValue(networkError);

      await expect(model.doEmbed({ values: ["Test"] })).rejects.toThrow(
        APICallError,
      );
      await expect(model.doEmbed({ values: ["Test"] })).rejects.toThrow(
        "Failed to generate embeddings",
      );
    });
  });

  describe("Helper Methods", () => {
    describe("embedSingle", () => {
      it("should handle single text embedding", async () => {
        const mockResponse = {
          data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
          model: testModel,
          usage: { prompt_tokens: 5, total_tokens: 5 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const result = await model.embedSingle("Hello, world!");

        expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
        expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
          testBaseUrl,
          testApiKey,
          expect.objectContaining({
            model: testModel,
            input: ["Hello, world!"],
          }),
          expect.objectContaining({
            maxRetries: 3,
            timeout: 30000,
          }),
        );
      });
    });

    describe("embedBatch", () => {
      it("should handle small batches without chunking", async () => {
        const mockResponse = {
          data: [
            { embedding: [0.1, 0.2], index: 0 },
            { embedding: [0.3, 0.4], index: 1 },
          ],
          model: testModel,
          usage: { prompt_tokens: 10, total_tokens: 10 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const texts = ["Text 1", "Text 2"];
        const result = await model.embedBatch(texts);

        expect(result.embeddings).toEqual([
          [0.1, 0.2],
          [0.3, 0.4],
        ]);
        expect(mockMakeHerokuRequest).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("createEmbedFunction", () => {
    it("should create AI SDK compatible function for single input", async () => {
      const mockResponse = {
        data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
        model: testModel,
        usage: { prompt_tokens: 5, total_tokens: 5 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const embedFunction = createEmbedFunction(model);
      const result = await embedFunction("Hello, world!");

      expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(result.usage).toEqual({ tokens: 5 });
    });

    it("should create AI SDK compatible function for array input", async () => {
      const mockResponse = {
        data: [
          { embedding: [0.1, 0.2], index: 0 },
          { embedding: [0.3, 0.4], index: 1 },
        ],
        model: testModel,
        usage: { prompt_tokens: 10, total_tokens: 10 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const embedFunction = createEmbedFunction(model);
      const result = await embedFunction(["Text 1", "Text 2"]);

      expect(result.embeddings).toEqual([
        [0.1, 0.2],
        [0.3, 0.4],
      ]);
      expect(result.usage).toEqual({ tokens: 10 });
    });
  });
});
