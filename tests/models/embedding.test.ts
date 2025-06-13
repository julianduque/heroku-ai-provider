import {
  HerokuEmbeddingModel,
  EmbeddingOptions,
  createEmbedFunction,
} from "../../src/models/embedding";
import { APICallError } from "@ai-sdk/provider";
import * as apiClient from "../../src/utils/api-client";

// Mock the API client utilities
jest.mock("../../src/utils/api-client");
const mockMakeHerokuRequest = jest.mocked(apiClient.makeHerokuRequest);

describe("HerokuEmbeddingModel", () => {
  let model: HerokuEmbeddingModel;
  const testModel = "cohere-embed-multilingual";
  const testApiKey = "test-api-key";
  const testBaseUrl = "https://test.heroku.com/v1/embeddings";

  beforeEach(() => {
    model = new HerokuEmbeddingModel(testModel, testApiKey, testBaseUrl);
    jest.clearAllMocks();
  });

  describe("Constructor and Properties", () => {
    it("should initialize with correct properties", () => {
      expect(model.specificationVersion).toBe("v1");
      expect(model.provider).toBe("heroku");
      expect(model.modelId).toBe(testModel);
      expect(model.maxEmbeddingsPerCall).toBe(100);
      expect(model.supportsParallelCalls).toBe(true);
    });

    it("should throw error for missing model name", () => {
      expect(
        () => new HerokuEmbeddingModel("", testApiKey, testBaseUrl),
      ).toThrow(APICallError);
      expect(
        () => new HerokuEmbeddingModel("", testApiKey, testBaseUrl),
      ).toThrow("Model must be a non-empty string");
    });

    it("should throw error for missing API key", () => {
      expect(
        () => new HerokuEmbeddingModel(testModel, "", testBaseUrl),
      ).toThrow(APICallError);
      expect(
        () => new HerokuEmbeddingModel(testModel, "", testBaseUrl),
      ).toThrow("API key must be a non-empty string");
    });
  });

  describe("Input Validation", () => {
    it("should throw error for empty input array", async () => {
      await expect(model.doEmbed([])).rejects.toThrow(APICallError);
      await expect(model.doEmbed([])).rejects.toThrow("Input cannot be empty");
    });

    it("should throw error for empty strings in input", async () => {
      await expect(
        model.doEmbed(["valid text", "", "another valid text"]),
      ).rejects.toThrow(APICallError);
      await expect(
        model.doEmbed(["valid text", "", "another valid text"]),
      ).rejects.toThrow("Input cannot contain empty strings");
    });

    it("should throw error for whitespace-only strings", async () => {
      await expect(
        model.doEmbed(["valid text", "   ", "another valid text"]),
      ).rejects.toThrow(APICallError);
      await expect(
        model.doEmbed(["valid text", "   ", "another valid text"]),
      ).rejects.toThrow("Input cannot contain empty strings");
    });

    it("should throw error for batch size exceeding limit", async () => {
      const largeInput = Array(101).fill("test text");
      await expect(model.doEmbed(largeInput)).rejects.toThrow(APICallError);
      await expect(model.doEmbed(largeInput)).rejects.toThrow(
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

      const result = await model.doEmbed("Hello, world!");

      expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
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

    it("should handle single string with options", async () => {
      const mockResponse = {
        data: [{ embedding: [0.4, 0.5, 0.6], index: 0 }],
        model: testModel,
        usage: { prompt_tokens: 8, total_tokens: 8 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const options: EmbeddingOptions = {
        inputType: "search_query",
        embeddingType: "float",
        truncate: "END",
      };

      const result = await model.doEmbed("Search query text", options);

      expect(result.embeddings).toEqual([[0.4, 0.5, 0.6]]);
      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          model: testModel,
          input: ["Search query text"],
          input_type: "search_query",
          embedding_type: "float",
          truncate: "END",
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
      const result = await model.doEmbed(texts);

      expect(result.embeddings).toEqual([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
      ]);
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

    it("should handle partial options (only some fields set)", async () => {
      const mockResponse = {
        data: [{ embedding: [0.1, 0.2], index: 0 }],
        model: testModel,
        usage: { prompt_tokens: 5, total_tokens: 5 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const options: EmbeddingOptions = {
        inputType: "classification",
        // embeddingType and truncate not set
      };

      await model.doEmbed("Test text", options);

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          model: testModel,
          input: ["Test text"],
          input_type: "classification",
          // Should not include embedding_type or truncate
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

      await expect(model.doEmbed("Test")).rejects.toThrow(APICallError);
      await expect(model.doEmbed("Test")).rejects.toThrow(
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

      await expect(model.doEmbed(["Text 1", "Text 2"])).rejects.toThrow(
        APICallError,
      );
      await expect(model.doEmbed(["Text 1", "Text 2"])).rejects.toThrow(
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

      await expect(model.doEmbed("Test")).rejects.toThrow(APICallError);
      await expect(model.doEmbed("Test")).rejects.toThrow(
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

      await expect(model.doEmbed("Test")).rejects.toThrow(APICallError);
      await expect(model.doEmbed("Test")).rejects.toThrow(
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

      await expect(model.doEmbed("Test")).rejects.toThrow(APICallError);
      await expect(model.doEmbed("Test")).rejects.toThrow(
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

      await expect(model.doEmbed("Test")).rejects.toThrow(APICallError);
      await expect(model.doEmbed("Test")).rejects.toThrow(
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

      await expect(model.doEmbed("Test")).rejects.toThrow(APICallError);
      await expect(model.doEmbed("Test")).rejects.toThrow(
        "API rate limit exceeded",
      );
    });

    it("should wrap other errors in APICallError", async () => {
      const networkError = new Error("Network timeout");
      mockMakeHerokuRequest.mockRejectedValue(networkError);

      await expect(model.doEmbed("Test")).rejects.toThrow(APICallError);
      await expect(model.doEmbed("Test")).rejects.toThrow(
        "Failed to generate embeddings",
      );
    });
  });

  describe("Helper Methods", () => {
    describe("embedSingle", () => {
      it("should return single embedding for convenience", async () => {
        const mockResponse = {
          data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
          model: testModel,
          usage: { prompt_tokens: 5, total_tokens: 5 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const result = await model.embedSingle("Test text");

        expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
      });
    });

    describe("embedBatch", () => {
      it("should handle small batches normally", async () => {
        const mockResponse = {
          data: [
            { embedding: [0.1, 0.2], index: 0 },
            { embedding: [0.3, 0.4], index: 1 },
          ],
          model: testModel,
          usage: { prompt_tokens: 10, total_tokens: 10 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const result = await model.embedBatch(["Text 1", "Text 2"]);

        expect(result.embeddings).toEqual([
          [0.1, 0.2],
          [0.3, 0.4],
        ]);
        expect(mockMakeHerokuRequest).toHaveBeenCalledTimes(1);
      });

      it("should chunk large batches automatically", async () => {
        // Mock responses for two chunks
        mockMakeHerokuRequest
          .mockResolvedValueOnce({
            data: [
              { embedding: [0.1, 0.2], index: 0 },
              { embedding: [0.3, 0.4], index: 1 },
            ],
            model: testModel,
            usage: { prompt_tokens: 10, total_tokens: 10 },
          })
          .mockResolvedValueOnce({
            data: [{ embedding: [0.5, 0.6], index: 0 }],
            model: testModel,
            usage: { prompt_tokens: 5, total_tokens: 5 },
          });

        const texts = ["Text 1", "Text 2", "Text 3"];
        const result = await model.embedBatch(texts, {}, 2); // Chunk size of 2

        expect(result.embeddings).toEqual([
          [0.1, 0.2],
          [0.3, 0.4],
          [0.5, 0.6],
        ]);
        expect(mockMakeHerokuRequest).toHaveBeenCalledTimes(2);
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
      const result = await embedFunction("Test text");

      expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(result.usage).toEqual({ prompt_tokens: 5, total_tokens: 5 });
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
      expect(result.usage).toEqual({ prompt_tokens: 10, total_tokens: 10 });
    });
  });

  describe("Options Handling", () => {
    it("should handle all embedding options correctly", async () => {
      const mockResponse = {
        data: [{ embedding: [0.1, 0.2], index: 0 }],
        model: testModel,
        usage: { prompt_tokens: 5, total_tokens: 5 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const options: EmbeddingOptions = {
        inputType: "search_document",
        embeddingType: "int8",
        truncate: "START",
      };

      await model.doEmbed("Test", options);

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          model: testModel,
          input: ["Test"],
          input_type: "search_document",
          embedding_type: "int8",
          truncate: "START",
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 30000,
        }),
      );
    });

    it("should handle empty options object", async () => {
      const mockResponse = {
        data: [{ embedding: [0.1, 0.2], index: 0 }],
        model: testModel,
        usage: { prompt_tokens: 5, total_tokens: 5 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      await model.doEmbed("Test", {});

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          model: testModel,
          input: ["Test"],
          // Should not include any optional parameters
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 30000,
        }),
      );
    });
  });
});
