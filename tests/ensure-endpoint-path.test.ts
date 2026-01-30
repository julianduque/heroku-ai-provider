import { ensureEndpointPath } from "../src/index";

describe("ensureEndpointPath", () => {
  const CHAT_ENDPOINT = "/v1/chat/completions";
  const EMBEDDINGS_ENDPOINT = "/v1/embeddings";
  const IMAGE_ENDPOINT = "/v1/images/generations";
  const RERANKING_ENDPOINT = "/v1/rerank";

  describe("chat endpoint", () => {
    it("should append path to base domain only", () => {
      expect(
        ensureEndpointPath("https://us.inference.heroku.com", CHAT_ENDPOINT),
      ).toBe("https://us.inference.heroku.com/v1/chat/completions");
    });

    it("should append path to base domain with trailing slash", () => {
      expect(
        ensureEndpointPath("https://us.inference.heroku.com/", CHAT_ENDPOINT),
      ).toBe("https://us.inference.heroku.com/v1/chat/completions");
    });

    it("should NOT double the path if already present", () => {
      expect(
        ensureEndpointPath(
          "https://us.inference.heroku.com/v1/chat/completions",
          CHAT_ENDPOINT,
        ),
      ).toBe("https://us.inference.heroku.com/v1/chat/completions");
    });

    it("should NOT double the path if already present with trailing slash", () => {
      expect(
        ensureEndpointPath(
          "https://us.inference.heroku.com/v1/chat/completions/",
          CHAT_ENDPOINT,
        ),
      ).toBe("https://us.inference.heroku.com/v1/chat/completions");
    });

    it("should handle EU region base URL", () => {
      expect(
        ensureEndpointPath("https://eu.inference.heroku.com", CHAT_ENDPOINT),
      ).toBe("https://eu.inference.heroku.com/v1/chat/completions");
    });

    it("should handle custom domain", () => {
      expect(
        ensureEndpointPath(
          "https://custom-inference.example.com",
          CHAT_ENDPOINT,
        ),
      ).toBe("https://custom-inference.example.com/v1/chat/completions");
    });

    it("should handle custom domain with existing path prefix", () => {
      expect(
        ensureEndpointPath("https://api.example.com/heroku", CHAT_ENDPOINT),
      ).toBe("https://api.example.com/heroku/v1/chat/completions");
    });
  });

  describe("embeddings endpoint", () => {
    it("should append path to base domain only", () => {
      expect(
        ensureEndpointPath(
          "https://us.inference.heroku.com",
          EMBEDDINGS_ENDPOINT,
        ),
      ).toBe("https://us.inference.heroku.com/v1/embeddings");
    });

    it("should append path to base domain with trailing slash", () => {
      expect(
        ensureEndpointPath(
          "https://us.inference.heroku.com/",
          EMBEDDINGS_ENDPOINT,
        ),
      ).toBe("https://us.inference.heroku.com/v1/embeddings");
    });

    it("should NOT double the path if already present", () => {
      expect(
        ensureEndpointPath(
          "https://us.inference.heroku.com/v1/embeddings",
          EMBEDDINGS_ENDPOINT,
        ),
      ).toBe("https://us.inference.heroku.com/v1/embeddings");
    });

    it("should NOT double the path if already present with trailing slash", () => {
      expect(
        ensureEndpointPath(
          "https://us.inference.heroku.com/v1/embeddings/",
          EMBEDDINGS_ENDPOINT,
        ),
      ).toBe("https://us.inference.heroku.com/v1/embeddings");
    });
  });

  describe("image endpoint", () => {
    it("should append path to base domain only", () => {
      expect(
        ensureEndpointPath("https://us.inference.heroku.com", IMAGE_ENDPOINT),
      ).toBe("https://us.inference.heroku.com/v1/images/generations");
    });

    it("should append path to base domain with trailing slash", () => {
      expect(
        ensureEndpointPath("https://us.inference.heroku.com/", IMAGE_ENDPOINT),
      ).toBe("https://us.inference.heroku.com/v1/images/generations");
    });

    it("should NOT double the path if already present", () => {
      expect(
        ensureEndpointPath(
          "https://us.inference.heroku.com/v1/images/generations",
          IMAGE_ENDPOINT,
        ),
      ).toBe("https://us.inference.heroku.com/v1/images/generations");
    });

    it("should NOT double the path if already present with trailing slash", () => {
      expect(
        ensureEndpointPath(
          "https://us.inference.heroku.com/v1/images/generations/",
          IMAGE_ENDPOINT,
        ),
      ).toBe("https://us.inference.heroku.com/v1/images/generations");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      expect(ensureEndpointPath("", CHAT_ENDPOINT)).toBe("");
    });

    it("should handle multiple trailing slashes", () => {
      expect(
        ensureEndpointPath("https://us.inference.heroku.com///", CHAT_ENDPOINT),
      ).toBe("https://us.inference.heroku.com/v1/chat/completions");
    });

    it("should handle http protocol", () => {
      expect(ensureEndpointPath("http://localhost:3000", CHAT_ENDPOINT)).toBe(
        "http://localhost:3000/v1/chat/completions",
      );
    });

    it("should handle localhost with port", () => {
      expect(
        ensureEndpointPath("http://localhost:8080", EMBEDDINGS_ENDPOINT),
      ).toBe("http://localhost:8080/v1/embeddings");
    });

    it("should handle endpoint path without leading slash", () => {
      expect(
        ensureEndpointPath(
          "https://us.inference.heroku.com",
          "v1/chat/completions",
        ),
      ).toBe("https://us.inference.heroku.com/v1/chat/completions");
    });

    it("should not add path again when it exists in middle of URL path", () => {
      // Edge case: path already contains the endpoint
      expect(
        ensureEndpointPath(
          "https://proxy.example.com/v1/chat/completions",
          CHAT_ENDPOINT,
        ),
      ).toBe("https://proxy.example.com/v1/chat/completions");
    });

    it("should handle URL with query parameters (should not happen but be safe)", () => {
      // This is an unusual case but should be handled gracefully
      const url = "https://us.inference.heroku.com?foo=bar";
      const result = ensureEndpointPath(url, CHAT_ENDPOINT);
      // The function appends to the base, query params might be affected
      // Main goal: don't crash and don't double the path
      expect(result).not.toContain("/v1/chat/completions/v1/chat/completions");
    });
  });

  describe("prevents double path scenarios", () => {
    it("should not produce double chat path", () => {
      const result = ensureEndpointPath(
        "https://us.inference.heroku.com/v1/chat/completions",
        CHAT_ENDPOINT,
      );
      expect(result).not.toContain("/v1/chat/completions/v1/chat/completions");
      expect(result).toBe(
        "https://us.inference.heroku.com/v1/chat/completions",
      );
    });

    it("should not produce double embeddings path", () => {
      const result = ensureEndpointPath(
        "https://us.inference.heroku.com/v1/embeddings",
        EMBEDDINGS_ENDPOINT,
      );
      expect(result).not.toContain("/v1/embeddings/v1/embeddings");
      expect(result).toBe("https://us.inference.heroku.com/v1/embeddings");
    });

    it("should not produce double image path", () => {
      const result = ensureEndpointPath(
        "https://us.inference.heroku.com/v1/images/generations",
        IMAGE_ENDPOINT,
      );
      expect(result).not.toContain(
        "/v1/images/generations/v1/images/generations",
      );
      expect(result).toBe(
        "https://us.inference.heroku.com/v1/images/generations",
      );
    });

    it("should handle case where env returns full URL (regression test)", () => {
      // Simulate environment already returning full URL
      const envUrl = "https://us.inference.heroku.com/v1/chat/completions";
      const result = ensureEndpointPath(envUrl, CHAT_ENDPOINT);
      expect(result).toBe(
        "https://us.inference.heroku.com/v1/chat/completions",
      );
    });

    it("should handle case where env returns base URL only (regression test)", () => {
      // Simulate environment returning only base domain
      const envUrl = "https://us.inference.heroku.com";
      const result = ensureEndpointPath(envUrl, CHAT_ENDPOINT);
      expect(result).toBe(
        "https://us.inference.heroku.com/v1/chat/completions",
      );
    });
  });

  describe("reranking endpoint", () => {
    it("should append path to base domain only", () => {
      expect(
        ensureEndpointPath(
          "https://us.inference.heroku.com",
          RERANKING_ENDPOINT,
        ),
      ).toBe("https://us.inference.heroku.com/v1/rerank");
    });

    it("should NOT double the path if already present", () => {
      expect(
        ensureEndpointPath(
          "https://us.inference.heroku.com/v1/rerank",
          RERANKING_ENDPOINT,
        ),
      ).toBe("https://us.inference.heroku.com/v1/rerank");
    });
  });

  describe("cross-endpoint replacement", () => {
    it("should replace chat endpoint with reranking endpoint", () => {
      // When INFERENCE_URL is a full chat endpoint but we need reranking
      const result = ensureEndpointPath(
        "https://us.inference.heroku.com/v1/chat/completions",
        RERANKING_ENDPOINT,
      );
      expect(result).toBe("https://us.inference.heroku.com/v1/rerank");
    });

    it("should replace embeddings endpoint with reranking endpoint", () => {
      const result = ensureEndpointPath(
        "https://us.inference.heroku.com/v1/embeddings",
        RERANKING_ENDPOINT,
      );
      expect(result).toBe("https://us.inference.heroku.com/v1/rerank");
    });

    it("should replace image endpoint with chat endpoint", () => {
      const result = ensureEndpointPath(
        "https://us.inference.heroku.com/v1/images/generations",
        CHAT_ENDPOINT,
      );
      expect(result).toBe(
        "https://us.inference.heroku.com/v1/chat/completions",
      );
    });

    it("should replace chat endpoint with embeddings endpoint", () => {
      const result = ensureEndpointPath(
        "https://us.inference.heroku.com/v1/chat/completions",
        EMBEDDINGS_ENDPOINT,
      );
      expect(result).toBe("https://us.inference.heroku.com/v1/embeddings");
    });

    it("should handle cross-endpoint replacement with custom domain prefix", () => {
      const result = ensureEndpointPath(
        "https://api.example.com/heroku/v1/chat/completions",
        RERANKING_ENDPOINT,
      );
      expect(result).toBe("https://api.example.com/heroku/v1/rerank");
    });

    it("should NOT create invalid double path when replacing endpoints", () => {
      // This was the original bug - appending /v1/rerank to /v1/chat/completions
      const result = ensureEndpointPath(
        "https://us.inference.heroku.com/v1/chat/completions",
        RERANKING_ENDPOINT,
      );
      expect(result).not.toContain("/v1/chat/completions/v1/rerank");
      expect(result).toBe("https://us.inference.heroku.com/v1/rerank");
    });
  });
});
