import { HerokuImageModel } from "../../src/models/image";
import { makeHerokuRequest } from "../../src/utils/api-client";
import { APICallError } from "@ai-sdk/provider";

jest.mock("../../src/utils/api-client");
const mockMakeHerokuRequest = makeHerokuRequest as jest.MockedFunction<
  typeof makeHerokuRequest
>;

describe("HerokuImageModel", () => {
  const testModel = "stable-image-ultra";
  const testApiKey = "test-api-key";
  const testBaseUrl = "https://us.inference.heroku.com/v1/images/generations";

  let model: HerokuImageModel;

  beforeEach(() => {
    mockMakeHerokuRequest.mockReset();
    model = new HerokuImageModel(testModel, testApiKey, testBaseUrl);
  });

  it("initializes with correct defaults", () => {
    expect(model.modelId).toBe(testModel);
    expect(model.specificationVersion).toBe("v2");
    expect(model.provider).toBe("heroku");
    expect(model.maxImagesPerCall).toBe(10);
  });

  it("generates images and returns metadata", async () => {
    const created = 1_700_000_000;
    mockMakeHerokuRequest.mockResolvedValue({
      created,
      data: [
        {
          b64_json: "base64-image-data",
          revised_prompt: "refined prompt",
        },
      ],
      model: testModel,
    });

    const result = await model.doGenerate({
      prompt: "A scenic mountain lake",
      n: 1,
      size: "1024x1024",
      aspectRatio: undefined,
      seed: undefined,
      providerOptions: {},
    });

    expect(result.images).toEqual(["base64-image-data"]);
    expect(result.warnings).toEqual([]);
    expect(result.providerMetadata?.heroku.images[0]).toEqual({
      revised_prompt: "refined prompt",
    });
    expect(result.response.modelId).toBe(testModel);
    expect(result.response.timestamp).toEqual(new Date(created * 1000));

    expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
      testBaseUrl,
      testApiKey,
      expect.objectContaining({
        model: testModel,
        prompt: "A scenic mountain lake",
        response_format: "b64_json",
        size: "1024x1024",
      }),
      expect.objectContaining({
        timeout: 60000,
        maxRetries: 2,
      }),
    );
  });

  it("adds warnings for unsupported options", async () => {
    mockMakeHerokuRequest.mockResolvedValue({
      data: [
        {
          b64_json: "base64-image",
        },
      ],
    });

    const result = await model.doGenerate({
      prompt: "A futuristic city",
      n: 1,
      size: undefined,
      aspectRatio: "16:9",
      seed: 42,
      providerOptions: {},
    });

    expect(result.images).toEqual(["base64-image"]);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]).toMatchObject({
      type: "unsupported-setting",
      setting: "aspectRatio",
    });
    expect(result.warnings[1]).toMatchObject({
      type: "unsupported-setting",
      setting: "seed",
    });
  });

  it("handles image URLs without base64 data", async () => {
    mockMakeHerokuRequest.mockResolvedValue({
      data: [
        {
          url: "https://example.com/image.png",
        },
      ],
    });

    const result = await model.doGenerate({
      prompt: "A minimalist logo",
      n: 1,
      size: undefined,
      aspectRatio: undefined,
      seed: undefined,
      providerOptions: {},
    });

    expect(result.images).toEqual(["https://example.com/image.png"]);
    expect(result.warnings[0]).toMatchObject({
      type: "other",
    });
  });

  it("throws when n is invalid", async () => {
    await expect(
      model.doGenerate({
        prompt: "Test prompt",
        n: 0,
        size: undefined,
        aspectRatio: undefined,
        seed: undefined,
        providerOptions: {},
      }),
    ).rejects.toThrow("n must be a positive integer");
  });

  it("throws when response is malformed", async () => {
    mockMakeHerokuRequest.mockResolvedValue({
      data: [{}],
    });

    await expect(
      model.doGenerate({
        prompt: "Test prompt",
        n: 1,
        size: undefined,
        aspectRatio: undefined,
        seed: undefined,
        providerOptions: {},
      }),
    ).rejects.toThrow(APICallError);
  });
});
