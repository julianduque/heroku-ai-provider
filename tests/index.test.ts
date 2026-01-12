describe("createHerokuAI image integration", () => {
  const originalInferenceKey = process.env.INFERENCE_KEY;
  const originalHerokuInferenceKey = process.env.HEROKU_INFERENCE_KEY;
  const originalImagesUrl = process.env.IMAGES_URL;
  const originalHerokuImagesUrl = process.env.HEROKU_IMAGES_URL;
  const originalDiffusionKey = process.env.DIFFUSION_KEY;
  const originalHerokuDiffusionKey = process.env.HEROKU_DIFFUSION_KEY;
  const originalDiffusionUrl = process.env.DIFFUSION_URL;
  const originalHerokuDiffusionUrl = process.env.HEROKU_DIFFUSION_URL;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    if (originalInferenceKey) {
      process.env.INFERENCE_KEY = originalInferenceKey;
    } else {
      delete process.env.INFERENCE_KEY;
    }

    if (originalHerokuInferenceKey) {
      process.env.HEROKU_INFERENCE_KEY = originalHerokuInferenceKey;
    } else {
      delete process.env.HEROKU_INFERENCE_KEY;
    }

    if (originalImagesUrl) {
      process.env.IMAGES_URL = originalImagesUrl;
    } else {
      delete process.env.IMAGES_URL;
    }

    if (originalHerokuImagesUrl) {
      process.env.HEROKU_IMAGES_URL = originalHerokuImagesUrl;
    } else {
      delete process.env.HEROKU_IMAGES_URL;
    }

    if (originalDiffusionKey) {
      process.env.DIFFUSION_KEY = originalDiffusionKey;
    } else {
      delete process.env.DIFFUSION_KEY;
    }

    if (originalHerokuDiffusionKey) {
      process.env.HEROKU_DIFFUSION_KEY = originalHerokuDiffusionKey;
    } else {
      delete process.env.HEROKU_DIFFUSION_KEY;
    }

    if (originalDiffusionUrl) {
      process.env.DIFFUSION_URL = originalDiffusionUrl;
    } else {
      delete process.env.DIFFUSION_URL;
    }

    if (originalHerokuDiffusionUrl) {
      process.env.HEROKU_DIFFUSION_URL = originalHerokuDiffusionUrl;
    } else {
      delete process.env.HEROKU_DIFFUSION_URL;
    }
  });

  it("returns an image model when using diffusion environment key", async () => {
    process.env.DIFFUSION_KEY = "diffusion-key";
    const { createHerokuAI } = await import("../src");

    const provider = createHerokuAI({ chatApiKey: "chat-key" });
    const imageModel = provider.image("stable-image-ultra");

    expect(imageModel.provider).toBe("heroku");
    expect(imageModel.modelId).toBe("stable-image-ultra");
  });

  it("throws when no image API key is available", async () => {
    delete process.env.DIFFUSION_KEY;
    delete process.env.HEROKU_DIFFUSION_KEY;
    process.env.EMBEDDING_KEY = "bootstrap-embed";
    const { createHerokuAI } = await import("../src");
    delete process.env.EMBEDDING_KEY;

    const provider = createHerokuAI({ embeddingsApiKey: "embed-key" });

    expect(() => provider.image("stable-image-ultra")).toThrow(
      "Image API key is required",
    );
  });
});

describe("createHerokuAI reranking integration", () => {
  const originalInferenceKey = process.env.INFERENCE_KEY;
  const originalHerokuInferenceKey = process.env.HEROKU_INFERENCE_KEY;
  const originalInferenceUrl = process.env.INFERENCE_URL;
  const originalHerokuInferenceUrl = process.env.HEROKU_INFERENCE_URL;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    if (originalInferenceKey) {
      process.env.INFERENCE_KEY = originalInferenceKey;
    } else {
      delete process.env.INFERENCE_KEY;
    }

    if (originalHerokuInferenceKey) {
      process.env.HEROKU_INFERENCE_KEY = originalHerokuInferenceKey;
    } else {
      delete process.env.HEROKU_INFERENCE_KEY;
    }

    if (originalInferenceUrl) {
      process.env.INFERENCE_URL = originalInferenceUrl;
    } else {
      delete process.env.INFERENCE_URL;
    }

    if (originalHerokuInferenceUrl) {
      process.env.HEROKU_INFERENCE_URL = originalHerokuInferenceUrl;
    } else {
      delete process.env.HEROKU_INFERENCE_URL;
    }
  });

  it("returns a reranking model when using INFERENCE_KEY env var", async () => {
    process.env.INFERENCE_KEY = "inference-key-for-rerank";
    const { createHerokuAI } = await import("../src");

    const provider = createHerokuAI();
    const rerankingModel = provider.reranking("cohere-rerank-3-5");

    expect(rerankingModel.provider).toBe("heroku");
    expect(rerankingModel.modelId).toBe("cohere-rerank-3-5");
  });

  it("returns a reranking model when using HEROKU_INFERENCE_KEY env var", async () => {
    delete process.env.INFERENCE_KEY;
    process.env.HEROKU_INFERENCE_KEY = "heroku-inference-key-for-rerank";
    const { createHerokuAI } = await import("../src");

    const provider = createHerokuAI();
    const rerankingModel = provider.reranking("amazon-rerank-1-0");

    expect(rerankingModel.provider).toBe("heroku");
    expect(rerankingModel.modelId).toBe("amazon-rerank-1-0");
  });

  it("uses rerankingApiKey option to override env vars", async () => {
    process.env.INFERENCE_KEY = "env-inference-key";
    const { createHerokuAI } = await import("../src");

    const provider = createHerokuAI({
      rerankingApiKey: "custom-rerank-api-key",
    });
    const rerankingModel = provider.reranking("cohere-rerank-3-5");

    expect(rerankingModel.provider).toBe("heroku");
    expect(rerankingModel.modelId).toBe("cohere-rerank-3-5");
  });

  it("throws when no reranking API key is available", async () => {
    delete process.env.INFERENCE_KEY;
    delete process.env.HEROKU_INFERENCE_KEY;
    process.env.EMBEDDING_KEY = "bootstrap-embed";
    const { createHerokuAI } = await import("../src");
    delete process.env.EMBEDDING_KEY;

    const provider = createHerokuAI({ embeddingsApiKey: "embed-key" });

    expect(() => provider.reranking("cohere-rerank-3-5")).toThrow(
      "Reranking API key is required",
    );
  });

  it("uses INFERENCE_URL for reranking base URL", async () => {
    process.env.INFERENCE_KEY = "inference-key";
    process.env.INFERENCE_URL = "https://custom.inference.url";
    const { createHerokuAI } = await import("../src");

    const provider = createHerokuAI();
    const rerankingModel = provider.reranking("cohere-rerank-3-5");

    // The model should be created successfully with the custom URL
    expect(rerankingModel.provider).toBe("heroku");
    expect(rerankingModel.modelId).toBe("cohere-rerank-3-5");
  });
});
