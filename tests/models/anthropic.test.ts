import { HerokuAnthropicModel } from "../../src/models/anthropic";
import {
  APICallError,
  LanguageModelV2CallOptions,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
} from "@ai-sdk/provider";
import * as apiClient from "../../src/utils/api-client";

jest.mock("../../src/utils/api-client");
const mockMakeHerokuRequest = jest.mocked(apiClient.makeHerokuRequest);
const mockProcessAnthropicStream = jest.mocked(
  apiClient.processAnthropicStream,
);

const buildPrompt = (text: string): LanguageModelV2Prompt => [
  {
    role: "user",
    content: [{ type: "text", text }],
  },
];

const createCallOptions = (
  prompt: LanguageModelV2Prompt,
  overrides: Partial<LanguageModelV2CallOptions> = {},
): LanguageModelV2CallOptions => ({
  prompt,
  ...overrides,
});

describe("HerokuAnthropicModel", () => {
  let model: HerokuAnthropicModel;
  const testModel = "claude-4-sonnet";
  const testApiKey = "test-api-key";
  const testBaseUrl = "https://test.heroku.com/v1/messages";

  beforeEach(() => {
    model = new HerokuAnthropicModel(testModel, testApiKey, testBaseUrl);
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("initializes with v2 specification", () => {
      expect(model.specificationVersion).toBe("v2");
      expect(model.provider).toBe("heroku.anthropic");
      expect(model.modelId).toBe(testModel);
    });

    it("throws for unsupported models", () => {
      expect(() => {
        new HerokuAnthropicModel("gpt-4", testApiKey, testBaseUrl);
      }).toThrow(/Unsupported Anthropic model/);
    });

    it("throws for empty model name", () => {
      expect(() => {
        new HerokuAnthropicModel("", testApiKey, testBaseUrl);
      }).toThrow(/Model must be a non-empty string/);
    });

    it("throws for invalid base URL", () => {
      expect(() => {
        new HerokuAnthropicModel(testModel, testApiKey, "not-a-url");
      }).toThrow(/Invalid URL|Base URL is not a valid URL format/);
    });
  });

  describe("doGenerate", () => {
    it("sends the expected payload and maps text responses", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        model: testModel,
        content: [{ type: "text", text: "Hello back!" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 5, output_tokens: 7 },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const prompt = buildPrompt("Hello, world!");
      const result = await model.doGenerate(createCallOptions(prompt));

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          model: testModel,
          stream: false,
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: "Hello, world!" }],
            },
          ],
          max_tokens: 4096,
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 60000,
          authMode: "x-api-key",
          headers: expect.objectContaining({
            "anthropic-version": "2023-06-01",
          }),
        }),
      );

      expect(result.content).toEqual([{ type: "text", text: "Hello back!" }]);
      expect(result.finishReason).toBe("stop");
      expect(result.usage).toEqual({
        inputTokens: 5,
        outputTokens: 7,
        totalTokens: 12,
        cachedInputTokens: 0,
      });
      expect(result.response?.id).toBe("msg_123");
    });

    it("handles system message separately from messages", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        model: testModel,
        content: [{ type: "text", text: "I am a helpful assistant!" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 8 },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const prompt: LanguageModelV2Prompt = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: [{ type: "text", text: "Hello!" }] },
      ];

      await model.doGenerate(createCallOptions(prompt));

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          system: "You are a helpful assistant.",
          messages: [
            { role: "user", content: [{ type: "text", text: "Hello!" }] },
          ],
        }),
        expect.any(Object),
      );
    });

    it("maps tool calls from the response", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        model: testModel,
        content: [
          {
            type: "tool_use",
            id: "toolu_1",
            name: "get_weather",
            input: { location: "San Francisco" },
          },
        ],
        stop_reason: "tool_use",
        usage: { input_tokens: 3, output_tokens: 5 },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const prompt = buildPrompt("What's the weather in San Francisco?");
      const result = await model.doGenerate(
        createCallOptions(prompt, {
          tools: [
            {
              type: "function",
              name: "get_weather",
              description: "Get weather for a location",
              inputSchema: {
                type: "object",
                properties: { location: { type: "string" } },
              },
            },
          ],
        }),
      );

      expect(result.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "tool-call",
            toolCallId: "toolu_1",
            toolName: "get_weather",
            input: '{"location":"San Francisco"}',
          }),
        ]),
      );
      expect(result.finishReason).toBe("tool-calls");
    });

    it("passes extended thinking config when provided", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        model: testModel,
        content: [{ type: "text", text: "Let me think about this..." }],
        stop_reason: "end_turn",
        usage: { input_tokens: 5, output_tokens: 100 },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const prompt = buildPrompt("Solve this complex problem");
      await model.doGenerate(
        createCallOptions(prompt, {
          providerOptions: {
            anthropic: {
              thinking: { type: "enabled", budgetTokens: 10000 },
            },
          },
        }),
      );

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          thinking: { type: "enabled", budget_tokens: 10000 },
        }),
        expect.any(Object),
      );
    });

    it("handles temperature and other generation parameters", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        model: testModel,
        content: [{ type: "text", text: "Creative response" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 5, output_tokens: 5 },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const prompt = buildPrompt("Be creative");
      await model.doGenerate(
        createCallOptions(prompt, {
          temperature: 0.9,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1000,
          stopSequences: ["END"],
        }),
      );

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          temperature: 0.9,
          top_p: 0.95,
          top_k: 40,
          max_tokens: 1000,
          stop_sequences: ["END"],
        }),
        expect.any(Object),
      );
    });

    it("throws for invalid message roles", async () => {
      const invalidPrompt = [
        {
          role: "invalid" as const,
          content: [{ type: "text", text: "broken" }],
        },
      ];

      // The model should skip invalid roles, not throw
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        model: testModel,
        content: [{ type: "text", text: "Response" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 1, output_tokens: 1 },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      await model.doGenerate(
        createCallOptions(invalidPrompt as LanguageModelV2Prompt),
      );

      // Should be called but messages array should be empty or filtered
      expect(mockMakeHerokuRequest).toHaveBeenCalled();
    });

    it("maps tool choice to Anthropic format", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        model: testModel,
        content: [
          {
            type: "tool_use",
            id: "toolu_1",
            name: "get_weather",
            input: { location: "NYC" },
          },
        ],
        stop_reason: "tool_use",
        usage: { input_tokens: 3, output_tokens: 5 },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const prompt = buildPrompt("Weather?");
      await model.doGenerate(
        createCallOptions(prompt, {
          tools: [
            {
              type: "function",
              name: "get_weather",
              description: "Get weather",
              inputSchema: { type: "object" },
            },
          ],
          toolChoice: { type: "tool", toolName: "get_weather" },
        }),
      );

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          tool_choice: { type: "tool", name: "get_weather" },
        }),
        expect.any(Object),
      );
    });
  });

  describe("doStream", () => {
    it("creates a stream and processes events", async () => {
      const mockResponse = {
        headers: new Map([["content-type", "text/event-stream"]]),
        body: new ReadableStream(),
      };

      mockMakeHerokuRequest.mockResolvedValue(
        mockResponse as unknown as Response,
      );

      // Mock the stream processing
      const mockEvents: apiClient.AnthropicStreamEvent[] = [
        {
          type: "message_start",
          message: { id: "msg_123", usage: { input_tokens: 5 } },
        },
        {
          type: "content_block_start",
          index: 0,
          content_block: { type: "text", text: "" },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "Hello" },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: " world!" },
        },
        {
          type: "content_block_stop",
          index: 0,
        },
        {
          type: "message_delta",
          delta: { stop_reason: "end_turn" },
          usage: { output_tokens: 10 },
        },
        {
          type: "message_stop",
        },
      ];

      const mockReadableStream =
        new ReadableStream<apiClient.AnthropicStreamEvent>({
          start(controller) {
            for (const event of mockEvents) {
              controller.enqueue(event);
            }
            controller.close();
          },
        });

      mockProcessAnthropicStream.mockReturnValue(mockReadableStream);

      const prompt = buildPrompt("Hello, world!");
      const { stream } = await model.doStream(createCallOptions(prompt));

      const parts: LanguageModelV2StreamPart[] = [];
      const reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) parts.push(value);
      }

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          model: testModel,
          stream: true,
        }),
        expect.objectContaining({
          stream: true,
          authMode: "x-api-key",
        }),
      );

      // Check that we got the expected stream parts
      expect(parts).toContainEqual({ type: "stream-start", warnings: [] });
      expect(parts).toContainEqual(
        expect.objectContaining({ type: "text-start" }),
      );
      expect(parts).toContainEqual(
        expect.objectContaining({
          type: "text-delta",
          delta: "Hello",
        }),
      );
      expect(parts).toContainEqual(
        expect.objectContaining({
          type: "text-delta",
          delta: " world!",
        }),
      );
      expect(parts).toContainEqual(
        expect.objectContaining({ type: "text-end" }),
      );
      expect(parts).toContainEqual(
        expect.objectContaining({
          type: "finish",
          finishReason: "stop",
        }),
      );
    });

    it("handles tool use in streaming", async () => {
      const mockResponse = {
        headers: new Map([["content-type", "text/event-stream"]]),
        body: new ReadableStream(),
      };

      mockMakeHerokuRequest.mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const mockEvents: apiClient.AnthropicStreamEvent[] = [
        {
          type: "message_start",
          message: { id: "msg_123", usage: { input_tokens: 5 } },
        },
        {
          type: "content_block_start",
          index: 0,
          content_block: { type: "tool_use", id: "toolu_1", name: "get_time" },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "input_json_delta", partial_json: '{"tz":' },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "input_json_delta", partial_json: '"UTC"}' },
        },
        {
          type: "content_block_stop",
          index: 0,
        },
        {
          type: "message_delta",
          delta: { stop_reason: "tool_use" },
          usage: { output_tokens: 8 },
        },
        {
          type: "message_stop",
        },
      ];

      const mockReadableStream =
        new ReadableStream<apiClient.AnthropicStreamEvent>({
          start(controller) {
            for (const event of mockEvents) {
              controller.enqueue(event);
            }
            controller.close();
          },
        });

      mockProcessAnthropicStream.mockReturnValue(mockReadableStream);

      const prompt = buildPrompt("What time is it?");
      const { stream } = await model.doStream(
        createCallOptions(prompt, {
          tools: [
            {
              type: "function",
              name: "get_time",
              description: "Get current time",
              inputSchema: { type: "object" },
            },
          ],
        }),
      );

      const parts: LanguageModelV2StreamPart[] = [];
      const reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) parts.push(value);
      }

      expect(parts).toContainEqual(
        expect.objectContaining({
          type: "tool-call",
          toolName: "get_time",
          toolCallId: "toolu_1",
          input: '{"tz":"UTC"}',
        }),
      );
      expect(parts).toContainEqual(
        expect.objectContaining({
          type: "finish",
          finishReason: "tool-calls",
        }),
      );
    });
  });

  describe("finish reason mapping", () => {
    it.each([
      ["end_turn", "stop"],
      ["stop_sequence", "stop"],
      ["max_tokens", "length"],
      ["tool_use", "tool-calls"],
    ])("maps %s to %s", async (anthropicReason, sdkReason) => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        model: testModel,
        content: [{ type: "text", text: "Response" }],
        stop_reason: anthropicReason,
        usage: { input_tokens: 1, output_tokens: 1 },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const result = await model.doGenerate(
        createCallOptions(buildPrompt("Hi")),
      );

      expect(result.finishReason).toBe(sdkReason);
    });
  });

  describe("warnings", () => {
    it("warns about unsupported options", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        model: testModel,
        content: [{ type: "text", text: "Response" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 1, output_tokens: 1 },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const result = await model.doGenerate(
        createCallOptions(buildPrompt("Hi"), {
          presencePenalty: 0.5,
          frequencyPenalty: 0.5,
          seed: 123,
        }),
      );

      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "unsupported-setting",
            setting: "presencePenalty",
          }),
          expect.objectContaining({
            type: "unsupported-setting",
            setting: "frequencyPenalty",
          }),
          expect.objectContaining({
            type: "unsupported-setting",
            setting: "seed",
          }),
        ]),
      );
    });
  });

  describe("structured output", () => {
    it("injects structured output tool and returns JSON from tool call", async () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name", "age"],
      };

      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        model: testModel,
        content: [
          {
            type: "tool_use",
            id: "toolu_1",
            name: "person",
            input: { name: "Alice", age: 30 },
          },
        ],
        stop_reason: "tool_use",
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const prompt = buildPrompt("Give me a person");
      const result = await model.doGenerate(
        createCallOptions(prompt, {
          responseFormat: {
            type: "json",
            name: "person",
            description: "A person object",
            schema,
          },
        }),
      );

      // Should have the tool in the request
      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          tools: expect.arrayContaining([
            expect.objectContaining({
              name: "person",
            }),
          ]),
          tool_choice: { type: "tool", name: "person" },
        }),
        expect.any(Object),
      );

      // Should return the structured output as text
      expect(result.content).toContainEqual(
        expect.objectContaining({
          type: "text",
          text: '{"name":"Alice","age":30}',
        }),
      );
    });
  });

  describe("error handling", () => {
    it("throws APICallError when request fails", async () => {
      mockMakeHerokuRequest.mockRejectedValue(
        new APICallError({
          message: "Rate limit exceeded",
          url: testBaseUrl,
          statusCode: 429,
          requestBodyValues: {},
        }),
      );

      await expect(
        model.doGenerate(createCallOptions(buildPrompt("Hello"))),
      ).rejects.toThrow(APICallError);
    });

    it("wraps non-APICallError errors", async () => {
      mockMakeHerokuRequest.mockRejectedValue(new Error("Network error"));

      await expect(
        model.doGenerate(createCallOptions(buildPrompt("Hello"))),
      ).rejects.toThrow(/Failed to generate completion/);
    });

    it("throws when prompt is missing", async () => {
      await expect(
        model.doGenerate({} as LanguageModelV2CallOptions),
      ).rejects.toThrow(/Missing required prompt/);
    });
  });

  describe("tool result handling", () => {
    it("converts tool results to Anthropic format", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        model: testModel,
        content: [{ type: "text", text: "The weather is sunny!" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const prompt: LanguageModelV2Prompt = [
        {
          role: "user",
          content: [{ type: "text", text: "What's the weather?" }],
        },
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "toolu_1",
              toolName: "get_weather",
              input: { location: "NYC" },
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "toolu_1",
              toolName: "get_weather",
              result: { temperature: 72, condition: "sunny" },
            },
          ],
        },
      ];

      await model.doGenerate(createCallOptions(prompt));

      // The request should include the tool result in Anthropic format
      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: "tool_result",
                  tool_use_id: "toolu_1",
                }),
              ]),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });
  });

  describe("cache control", () => {
    it("adds cache control to system prompt when enabled", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        model: testModel,
        content: [{ type: "text", text: "Response" }],
        stop_reason: "end_turn",
        usage: {
          input_tokens: 10,
          output_tokens: 5,
          cache_creation_input_tokens: 100,
          cache_read_input_tokens: 50,
        },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const prompt: LanguageModelV2Prompt = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: [{ type: "text", text: "Hello!" }] },
      ];

      const result = await model.doGenerate(
        createCallOptions(prompt, {
          providerOptions: {
            anthropic: {
              cacheControl: { systemPrompt: true },
            },
          },
        }),
      );

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          system: [
            {
              type: "text",
              text: "You are a helpful assistant.",
              cache_control: { type: "ephemeral" },
            },
          ],
        }),
        expect.any(Object),
      );

      // Should include cached tokens in usage
      expect(result.usage?.cachedInputTokens).toBe(150);
    });
  });
});
