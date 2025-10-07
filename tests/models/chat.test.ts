import { HerokuChatLanguageModel, ToolInput } from "../../src/models/chat";
import {
  APICallError,
  LanguageModelV2CallOptions,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
  LanguageModelV2ToolCall,
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

    it("rejects an empty tools array", async () => {
      const prompt = buildPrompt("tool validation");

      await expect(
        model.doGenerate(
          createCallOptions(prompt, {
            tools: [] as ToolInput[],
          }),
        ),
      ).rejects.toThrow("Tools must be a non-empty array when provided");
      expect(mockMakeHerokuRequest).not.toHaveBeenCalled();
    });

    it("ignores tool choice when no tools are provided and logs a warning", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const mockResponse = {
        choices: [
          {
            message: { content: "All good" },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      };

      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const prompt = buildPrompt("please respond");
      await model.doGenerate(
        createCallOptions(prompt, {
          toolChoice: "auto",
        }),
      );

      expect(warnSpy).toHaveBeenCalledWith(
        "Tool choice provided without tools - ignoring tool choice",
      );

      const [, , requestBody] = mockMakeHerokuRequest.mock.calls[0];
      expect(requestBody.tool_choice).toBeUndefined();
      warnSpy.mockRestore();
    });

    it("wraps unexpected errors from the API client in APICallError", async () => {
      mockMakeHerokuRequest.mockRejectedValue(new Error("network down"));

      const prompt = buildPrompt("error please");

      await expect(model.doGenerate(createCallOptions(prompt))).rejects.toThrow(
        /Failed to generate completion: network down/,
      );
    });
  });

  describe("doStream", () => {
    it("throws when prompt is missing", async () => {
      await expect(
        model.doStream({} as LanguageModelV2CallOptions),
      ).rejects.toBeInstanceOf(APICallError);
    });

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
      const { stream } = await model.doStream(
        createCallOptions(prompt, {
          responseFormat: {
            type: "json",
            schema: { type: "object" },
          },
        }),
      );

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

  describe("internal helpers", () => {
    it.each([
      [
        "blank model",
        { modelValue: "", baseUrlValue: "https://valid.heroku.com" },
      ],
      [
        "whitespace model",
        { modelValue: "   ", baseUrlValue: "https://valid.heroku.com" },
      ],
      ["empty base URL", { modelValue: "claude-4-sonnet", baseUrlValue: "" }],
      [
        "whitespace base URL",
        { modelValue: "claude-4-sonnet", baseUrlValue: "   " },
      ],
      [
        "unsupported protocol",
        { modelValue: "claude-4-sonnet", baseUrlValue: "ftp://example.com" },
      ],
      [
        "invalid URL format",
        { modelValue: "claude-4-sonnet", baseUrlValue: "mock://bad-url" },
      ],
      [
        "unsupported model",
        {
          modelValue: "custom-model",
          baseUrlValue: "https://valid.heroku.com",
        },
      ],
    ])(
      "rejects invalid constructor input when %s",
      (label, { modelValue, baseUrlValue }) => {
        const helper = model as unknown as {
          validateConstructorParameters: (
            model: string,
            apiKey: string,
            baseUrl: string,
          ) => void;
        };

        const invokeValidation = () =>
          helper.validateConstructorParameters(
            modelValue,
            "test-api-key",
            baseUrlValue,
          );

        if (label === "invalid URL format") {
          const originalURL = globalThis.URL;
          const mockURL = jest.fn(() => {
            const error = new Error("Invalid URL");
            error.name = "TypeError";
            throw error;
          });

          // @ts-expect-error overriding global for test scenario
          globalThis.URL = mockURL;
          expect(invokeValidation).toThrow(APICallError);
          // @ts-expect-error restoring global URL constructor
          globalThis.URL = originalURL;
          return;
        }

        expect(invokeValidation).toThrow(APICallError);
      },
    );

    it("normalizes headers and filters out undefined values", () => {
      const helper = model as unknown as {
        normalizeHeaders: (
          headers?: Record<string, string | undefined>,
        ) => Record<string, string> | undefined;
      };

      expect(helper.normalizeHeaders(undefined)).toBeUndefined();
      expect(
        helper.normalizeHeaders({
          "X-Test": "value",
          "X-Empty": undefined,
        }),
      ).toEqual({ "X-Test": "value" });

      expect(helper.normalizeHeaders({ "X-Empty": undefined })).toBeUndefined();
    });

    it("prepares structured output config with sanitized schema and instruction", () => {
      const helper = model as unknown as {
        prepareStructuredOutputConfig: (
          responseFormat: LanguageModelV2CallOptions["responseFormat"],
        ) => Record<string, unknown> | undefined;
      };

      const config = helper.prepareStructuredOutputConfig({
        type: "json",
        name: "  Custom Tool  ",
        description: "Ensure the payload matches requirements",
        schema: {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          properties: {
            count: { type: "number" },
          },
        },
      });

      expect(config).toBeDefined();
      expect(config).toEqual(
        expect.objectContaining({
          toolName: "custom_tool",
          tool: expect.objectContaining({
            name: "custom_tool",
            inputSchema: expect.objectContaining({
              type: "object",
              properties: { count: { type: "number" } },
            }),
          }),
        }),
      );

      const instruction = (config as { systemInstruction: string })
        .systemInstruction;
      expect(instruction).toContain('"custom_tool" exactly once');
      expect(instruction).toContain('"count": {');
      expect(instruction).toContain('"type": "number"');

      expect(
        (
          config as {
            tool: { inputSchema: Record<string, unknown> };
          }
        ).tool.inputSchema,
      ).not.toHaveProperty("$schema");

      const fallback = helper.prepareStructuredOutputConfig({
        type: "json",
        name: "123-invalid",
      });
      expect(fallback).toBeDefined();
      expect(fallback).toEqual(
        expect.objectContaining({
          toolName: "deliver_structured_output",
        }),
      );
    });

    it("extracts tool calls from mixed response shapes and skips malformed entries", async () => {
      const helper = model as unknown as {
        extractToolCalls: (
          message: Record<string, unknown> | undefined,
        ) => Promise<LanguageModelV2ToolCall[] | undefined>;
      };

      const warnSpy = jest.spyOn(console, "warn").mockImplementation();

      const toolCalls = await helper.extractToolCalls({
        tool_calls: [
          {
            id: "direct_call",
            function: {
              name: "directTool",
              arguments: '{"foo":42}',
            },
          },
        ],
        content: [
          {
            type: "tool_call",
            id: "content_call",
            name: "contentTool",
            arguments: { bar: true },
          },
          {
            type: "tool_call",
            id: "missing_name",
            function: {
              arguments: '{"baz":false}',
            },
          },
        ],
      });

      expect(toolCalls).toEqual([
        {
          type: "tool-call",
          toolCallId: "direct_call",
          toolName: "directTool",
          input: '{"foo":42}',
        },
        {
          type: "tool-call",
          toolCallId: "content_call",
          toolName: "contentTool",
          input: '{"bar":true}',
        },
      ]);

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("maps streaming chunks with tool calls into structured stream parts", async () => {
      const helper = model as unknown as {
        mapChunkToStreamParts: (
          chunk: Record<string, unknown>,
        ) => Promise<LanguageModelV2StreamPart[]>;
      };

      (
        model as unknown as { currentStructuredOutputToolName: string | null }
      ).currentStructuredOutputToolName = "structured_tool";

      const parts = await helper.mapChunkToStreamParts({
        choices: [
          {
            delta: {
              content: "partial text",
              tool_calls: [
                {
                  index: 0,
                  id: "tool-123",
                  function: {
                    name: "structured_tool",
                    arguments: '{"foo":"bar"}',
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
            message: {
              tool_calls: [
                {
                  id: "tool-123",
                  function: {
                    name: "structured_tool",
                    arguments: '{"foo":"bar"}',
                  },
                },
              ],
            },
          },
        ],
        usage: {
          prompt_tokens: 2,
          completion_tokens: 3,
        },
      });

      expect(parts).toHaveLength(8);

      const initialStart = parts[0] as { type: string; id: string };
      expect(initialStart).toMatchObject({ type: "text-start" });

      const initialId = initialStart.id;
      expect(parts[1]).toEqual({
        type: "text-delta",
        id: initialId,
        delta: "partial text",
      });
      expect(parts[2]).toEqual({ type: "text-end", id: initialId });

      const structuredStart = parts[3] as { type: string; id: string };
      expect(structuredStart).toMatchObject({ type: "text-start" });
      const structuredId = structuredStart.id;
      expect(parts[4]).toEqual({
        type: "text-delta",
        id: structuredId,
        delta: '{"foo":"bar"}',
      });
      expect(parts[5]).toEqual({ type: "text-end", id: structuredId });

      expect(parts[6]).toEqual({
        type: "tool-call",
        toolCallId: "tool-123",
        toolName: "structured_tool",
        input: '{"foo":"bar"}',
      });

      expect(parts[7]).toEqual(
        expect.objectContaining({
          type: "finish",
          finishReason: "tool-calls",
          usage: expect.objectContaining({
            inputTokens: 2,
            outputTokens: 3,
            totalTokens: 5,
          }),
        }),
      );
    });

    it("maps string prompts to basic user messages", () => {
      const helper = model as unknown as {
        mapPromptToMessages: (
          prompt: LanguageModelV2Prompt | string,
        ) => Array<{ role: string; content: string | null }>;
      };

      const result = helper.mapPromptToMessages("just a string prompt");
      expect(result).toEqual([
        { role: "user", content: "just a string prompt" },
      ]);
    });

    it("maps system and tool conversations with proper defaults", () => {
      const helper = model as unknown as {
        mapPromptToMessages: (
          prompt: LanguageModelV2Prompt,
        ) => Array<Record<string, unknown>>;
      };

      const prompt: LanguageModelV2Prompt = [
        {
          role: "system",
          content: "  Follow the rules.  ",
        },
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call-1",
              toolName: "lookup",
              input: { query: "value" },
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "call-1",
              toolName: "lookup",
              result: { answer: 42 },
            },
          ],
        },
      ];

      const messages = helper.mapPromptToMessages(prompt);

      expect(messages).toHaveLength(3);
      expect(messages[0]).toEqual({
        role: "system",
        content: "Follow the rules.",
      });

      expect(messages[1]).toEqual({
        role: "assistant",
        content: "I'll help you with that.",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: {
              name: "lookup",
              arguments: '{"query":"value"}',
            },
          },
        ],
      });

      expect(messages[2]).toEqual({
        role: "tool",
        content: JSON.stringify({ answer: 42 }, null, 2),
        tool_call_id: "call-1",
      });
    });

    it("skips assistant messages without content but keeps tool calls", () => {
      const helper = model as unknown as {
        shouldSkipMessage: (item: unknown) => boolean;
      };

      expect(helper.shouldSkipMessage("not an object")).toBe(false);

      const emptyAssistant = {
        role: "assistant",
        content: [
          {
            type: "text",
            text: "   ",
          },
        ],
      };
      expect(helper.shouldSkipMessage(emptyAssistant)).toBe(true);

      const toolCallOnly = {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-2",
            toolName: "lookup",
          },
        ],
      };
      expect(helper.shouldSkipMessage(toolCallOnly)).toBe(false);
    });
  });
});
