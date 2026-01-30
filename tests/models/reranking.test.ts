import { HerokuRerankingModel } from "../../src/models/reranking";
import { rerank } from "ai";
import { createHerokuAI } from "../../src/index";

/**
 * Integration tests for HerokuRerankingModel using real Heroku API calls.
 *
 * Required environment variables:
 * - INFERENCE_KEY: API key for inference (reranking uses the same key as chat)
 * - INFERENCE_URL: Base URL for inference API
 */
describe("HerokuRerankingModel Integration Tests", () => {
  const apiKey = process.env.INFERENCE_KEY;
  const baseUrl = process.env.INFERENCE_URL
    ? `${process.env.INFERENCE_URL}/v1/rerank`
    : undefined;

  // Skip all tests if credentials are not available
  const describeWithCredentials = apiKey && baseUrl ? describe : describe.skip;

  describeWithCredentials("cohere-rerank-3-5", () => {
    let model: HerokuRerankingModel;

    beforeAll(() => {
      model = new HerokuRerankingModel("cohere-rerank-3-5", apiKey!, baseUrl!);
    });

    it("should have correct model properties", () => {
      expect(model.modelId).toBe("cohere-rerank-3-5");
      expect(model.specificationVersion).toBe("v3");
      expect(model.provider).toBe("heroku");
    });

    it("should rerank text documents", async () => {
      const result = await model.doRerank({
        query: "How do I troubleshoot slow API response times?",
        documents: {
          type: "text",
          values: [
            "Enable query logging to identify slow database queries.",
            "Use caching strategies like Redis.",
            "Application metrics help track performance.",
            "Add database indexes on frequently queried columns.",
          ],
        },
      });

      expect(result.ranking).toBeDefined();
      expect(Array.isArray(result.ranking)).toBe(true);
      expect(result.ranking.length).toBe(4);

      // Each ranking item should have index and relevanceScore
      result.ranking.forEach((item) => {
        expect(typeof item.index).toBe("number");
        expect(typeof item.relevanceScore).toBe("number");
        expect(item.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(item.relevanceScore).toBeLessThanOrEqual(1);
      });
    });

    it("should respect topN parameter", async () => {
      const result = await model.doRerank({
        query: "database optimization",
        documents: {
          type: "text",
          values: [
            "Use indexes for faster queries.",
            "Enable connection pooling.",
            "Monitor slow query logs.",
            "Optimize table structure.",
            "Use read replicas for scaling.",
          ],
        },
        topN: 2,
      });

      expect(result.ranking.length).toBe(2);
    });

    it("should return provider metadata with billing info", async () => {
      const result = await model.doRerank({
        query: "test query",
        documents: {
          type: "text",
          values: ["document one", "document two"],
        },
      });

      expect(result.providerMetadata).toBeDefined();
      expect(result.providerMetadata?.heroku).toBeDefined();
      expect(result.providerMetadata?.heroku?.apiVersion).toBeDefined();
      expect(result.providerMetadata?.heroku?.billedUnits).toBeDefined();
    });

    it("should return response with id and timestamp", async () => {
      const result = await model.doRerank({
        query: "test",
        documents: {
          type: "text",
          values: ["doc"],
        },
      });

      expect(result.response).toBeDefined();
      expect(result.response?.modelId).toBe("cohere-rerank-3-5");
      expect(result.response?.timestamp).toBeInstanceOf(Date);
    });

    it("should handle object documents by converting to JSON", async () => {
      const result = await model.doRerank({
        query: "Oracle pricing",
        documents: {
          type: "object",
          values: [
            { from: "John", text: "Oracle pricing: $5000/month" },
            { from: "Jane", text: "Meeting notes from yesterday" },
          ],
        },
      });

      expect(result.ranking).toBeDefined();
      expect(result.ranking.length).toBe(2);
      // Should have warning about object documents
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
    });

    it("should rank relevant documents higher", async () => {
      const result = await model.doRerank({
        query: "machine learning frameworks",
        documents: {
          type: "text",
          values: [
            "TensorFlow is a popular machine learning framework.",
            "The weather today is sunny and warm.",
            "PyTorch is widely used for deep learning research.",
          ],
        },
      });

      // The ML-related documents (index 0 and 2) should rank higher than weather (index 1)
      const weatherRank = result.ranking.find((r) => r.index === 1);
      const mlRanks = result.ranking.filter((r) => r.index !== 1);

      mlRanks.forEach((mlRank) => {
        expect(mlRank.relevanceScore).toBeGreaterThan(
          weatherRank!.relevanceScore,
        );
      });
    });
  });

  describeWithCredentials("AI SDK rerank() integration", () => {
    let heroku: ReturnType<typeof createHerokuAI>;

    beforeAll(() => {
      heroku = createHerokuAI({
        rerankingApiKey: apiKey,
        rerankingBaseUrl: process.env.INFERENCE_URL,
      });
    });

    it("should work with AI SDK rerank function", async () => {
      const { ranking, rerankedDocuments, originalDocuments } = await rerank({
        model: heroku.reranking("cohere-rerank-3-5"),
        query: "How do I optimize database queries?",
        documents: [
          "Use indexes on frequently queried columns.",
          "The sky is blue.",
          "Enable query caching for repeated queries.",
        ],
        topN: 2,
      });

      expect(ranking).toBeDefined();
      expect(ranking.length).toBe(2);
      expect(rerankedDocuments.length).toBe(2);
      expect(originalDocuments.length).toBe(3);

      // Each ranking item should have the expected structure
      ranking.forEach((item) => {
        expect(item.originalIndex).toBeDefined();
        expect(item.score).toBeDefined();
        expect(item.document).toBeDefined();
      });
    });

    it("should return documents in relevance order", async () => {
      const documents = [
        "Completely unrelated content about cooking recipes.",
        "Database indexing improves query performance significantly.",
        "How to optimize SQL queries for better performance.",
      ];

      const { rerankedDocuments } = await rerank({
        model: heroku.reranking("cohere-rerank-3-5"),
        query: "SQL query optimization",
        documents,
      });

      // The reranked documents should be ordered by relevance
      // SQL/database docs should come before cooking
      const cookingIndex = rerankedDocuments.indexOf(documents[0]);
      expect(cookingIndex).toBe(rerankedDocuments.length - 1); // Should be last
    });
  });

  describe("Constructor Validation", () => {
    it("should throw error for empty model", () => {
      expect(() => {
        new HerokuRerankingModel("", "valid-api-key", "https://example.com");
      }).toThrow("Model must be a non-empty string");
    });

    it("should throw error for empty API key", () => {
      expect(() => {
        new HerokuRerankingModel("model", "", "https://example.com");
      }).toThrow("API key must be a non-empty string");
    });

    it("should throw error for invalid URL", () => {
      expect(() => {
        new HerokuRerankingModel("model", "valid-api-key", "not-a-url");
      }).toThrow("Invalid URL");
    });

    it("should throw error for non-HTTP protocol", () => {
      expect(() => {
        new HerokuRerankingModel("model", "valid-api-key", "ftp://example.com");
      }).toThrow("Base URL must use HTTP or HTTPS protocol");
    });
  });

  describe("Input Validation", () => {
    let model: HerokuRerankingModel;

    beforeAll(() => {
      // Use real credentials if available, otherwise use dummy for validation tests
      model = new HerokuRerankingModel(
        "cohere-rerank-3-5",
        apiKey || "dummy-key-for-validation",
        baseUrl || "https://example.com/v1/rerank",
      );
    });

    it("should throw error for empty documents", async () => {
      await expect(
        model.doRerank({
          query: "test",
          documents: { type: "text", values: [] },
        }),
      ).rejects.toThrow("Documents array cannot be empty");
    });

    it("should throw error for empty query", async () => {
      await expect(
        model.doRerank({
          query: "",
          documents: { type: "text", values: ["doc"] },
        }),
      ).rejects.toThrow("Query must be a non-empty string");
    });

    it("should throw error for topN less than 1", async () => {
      await expect(
        model.doRerank({
          query: "test",
          documents: { type: "text", values: ["doc"] },
          topN: 0,
        }),
      ).rejects.toThrow("topN must be a positive integer");
    });

    it("should throw error for too many documents", async () => {
      const tooManyDocs = Array(1001).fill("document");
      await expect(
        model.doRerank({
          query: "test",
          documents: { type: "text", values: tooManyDocs },
        }),
      ).rejects.toThrow("Documents array exceeds maximum of 1000 items");
    });
  });

  describeWithCredentials("providerOptions warning", () => {
    let model: HerokuRerankingModel;

    beforeAll(() => {
      model = new HerokuRerankingModel("cohere-rerank-3-5", apiKey!, baseUrl!);
    });

    it("should return warning when providerOptions are provided", async () => {
      const result = await model.doRerank({
        query: "test query",
        documents: { type: "text", values: ["doc1", "doc2"] },
        providerOptions: {
          someOption: "value",
        },
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
      expect(
        result.warnings?.some((w) => w.message.includes("providerOptions")),
      ).toBe(true);
    });
  });
});
