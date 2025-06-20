import { HerokuChatLanguageModel } from "../../src/models/chat";
import {
  APICallError,
  LanguageModelV1Prompt,
  LanguageModelV1CallOptions,
} from "@ai-sdk/provider";
import { ToolInput, ToolChoiceInput } from "../../src/models/chat";
import * as apiClient from "../../src/utils/api-client";

// Mock the API client utilities
jest.mock("../../src/utils/api-client");
const mockMakeHerokuRequest = jest.mocked(apiClient.makeHerokuRequest);
const mockProcessHerokuStream = jest.mocked(apiClient.processHerokuStream);

// Helper to cast test prompts to the expected type
const asPrompt = (prompt: unknown): LanguageModelV1Prompt =>
  prompt as LanguageModelV1Prompt;

// Helper to create proper AI SDK call options
const createCallOptions = (
  prompt: LanguageModelV1Prompt,
  options: Partial<LanguageModelV1CallOptions> = {},
): LanguageModelV1CallOptions => ({
  inputFormat: "prompt" as const,
  mode: { type: "regular" as const, ...options.mode },
  prompt,
  ...options,
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

  describe("Constructor and Properties", () => {
    it("should initialize with correct properties", () => {
      expect(model.specificationVersion).toBe("v1");
      expect(model.provider).toBe("heroku");
      expect(model.modelId).toBe(testModel);
      expect(model.defaultObjectGenerationMode).toBe("json");
    });
  });

  describe("Prompt Handling", () => {
    describe("String prompts", () => {
      it("should convert string prompt to user message", async () => {
        const mockResponse = {
          choices: [{ message: { content: "Hello!" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        await model.doGenerate(createCallOptions(asPrompt("Hello, world!")));

        expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
          testBaseUrl,
          testApiKey,
          expect.objectContaining({
            messages: [{ role: "user", content: "Hello, world!" }],
          }),
          expect.objectContaining({
            maxRetries: 3,
            timeout: 30000,
          }),
        );
      });
    });

    describe("Array of messages", () => {
      it("should handle array of messages with different roles", async () => {
        const mockResponse = {
          choices: [
            { message: { content: "Response" }, finish_reason: "stop" },
          ],
          usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const prompt = [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "What is AI?" },
          {
            role: "assistant",
            content: "AI stands for Artificial Intelligence.",
          },
          { role: "user", content: "Tell me more." },
        ];

        await model.doGenerate(
          createCallOptions(prompt as unknown as LanguageModelV1Prompt),
        );

        expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
          testBaseUrl,
          testApiKey,
          expect.objectContaining({
            messages: [
              { role: "system", content: "You are a helpful assistant." },
              { role: "user", content: "What is AI?" },
              {
                role: "assistant",
                content: "AI stands for Artificial Intelligence.",
              },
              { role: "user", content: "Tell me more." },
            ],
          }),
          expect.objectContaining({
            maxRetries: 3,
            timeout: 30000,
          }),
        );
      });

      it("should handle multi-part content (text + images)", async () => {
        const mockResponse = {
          choices: [
            {
              message: { content: "I can see the image." },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 25, completion_tokens: 8, total_tokens: 33 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const prompt = [
          {
            role: "user",
            content: [
              { type: "text", text: "What do you see in this image?" },
              { type: "image", image: "base64-image-data" },
              { type: "text", text: "Please describe it." },
            ],
          },
        ];

        await model.doGenerate(createCallOptions(asPrompt(prompt)));

        expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
          testBaseUrl,
          testApiKey,
          expect.objectContaining({
            messages: [
              {
                role: "user",
                content: "What do you see in this image?\nPlease describe it.",
              },
            ],
          }),
          expect.objectContaining({
            maxRetries: 3,
            timeout: 30000,
          }),
        );
      });

      it("should handle object content with text property", async () => {
        const mockResponse = {
          choices: [
            { message: { content: "Response" }, finish_reason: "stop" },
          ],
          usage: { prompt_tokens: 15, completion_tokens: 5, total_tokens: 20 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const prompt = [
          {
            role: "user",
            content: { text: "Hello from object content" },
          },
        ] as const;

        await model.doGenerate(createCallOptions(asPrompt(prompt)));

        expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
          testBaseUrl,
          testApiKey,
          expect.objectContaining({
            messages: [{ role: "user", content: "Hello from object content" }],
          }),
          expect.objectContaining({
            maxRetries: 3,
            timeout: 30000,
          }),
        );
      });
    });

    describe("Validation", () => {
      it("should throw error for invalid message role", async () => {
        const prompt = [{ role: "invalid", content: "Test message" }];

        await expect(
          model.doGenerate(createCallOptions(asPrompt(prompt))),
        ).rejects.toThrow(APICallError);
        await expect(
          model.doGenerate(createCallOptions(asPrompt(prompt))),
        ).rejects.toThrow("Invalid message role: invalid");
      });

      it("should throw error for empty content", async () => {
        const prompt = [{ role: "user", content: "" }];

        await expect(
          model.doGenerate(createCallOptions(asPrompt(prompt))),
        ).rejects.toThrow(APICallError);
        await expect(
          model.doGenerate(createCallOptions(asPrompt(prompt))),
        ).rejects.toThrow("Message content cannot be empty");
      });

      it("should throw error for whitespace-only content", async () => {
        const prompt = [{ role: "user", content: "   \n\t   " }] as const;

        await expect(
          model.doGenerate(createCallOptions(asPrompt(prompt))),
        ).rejects.toThrow(APICallError);
        await expect(
          model.doGenerate(createCallOptions(asPrompt(prompt))),
        ).rejects.toThrow("Message content cannot be empty");
      });
    });
  });

  describe("Tool Handling", () => {
    it("should convert AI SDK tools to Heroku format", async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: "I can help with that." },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const tools: ToolInput[] = [
        {
          type: "function",
          name: "get_weather",
          description: "Get current weather for a location",
          parameters: {
            type: "object",
            properties: {
              location: { type: "string", description: "City name" },
            },
            required: ["location"],
          },
        },
      ];

      await model.doGenerate(
        createCallOptions(asPrompt("What is the weather?"), {
          mode: {
            type: "regular",
            tools,
            toolChoice: { type: "auto" },
          },
        }),
      );

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          tools: [
            {
              type: "function",
              function: {
                name: "get_weather",
                description: "Get current weather for a location",
                parameters: {
                  type: "object",
                  properties: {
                    location: { type: "string", description: "City name" },
                  },
                  required: ["location"],
                },
              },
            },
          ],
          tool_choice: "auto",
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 30000,
        }),
      );
    });

    it("should handle nested function format (OpenAI-style) tools", async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: "I can help with that." },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const tools: ToolInput[] = [
        {
          type: "function",
          name: "get_weather",
          description: "Get current weather for a location",
          parameters: {
            type: "object",
            properties: {
              location: { type: "string", description: "City name" },
            },
            required: ["location"],
          },
        },
      ];

      await model.doGenerate(
        createCallOptions(asPrompt("What is the weather?"), {
          mode: {
            type: "regular",
            tools: tools as ToolInput[],
            toolChoice: { type: "auto" },
          },
        }),
      );

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          tools: [
            {
              type: "function",
              function: {
                name: "get_weather",
                description: "Get current weather for a location",
                parameters: {
                  type: "object",
                  properties: {
                    location: { type: "string", description: "City name" },
                  },
                  required: ["location"],
                },
              },
            },
          ],
          tool_choice: "auto",
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 30000,
        }),
      );
    });

    it("should handle tools without parameters", async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: "I can help with that." },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const tools: ToolInput[] = [
        {
          type: "function",
          name: "get_current_time",
          description: "Get the current time",
          parameters: {},
        },
      ];

      await model.doGenerate(
        createCallOptions(asPrompt("What time is it?"), {
          mode: {
            type: "regular",
            tools: tools as ToolInput[],
          },
        }),
      );

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          tools: [
            {
              type: "function",
              function: {
                name: "get_current_time",
                description: "Get the current time",
                parameters: {},
              },
            },
          ],
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 30000,
        }),
      );
    });

    it("should filter out $schema property from tool parameters", async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: "I can help with that." },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const tools: ToolInput[] = [
        {
          type: "function",
          name: "get_weather",
          description: "Get current weather for a location",
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#", // This should be filtered out
            type: "object",
            properties: {
              location: { type: "string", description: "City name" },
            },
            required: ["location"],
          },
        },
      ];

      await model.doGenerate(
        createCallOptions(asPrompt("What is the weather?"), {
          mode: {
            type: "regular",
            tools: tools as ToolInput[],
          },
        }),
      );

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          tools: [
            {
              type: "function",
              function: {
                name: "get_weather",
                description: "Get current weather for a location",
                parameters: {
                  // Note: $schema should NOT be present here
                  type: "object",
                  properties: {
                    location: { type: "string", description: "City name" },
                  },
                  required: ["location"],
                },
              },
            },
          ],
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 30000,
        }),
      );

      // Verify that $schema was actually filtered out
      const call = mockMakeHerokuRequest.mock.calls[0];
      const requestBody = call[2] as Record<string, unknown>;
      const requestTools = requestBody.tools as Array<{
        type: string;
        function: {
          name: string;
          description: string;
          parameters: Record<string, unknown>;
        };
      }>;
      const toolParameters = requestTools[0].function.parameters;
      expect(toolParameters).not.toHaveProperty("$schema");
    });

    it("should validate tool definitions with proper error messages", async () => {
      const invalidTools = [
        { type: "function", name: "test_tool" }, // Missing description
        { description: "A tool without name" }, // Missing name
      ];

      await expect(
        model.doGenerate(
          createCallOptions(asPrompt("Test"), {
            mode: {
              type: "regular",
              tools: invalidTools as unknown as ToolInput[],
            },
          }),
        ),
      ).rejects.toThrow(
        "Tool at index 0: Tool must have a non-empty description",
      );
    });

    it("should validate tool names are valid function names", async () => {
      const invalidTools = [
        {
          name: "invalid-tool-name", // Contains hyphens
          description: "A tool with invalid name",
        },
      ];

      await expect(
        model.doGenerate(
          createCallOptions(asPrompt("Test"), {
            mode: {
              type: "regular",
              tools: invalidTools as unknown as ToolInput[],
            },
          }),
        ),
      ).rejects.toThrow("Tool name 'invalid-tool-name' is invalid");
    });

    it("should handle empty tool name or description", async () => {
      const invalidTools = [
        {
          name: "",
          description: "Valid description",
        },
      ];

      await expect(
        model.doGenerate(
          createCallOptions(asPrompt("Test"), {
            mode: {
              type: "regular",
              tools: invalidTools as unknown as ToolInput[],
            },
          }),
        ),
      ).rejects.toThrow("Tool at index 0: Tool must have a non-empty name");
    });

    it("should handle invalid nested function structure", async () => {
      const invalidTools = [
        {
          type: "function",
          function: "not an object", // Should be an object
        },
      ];

      await expect(
        model.doGenerate(
          createCallOptions(asPrompt("Test"), {
            mode: {
              type: "regular",
              tools: invalidTools as unknown as ToolInput[],
            },
          }),
        ),
      ).rejects.toThrow("Tool at index 0: Invalid function object structure");
    });

    it("should handle invalid tool format", async () => {
      const invalidTools = [
        "not an object", // Should be an object
      ];

      await expect(
        model.doGenerate(
          createCallOptions(asPrompt("Test"), {
            mode: {
              type: "regular",
              tools: invalidTools as unknown as ToolInput[],
            },
          }),
        ),
      ).rejects.toThrow("Tool at index 0: Invalid tool format");
    });

    it("should trim whitespace from tool names and descriptions", async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: "I can help with that." },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const tools: ToolInput[] = [
        {
          type: "function",
          name: "  get_weather  ",
          description: "  Get current weather for a location  ",
          parameters: {},
        },
      ];

      await model.doGenerate(
        createCallOptions(asPrompt("What is the weather?"), {
          mode: {
            type: "regular",
            tools: tools as ToolInput[],
          },
        }),
      );

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          tools: [
            {
              type: "function",
              function: {
                name: "get_weather",
                description: "Get current weather for a location",
                parameters: {},
              },
            },
          ],
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 30000,
        }),
      );
    });

    it("should extract tool calls from response", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call_123",
                  function: {
                    name: "get_weather",
                    arguments: '{"location": "New York"}',
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: { prompt_tokens: 25, completion_tokens: 15, total_tokens: 40 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const result = await model.doGenerate(
        createCallOptions(asPrompt("What is the weather in New York?")),
      );

      expect(result.toolCalls).toEqual([
        {
          toolCallId: "call_123",
          toolCallType: "function",
          toolName: "get_weather",
          args: '{"location":"New York"}',
        },
      ]);
    });

    it("should handle malformed tool call arguments", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call_123",
                  function: {
                    name: "get_weather",
                    arguments: "invalid json",
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: { prompt_tokens: 25, completion_tokens: 15, total_tokens: 40 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      // Should not throw, but log warning and use empty object
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await model.doGenerate(
        createCallOptions(asPrompt("Test")),
      );

      expect(result.toolCalls).toEqual([
        {
          toolCallId: "call_123",
          toolCallType: "function",
          toolName: "get_weather",
          args: "{}",
        },
      ]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Tool call at index 0: Failed to parse function arguments as JSON:",
        "invalid json",
        "Error:",
        "JSON parsing failed: Text: invalid json.\nError message: Unexpected token 'i', \"invalid json\" is not valid JSON",
      );

      consoleSpy.mockRestore();
    });

    describe("Tool Choice Handling", () => {
      it("should handle 'auto' tool choice", async () => {
        const mockResponse = {
          choices: [
            {
              message: { content: "I can help with that." },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const tools: ToolInput[] = [
          {
            type: "function",
            name: "get_weather",
            description: "Get current weather for a location",
            parameters: { type: "object" },
          },
        ];

        await model.doGenerate(
          createCallOptions(asPrompt("What is the weather?"), {
            mode: {
              type: "regular",
              tools,
              toolChoice: { type: "auto" },
            },
          }),
        );

        expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
          testBaseUrl,
          testApiKey,
          expect.objectContaining({
            tool_choice: "auto",
          }),
          expect.objectContaining({
            maxRetries: 3,
            timeout: 30000,
          }),
        );
      });

      it("should handle 'none' tool choice", async () => {
        const mockResponse = {
          choices: [
            {
              message: { content: "I can help with that." },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const tools: ToolInput[] = [
          {
            type: "function",
            name: "get_weather",
            description: "Get current weather for a location",
            parameters: { type: "object" },
          },
        ];

        await model.doGenerate(
          createCallOptions(asPrompt("What is the weather?"), {
            mode: {
              type: "regular",
              tools,
              toolChoice: { type: "none" },
            },
          }),
        );

        expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
          testBaseUrl,
          testApiKey,
          expect.objectContaining({
            tool_choice: "none",
          }),
          expect.objectContaining({
            maxRetries: 3,
            timeout: 30000,
          }),
        );
      });

      it("should handle 'required' tool choice (mapped to 'auto')", async () => {
        const mockResponse = {
          choices: [
            {
              message: { content: "I can help with that." },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const tools: ToolInput[] = [
          {
            type: "function",
            name: "get_weather",
            description: "Get current weather for a location",
            parameters: { type: "object" },
          },
        ];

        await model.doGenerate(
          createCallOptions(asPrompt("What is the weather?"), {
            mode: {
              type: "regular",
              tools,
              toolChoice: { type: "required" },
            },
          }),
        );

        expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
          testBaseUrl,
          testApiKey,
          expect.objectContaining({
            tool_choice: "auto",
          }),
          expect.objectContaining({
            maxRetries: 3,
            timeout: 30000,
          }),
        );
      });

      it("should handle function object tool choice", async () => {
        const mockResponse = {
          choices: [
            {
              message: { content: "I can help with that." },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const tools: ToolInput[] = [
          {
            type: "function",
            name: "get_weather",
            description: "Get current weather for a location",
            parameters: { type: "object" },
          },
        ];

        await model.doGenerate(
          createCallOptions(asPrompt("What is the weather?"), {
            mode: {
              type: "regular",
              tools,
              toolChoice: {
                type: "tool",
                toolName: "get_weather",
              },
            },
          }),
        );

        expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
          testBaseUrl,
          testApiKey,
          expect.objectContaining({
            tool_choice: {
              type: "function",
              function: { name: "get_weather" },
            },
          }),
          expect.objectContaining({
            maxRetries: 3,
            timeout: 30000,
          }),
        );
      });

      it("should handle shorthand function object tool choice", async () => {
        const mockResponse = {
          choices: [
            {
              message: { content: "I can help with that." },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const tools: ToolInput[] = [
          {
            type: "function",
            name: "get_weather",
            description: "Get current weather for a location",
            parameters: { type: "object" },
          },
        ];

        await model.doGenerate(
          createCallOptions(asPrompt("What is the weather?"), {
            mode: {
              type: "regular",
              tools,
              toolChoice: {
                type: "tool",
                toolName: "get_weather",
              },
            },
          }),
        );

        expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
          testBaseUrl,
          testApiKey,
          expect.objectContaining({
            tool_choice: {
              type: "function",
              function: { name: "get_weather" },
            },
          }),
          expect.objectContaining({
            maxRetries: 3,
            timeout: 30000,
          }),
        );
      });

      it("should handle string tool name choice", async () => {
        const mockResponse = {
          choices: [
            {
              message: { content: "I can help with that." },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const tools: ToolInput[] = [
          {
            type: "function",
            name: "get_weather",
            description: "Get current weather for a location",
            parameters: { type: "object" },
          },
        ];

        await model.doGenerate(
          createCallOptions(asPrompt("What is the weather?"), {
            mode: {
              type: "regular",
              tools,
              toolChoice: { type: "tool", toolName: "get_weather" },
            },
          }),
        );

        expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
          testBaseUrl,
          testApiKey,
          expect.objectContaining({
            tool_choice: {
              type: "function",
              function: { name: "get_weather" },
            },
          }),
          expect.objectContaining({
            maxRetries: 3,
            timeout: 30000,
          }),
        );
      });

      it("should validate tool choice references existing tool", async () => {
        const tools: ToolInput[] = [
          {
            type: "function",
            name: "get_weather",
            description: "Get current weather for a location",
            parameters: { type: "object" },
          },
        ];

        await expect(
          model.doGenerate(
            createCallOptions(asPrompt("What is the weather?"), {
              mode: {
                type: "regular",
                tools,
                toolChoice: {
                  type: "tool",
                  toolName: "non_existent_tool",
                },
              },
            }),
          ),
        ).rejects.toThrow(
          "Tool choice references non-existent tool: 'non_existent_tool'",
        );
      });

      it("should reject invalid tool choice type", async () => {
        const tools: ToolInput[] = [
          {
            type: "function",
            name: "get_weather",
            description: "Get current weather for a location",
            parameters: { type: "object" },
          },
        ];

        await expect(
          model.doGenerate(
            createCallOptions(asPrompt("What is the weather?"), {
              mode: {
                type: "regular",
                tools,
                toolChoice: {
                  type: "invalid_type",
                  function: { name: "get_weather" },
                } as unknown as ToolChoiceInput,
              },
            }),
          ),
        ).rejects.toThrow("Unsupported tool choice type: 'invalid_type'");
      });

      it("should reject tool choice function without name", async () => {
        const tools: ToolInput[] = [
          {
            type: "function",
            name: "get_weather",
            description: "Get current weather for a location",
            parameters: { type: "object" },
          },
        ];

        await expect(
          model.doGenerate(
            createCallOptions(asPrompt("What is the weather?"), {
              mode: {
                type: "regular",
                tools,
                toolChoice: {
                  type: "tool",
                  toolName: "",
                },
              },
            }),
          ),
        ).rejects.toThrow("Tool choice must have a toolName");
      });

      it("should reject invalid tool name format in string choice", async () => {
        const tools: ToolInput[] = [
          {
            type: "function",
            name: "get_weather",
            description: "Get current weather for a location",
            parameters: { type: "object" },
          },
        ];

        await expect(
          model.doGenerate(
            createCallOptions(asPrompt("What is the weather?"), {
              mode: {
                type: "regular",
                tools,
                toolChoice: { type: "tool", toolName: "invalid-tool-name" },
              },
            }),
          ),
        ).rejects.toThrow(
          "Tool choice references non-existent tool: 'invalid-tool-name'",
        );
      });

      it("should reject completely invalid tool choice format", async () => {
        const tools: ToolInput[] = [
          {
            type: "function",
            name: "get_weather",
            description: "Get current weather for a location",
            parameters: { type: "object" },
          },
        ];

        await expect(
          model.doGenerate(
            createCallOptions(asPrompt("What is the weather?"), {
              mode: {
                type: "regular",
                tools,
                toolChoice: 123 as unknown as ToolChoiceInput,
              },
            }),
          ),
        ).rejects.toThrow("Invalid tool choice format");
      });
    });

    describe("Enhanced Tool Call Extraction", () => {
      it("should handle valid tool calls with string arguments", async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_123",
                    type: "function",
                    function: {
                      name: "get_weather",
                      arguments: '{"location": "New York", "unit": "celsius"}',
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 25, completion_tokens: 15, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const result = await model.doGenerate(
          createCallOptions(asPrompt("What is the weather in New York?")),
        );

        expect(result.toolCalls).toEqual([
          {
            toolCallId: "call_123",
            toolCallType: "function",
            toolName: "get_weather",
            args: '{"location":"New York","unit":"celsius"}',
          },
        ]);
      });

      it("should handle tool calls with object arguments (already parsed)", async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_456",
                    type: "function",
                    function: {
                      name: "calculate",
                      arguments: { operation: "add", numbers: [1, 2, 3] },
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 25, completion_tokens: 15, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const result = await model.doGenerate(
          createCallOptions(asPrompt("Calculate the sum")),
        );

        expect(result.toolCalls).toEqual([
          {
            toolCallId: "call_456",
            toolCallType: "function",
            toolName: "calculate",
            args: '{"operation":"add","numbers":[1,2,3]}',
          },
        ]);
      });

      it("should handle tool calls with empty string arguments", async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_789",
                    type: "function",
                    function: {
                      name: "get_time",
                      arguments: "",
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 25, completion_tokens: 15, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const result = await model.doGenerate(
          createCallOptions(asPrompt("What time is it?")),
        );

        expect(result.toolCalls).toEqual([
          {
            toolCallId: "call_789",
            toolCallType: "function",
            toolName: "get_time",
            args: "{}",
          },
        ]);
      });

      it("should handle tool calls without arguments property", async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_000",
                    type: "function",
                    function: {
                      name: "ping",
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 25, completion_tokens: 15, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const result = await model.doGenerate(
          createCallOptions(asPrompt("Ping the server")),
        );

        expect(result.toolCalls).toEqual([
          {
            toolCallId: "call_000",
            toolCallType: "function",
            toolName: "ping",
            args: "{}",
          },
        ]);
      });

      it("should handle malformed JSON arguments gracefully", async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_bad",
                    type: "function",
                    function: {
                      name: "broken_tool",
                      arguments: '{"invalid": json}',
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 25, completion_tokens: 15, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

        const result = await model.doGenerate(
          createCallOptions(asPrompt("Test broken tool")),
        );

        expect(result.toolCalls).toEqual([
          {
            toolCallId: "call_bad",
            toolCallType: "function",
            toolName: "broken_tool",
            args: "{}",
          },
        ]);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Failed to parse function arguments as JSON"),
          '{"invalid": json}',
          "Error:",
          expect.stringContaining(
            'JSON parsing failed: Text: {"invalid": json}',
          ),
        );

        consoleSpy.mockRestore();
      });

      it("should handle tool calls with missing function object", async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_no_func",
                    type: "function",
                    // Missing function object
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 25, completion_tokens: 15, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

        const result = await model.doGenerate(
          createCallOptions(asPrompt("Test missing function")),
        );

        expect(result.toolCalls).toEqual([
          {
            toolCallId: "call_no_func",
            toolCallType: "function",
            toolName: "",
            args: "{}",
          },
        ]);

        expect(consoleSpy).toHaveBeenCalledWith(
          "Tool call at index 0: Missing or invalid function object, expected object, got",
          "undefined",
        );

        consoleSpy.mockRestore();
      });

      it("should handle tool calls with missing ID", async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    // Missing id
                    type: "function",
                    function: {
                      name: "test_tool",
                      arguments: "{}",
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 25, completion_tokens: 15, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

        const result = await model.doGenerate(
          createCallOptions(asPrompt("Test missing ID")),
        );

        expect(result.toolCalls).toEqual([
          {
            toolCallId: "",
            toolCallType: "function",
            toolName: "test_tool",
            args: "{}",
          },
        ]);

        expect(consoleSpy).toHaveBeenCalledWith(
          "Tool call at index 0: Missing or invalid ID, expected string, got",
          "undefined",
        );

        consoleSpy.mockRestore();
      });

      it("should handle non-array tool_calls", async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: null,
                tool_calls: "not an array",
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 25, completion_tokens: 15, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

        const result = await model.doGenerate(
          createCallOptions(asPrompt("Test invalid tool_calls")),
        );

        expect(result.toolCalls).toBeUndefined();

        expect(consoleSpy).toHaveBeenCalledWith(
          "Invalid tool_calls format: expected array, got",
          "string",
        );

        consoleSpy.mockRestore();
      });

      it("should filter out completely invalid tool calls", async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_valid",
                    type: "function",
                    function: {
                      name: "valid_tool",
                      arguments: "{}",
                    },
                  },
                  {
                    // Completely invalid - no ID or function name
                    type: "function",
                    function: {},
                  },
                  "not an object",
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 25, completion_tokens: 15, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

        const result = await model.doGenerate(
          createCallOptions(asPrompt("Test mixed valid/invalid tool calls")),
        );

        // Should only return the valid tool call
        expect(result.toolCalls).toEqual([
          {
            toolCallId: "call_valid",
            toolCallType: "function",
            toolName: "valid_tool",
            args: "{}",
          },
        ]);

        expect(consoleSpy).toHaveBeenCalledWith(
          "Tool call at index 2: Invalid format, expected object, got",
          "string",
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          "Filtering out invalid tool call with no ID or name",
        );

        consoleSpy.mockRestore();
      });

      it("should handle multiple valid tool calls", async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_1",
                    type: "function",
                    function: {
                      name: "get_weather",
                      arguments: '{"location": "New York"}',
                    },
                  },
                  {
                    id: "call_2",
                    type: "function",
                    function: {
                      name: "get_time",
                      arguments: '{"timezone": "EST"}',
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 25, completion_tokens: 15, total_tokens: 40 },
        };
        mockMakeHerokuRequest.mockResolvedValue(mockResponse);

        const result = await model.doGenerate(
          createCallOptions(asPrompt("Get weather and time")),
        );

        expect(result.toolCalls).toEqual([
          {
            toolCallId: "call_1",
            toolCallType: "function",
            toolName: "get_weather",
            args: '{"location":"New York"}',
          },
          {
            toolCallId: "call_2",
            toolCallType: "function",
            toolName: "get_time",
            args: '{"timezone":"EST"}',
          },
        ]);
      });
    });
  });

  describe("Error Handling", () => {
    it("should throw APICallError for network errors", async () => {
      const networkError = new Error("Network timeout");
      mockMakeHerokuRequest.mockRejectedValue(networkError);

      await expect(
        model.doGenerate(createCallOptions(asPrompt("Test"))),
      ).rejects.toThrow(APICallError);
    });

    it("should throw APICallError for missing choices in response", async () => {
      const invalidResponse = { usage: { prompt_tokens: 10 } }; // No choices
      mockMakeHerokuRequest.mockResolvedValue(invalidResponse);

      await expect(
        model.doGenerate(createCallOptions(asPrompt("Test"))),
      ).rejects.toThrow(APICallError);
      await expect(
        model.doGenerate(createCallOptions(asPrompt("Test"))),
      ).rejects.toThrow("No choices in response");
    });

    it("should throw APICallError for empty choices array", async () => {
      const invalidResponse = { choices: [], usage: { prompt_tokens: 10 } };
      mockMakeHerokuRequest.mockResolvedValue(invalidResponse);

      await expect(
        model.doGenerate(createCallOptions(asPrompt("Test"))),
      ).rejects.toThrow(APICallError);
      await expect(
        model.doGenerate(createCallOptions(asPrompt("Test"))),
      ).rejects.toThrow("No choices in response");
    });
  });

  describe("Response Mapping", () => {
    it("should map response correctly with all fields", async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: "Hello, world!" },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        headers: { "x-request-id": "req_123" },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const result = await model.doGenerate(
        createCallOptions(asPrompt("Test")),
      );

      expect(result).toEqual({
        text: "Hello, world!",
        toolCalls: undefined,
        usage: {
          promptTokens: 10,
          completionTokens: 5,
        },
        finishReason: "stop",
        rawCall: { rawPrompt: "Test", rawSettings: {} },
      });
    });

    it("should handle missing usage data with defaults", async () => {
      const mockResponse = {
        choices: [{ message: { content: "Test" }, finish_reason: "stop" }],
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const result = await model.doGenerate(
        createCallOptions(asPrompt("Test")),
      );

      expect(result.usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
      });
      expect(result.finishReason).toBe("stop");
    });

    it("should handle tool role messages correctly", async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: "Based on the tool results, the answer is 4." },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 15, total_tokens: 65 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      // Simulate a multi-step conversation with tool results
      const prompt = [
        { role: "user", content: "Calculate 2 + 2" },
        { role: "assistant", content: "I'll calculate that for you." },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "call_123",
              toolName: "calculate",
              result: { expression: "2 + 2", answer: 4 },
            },
          ],
        },
      ];

      await model.doGenerate(createCallOptions(asPrompt(prompt)));

      // Verify the request was made
      expect(mockMakeHerokuRequest).toHaveBeenCalledTimes(1);
      const call = mockMakeHerokuRequest.mock.calls[0];
      const requestBody = call[2] as Record<string, unknown>;
      const messages = requestBody.messages as Array<{
        role: string;
        content: string;
      }>;

      // Tool message should be converted to user message
      expect(messages).toHaveLength(3);
      expect(messages[2].role).toBe("user");
      expect(messages[2].content).toContain('Tool "calculate" returned:');
      expect(messages[2].content).toContain('"answer": 4');
    });
  });

  describe("Streaming", () => {
    it("should handle streaming responses", async () => {
      const mockStreamChunks = [
        { choices: [{ delta: { content: "Hello" } }] },
        { choices: [{ delta: { content: " world" } }] },
        { choices: [{ finish_reason: "stop" }] },
      ];

      const mockStream = new ReadableStream({
        start(controller) {
          mockStreamChunks.forEach((chunk) => controller.enqueue(chunk));
          controller.close();
        },
      });

      mockProcessHerokuStream.mockReturnValue(mockStream);
      mockMakeHerokuRequest.mockResolvedValue(new Response());

      const result = await model.doStream(
        createCallOptions(asPrompt("Test streaming")) as Parameters<
          typeof model.doStream
        >[0],
      );

      expect(result.stream).toBeDefined();
      expect(result.rawCall).toBeDefined();
    });

    it("should handle tool call streaming", async () => {
      const mockStreamChunks = [
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: "call_123",
                    function: { name: "get_weather" },
                  },
                ],
              },
            },
          ],
        },
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: "call_123",
                    function: { arguments: '{"location":' },
                  },
                ],
              },
            },
          ],
        },
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: "call_123",
                    function: { arguments: '"New York"}' },
                  },
                ],
              },
            },
          ],
        },
        {
          choices: [
            {
              finish_reason: "tool_calls",
            },
          ],
        },
      ];

      const mockStream = new ReadableStream({
        start(controller) {
          mockStreamChunks.forEach((chunk) => controller.enqueue(chunk));
          controller.close();
        },
      });

      mockProcessHerokuStream.mockReturnValue(mockStream);
      mockMakeHerokuRequest.mockResolvedValue(new Response());

      const result = await model.doStream(
        createCallOptions(asPrompt("Test tool streaming")) as Parameters<
          typeof model.doStream
        >[0],
      );

      // Test that the stream processes tool call deltas correctly
      const reader = result.stream.getReader();
      const chunks: unknown[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      // Should have processed the tool call chunks
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should handle streaming errors", async () => {
      const streamError = new Error("Stream error");
      mockMakeHerokuRequest.mockRejectedValue(streamError);

      await expect(
        model.doStream(
          createCallOptions(asPrompt("Test")) as Parameters<
            typeof model.doStream
          >[0],
        ),
      ).rejects.toThrow(APICallError);
    });
  });

  describe("Options Mapping", () => {
    it("should map all supported options correctly", async () => {
      const mockResponse = {
        choices: [{ message: { content: "Response" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      await model.doGenerate(
        createCallOptions(asPrompt("Test"), {
          temperature: 0.7,
          maxTokens: 100,
          topP: 0.9,
          stopSequences: ["STOP", "END"],
        }),
      );

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          model: testModel,
          temperature: 0.7,
          max_tokens: 100,
          top_p: 0.9,
          stop: ["STOP", "END"],
          stream: false,
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 30000,
        }),
      );
    });

    it("should handle undefined options gracefully", async () => {
      const mockResponse = {
        choices: [{ message: { content: "Response" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      await model.doGenerate(createCallOptions(asPrompt("Test")));

      expect(mockMakeHerokuRequest).toHaveBeenCalledWith(
        testBaseUrl,
        testApiKey,
        expect.objectContaining({
          model: testModel,
          temperature: undefined,
          max_tokens: undefined,
          top_p: undefined,
          stop: undefined,
          stream: false,
        }),
        expect.objectContaining({
          maxRetries: 3,
          timeout: 30000,
        }),
      );
    });
  });

  describe("Enhanced Method Validation", () => {
    it("should validate missing prompt in doGenerate", async () => {
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model.doGenerate({} as any),
      ).rejects.toThrow("Missing required prompt in options");
    });

    it("should validate missing prompt in doStream", async () => {
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model.doStream({} as any),
      ).rejects.toThrow("Missing required prompt in options");
    });

    it("should validate empty tools array in doGenerate", async () => {
      await expect(
        model.doGenerate(
          createCallOptions(asPrompt("Test prompt"), {
            mode: {
              type: "regular",
              tools: [],
            },
          }),
        ),
      ).rejects.toThrow("Tools must be a non-empty array when provided");
    });

    it("should validate empty tools array in doStream", async () => {
      await expect(
        model.doStream(
          createCallOptions(asPrompt("Test prompt"), {
            mode: {
              type: "regular",
              tools: [],
            },
          }) as Parameters<typeof model.doStream>[0],
        ),
      ).rejects.toThrow("Tools must be a non-empty array when provided");
    });

    it("should warn when tool choice provided without tools in doGenerate", async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: "Response without tools" },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await model.doGenerate(
        createCallOptions(asPrompt("Test prompt"), {
          mode: {
            type: "regular",
            toolChoice: { type: "auto" },
          },
        }),
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Tool choice provided without tools - ignoring tool choice",
      );

      consoleSpy.mockRestore();
    });

    it("should warn when tool choice provided without tools in doStream", async () => {
      const mockResponse = new Response("data: {}\n\n", {
        headers: { "content-type": "text/event-stream" },
      });
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await model.doStream(
        createCallOptions(asPrompt("Test prompt"), {
          mode: {
            type: "regular",
            toolChoice: { type: "auto" },
          },
        }) as Parameters<typeof model.doStream>[0],
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Tool choice provided without tools - ignoring tool choice",
      );

      consoleSpy.mockRestore();
    });

    it("should handle tool mapping errors in doGenerate", async () => {
      const invalidTools = [
        {
          // Missing required name field
          description: "Invalid tool",
          parameters: {},
        },
      ];

      await expect(
        model.doGenerate(
          createCallOptions(asPrompt("Test prompt"), {
            mode: {
              type: "regular",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tools: invalidTools as any,
            },
          }),
        ),
      ).rejects.toThrow(
        "Tool at index 0: Invalid tool format. Expected object with 'name' and 'description' properties or nested function object",
      );
    });

    it("should handle response parsing errors in doGenerate", async () => {
      // Mock a malformed response that will cause parsing to fail
      const malformedResponse = {
        // Missing choices array
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };
      mockMakeHerokuRequest.mockResolvedValue(malformedResponse);

      await expect(
        model.doGenerate(createCallOptions(asPrompt("Test prompt"))),
      ).rejects.toThrow("No choices in response");
    });

    it("should handle stream chunk processing errors gracefully", async () => {
      // Mock a response that will return malformed stream data
      const mockResponse = new Response("data: {invalid json}\n\n", {
        headers: { "content-type": "text/event-stream" },
      });
      mockMakeHerokuRequest.mockResolvedValue(mockResponse);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await model.doStream(
        createCallOptions(asPrompt("Test prompt")) as Parameters<
          typeof model.doStream
        >[0],
      );

      // Read from the stream to trigger chunk processing
      const reader = result.stream.getReader();
      try {
        await reader.read(); // This should trigger the error handling
      } catch {
        // Expected to potentially throw due to malformed chunk
      } finally {
        reader.releaseLock();
      }

      consoleSpy.mockRestore();
    });

    it("should handle network errors with enhanced context in doGenerate", async () => {
      const networkError = new Error("Network connection failed");
      mockMakeHerokuRequest.mockRejectedValue(networkError);

      await expect(
        model.doGenerate(createCallOptions(asPrompt("Test prompt"))),
      ).rejects.toThrow(
        "Failed to generate completion: Network connection failed",
      );
    });

    it("should handle network errors with enhanced context in doStream", async () => {
      const networkError = new Error("Network connection failed");
      mockMakeHerokuRequest.mockRejectedValue(networkError);

      await expect(
        model.doStream(
          createCallOptions(asPrompt("Test prompt")) as Parameters<
            typeof model.doStream
          >[0],
        ),
      ).rejects.toThrow(
        "Failed to stream completion: Network connection failed",
      );
    });
  });
});
