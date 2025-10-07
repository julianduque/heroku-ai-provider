import { HerokuChatLanguageModel, ToolInput } from "../../src/models/chat";
import {
  APICallError,
  LanguageModelV2CallOptions,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
} from "@ai-sdk/provider";
import * as apiClient from "../../src/utils/api-client";

jest.mock("../../src/utils/api-client");
const mockMakeHerokuRequest = jest.mocked(apiClient.makeHerokuRequest);
const mockProcessHerokuStream = jest.mocked(apiClient.processHerokuStream);

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

describe("HerokuChatLanguageModel", () => {
  let model: HerokuChatLanguageModel;
  const testModel = "claude-4-sonnet";
  const testApiKey = "test-api-key";
  const testBaseUrl = "https://test.heroku.com/v1/chat/completions";

  beforeEach(() => {
    model = new HerokuChatLanguageModel(testModel, testApiKey, testBaseUrl);
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("initializes with v2 specification", () => {
      expect(model.specificationVersion).toBe("v2");
      expect(model.provider).toBe("heroku");
      expect(model.modelId).toBe(testModel);
    });
  });

  describe("doGenerate", () => {
    it("sends the expected payload and maps text responses", async () => {
      const mockResponse = {
        id: "resp_123",
        model: testModel,
        created: 1_720_000_000,
        choices: [
          {
            message: { content: "Hello back!" },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12 },
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
          messages: [{ role: "user", content: "Hello, world!" }],
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 30000,
        }),
      );

      expect(result.content).toEqual([{ type: "text", text: "Hello back!" }]);
      expect(result.finishReason).toBe("stop");
      expect(result.usage).toEqual({
        inputTokens: 5,
        outputTokens: 7,
        totalTokens: 12,
      });
      expect(result.response?.id).toBe("resp_123");
    });

    it("maps tool calls from the response", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call_1",
                  function: {
                    name: "doSomething",
                    arguments: '{"value":42}',
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const prompt: LanguageModelV2Prompt = [
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_1",
              toolName: "doSomething",
              input: { value: 42 },
            },
          ],
        },
      ];

      const result = await model.doGenerate(createCallOptions(prompt));

      expect(result.content).toEqual(
        expect.arrayContaining([
          {
            type: "tool-call",
            toolCallId: "call_1",
            toolName: "doSomething",
            input: '{"value":42}',
          },
        ]),
      );
      expect(result.finishReason).toBe("tool-calls");
    });

    it("throws for invalid message roles", async () => {
      const invalidPrompt = [
        {
          role: "invalid" as const,
          content: [{ type: "text", text: "broken" }],
        },
      ];

      await expect(
        model.doGenerate(
          createCallOptions(invalidPrompt as LanguageModelV2Prompt),
        ),
      ).rejects.toBeInstanceOf(APICallError);
    });

    it("injects structured output tool and returns JSON from tool call", async () => {
      const schema = {
        type: "object",
        properties: {
          title: { type: "string" },
        },
        required: ["title"],
      };

      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_structured",
                  function: {
                    name: "recipe",
                    arguments: '{"title":"Structured Output"}',
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const prompt = buildPrompt("Generate something structured");
      const result = await model.doGenerate(
        createCallOptions(prompt, {
          responseFormat: {
            type: "json",
            schema,
            name: "Recipe",
            description: "Structured recipe output",
          },
        }),
      );

      const [, , requestBody] = mockMakeHerokuRequest.mock.calls[0];

      expect(requestBody.messages[0]).toEqual(
        expect.objectContaining({
          role: "system",
        }),
      );
      expect(requestBody.messages[0].content).toContain(
        '"recipe" exactly once.',
      );

      expect(requestBody.tools).toHaveLength(1);
      expect(requestBody.tools[0]).toEqual(
        expect.objectContaining({
          type: "function",
          function: expect.objectContaining({
            name: "recipe",
            parameters: expect.objectContaining({
              type: "object",
            }),
          }),
        }),
      );

      expect(requestBody.tool_choice).toEqual({
        type: "function",
        function: { name: "recipe" },
      });

      expect(result.content[0]).toEqual({
        type: "text",
        text: '{"title":"Structured Output"}',
      });
      expect(result.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "tool-call",
            toolCallId: "call_structured",
            toolName: "recipe",
            input: '{"title":"Structured Output"}',
          }),
        ]),
      );
      expect(result.finishReason).toBe("tool-calls");
    });

    it("extracts structured output from tool call content array entries", async () => {
      const schema = {
        type: "object",
        properties: {
          title: { type: "string" },
        },
      };

      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: [
                {
                  type: "tool_call",
                  id: "content_call",
                  name: "structured_tool",
                  arguments: { title: "From content" },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: {
          prompt_tokens: 4,
          completion_tokens: 6,
          total_tokens: 10,
        },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const prompt = buildPrompt("Return structured output via content part");
      const result = await model.doGenerate(
        createCallOptions(prompt, {
          responseFormat: {
            type: "json",
            schema,
          },
        }),
      );

      expect(result.content[0]).toEqual({
        type: "text",
        text: '{"title":"From content"}',
      });

      expect(result.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "tool-call",
            toolCallId: "content_call",
            toolName: "structured_tool",
            input: '{"title":"From content"}',
          }),
        ]),
      );
    });
  });

  describe("doStream", () => {
    it("emits stream-start, text deltas, and finish events", async () => {
      const fakeResponse = {} as Response;
      mockMakeHerokuRequest.mockResolvedValue(fakeResponse);

      const streamChunks = [
        { choices: [{ delta: { content: "Hello" } }] },
        {
          choices: [{ finish_reason: "stop" }],
          usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
        },
      ];

      mockProcessHerokuStream.mockReturnValue(
        new ReadableStream<Record<string, unknown>>({
          start(controller) {
            streamChunks.forEach((chunk) => controller.enqueue(chunk));
            controller.close();
          },
        }),
      );

      const prompt = buildPrompt("Hello?");
      const { stream } = await model.doStream(createCallOptions(prompt));

      const reader = stream.getReader();
      const events: LanguageModelV2StreamPart[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        events.push(value);
      }

      expect(events[0]).toEqual({ type: "stream-start", warnings: [] });
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "text-delta", delta: "Hello" }),
          expect.objectContaining({ type: "finish", finishReason: "stop" }),
        ]),
      );
    });
  });

  describe("tool choice mapping", () => {
    it("validates referenced tools", () => {
      const tools: ToolInput[] = [
        {
          type: "function",
          function: {
            name: "weather",
            description: "Get weather",
            parameters: { type: "object" },
          },
        },
      ];

      expect(() =>
        (
          model as unknown as {
            mapToolChoiceToHerokuFormat: (
              toolChoice: string,
              availableTools?: ToolInput[],
            ) => unknown;
          }
        ).mapToolChoiceToHerokuFormat("weather", tools),
      ).not.toThrow();

      expect(() =>
        (
          model as unknown as {
            mapToolChoiceToHerokuFormat: (
              toolChoice: string,
              availableTools?: ToolInput[],
            ) => unknown;
          }
        ).mapToolChoiceToHerokuFormat("missing", tools),
      ).toThrow(APICallError);
    });
  });
});
