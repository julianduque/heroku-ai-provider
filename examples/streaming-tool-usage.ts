import { streamText, tool, stepCountIs } from "ai";
import { heroku } from "../src/index";
import { z } from "zod";
import "dotenv/config";

// Mock functions for demonstration
async function getCurrentWeather(location: string) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const weatherData = {
    "New York": { temperature: 72, condition: "sunny", humidity: 65 },
    London: { temperature: 15, condition: "cloudy", humidity: 80 },
    Tokyo: { temperature: 25, condition: "rainy", humidity: 90 },
    Paris: { temperature: 18, condition: "partly cloudy", humidity: 72 },
  };

  return (
    weatherData[location as keyof typeof weatherData] || {
      temperature: 20,
      condition: "unknown",
      humidity: 70,
    }
  );
}

async function searchNews(query: string, limit: number = 3) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const mockNews = [
    `Breaking: ${query} leads to major technological breakthrough`,
    `Scientists discover new applications for ${query} in renewable energy`,
    `Industry experts discuss the future of ${query} technology`,
    `Local communities benefit from new ${query} initiatives`,
    `Research shows promising results for ${query} implementation`,
  ];

  return mockNews.slice(0, limit).map((headline, index) => ({
    id: index + 1,
    headline,
    source: `Tech News ${index + 1}`,
    publishedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
  }));
}

async function calculateWithSteps(expression: string) {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    // WARNING: eval is dangerous - use a proper math parser in production
    const result = eval(expression.replace(/[^0-9+\-*/.() ]/g, ""));
    return {
      expression,
      result,
      steps: [
        `Input: ${expression}`,
        `Parsed: ${expression.replace(/[^0-9+\-*/.() ]/g, "")}`,
        `Result: ${result}`,
      ],
    };
  } catch {
    return {
      expression,
      result: "Invalid expression",
      steps: [`Input: ${expression}`, "Error: Invalid mathematical expression"],
    };
  }
}

async function streamingToolUsageExample() {
  try {
    console.log("🌊🔧 Starting streaming tool usage example...\n");
    console.log("=".repeat(60));

    // Example 1: Basic streaming with weather tool
    console.log("\n📍 Example 1: Weather lookup with streaming response");
    console.log("-".repeat(50));
    console.log(
      'Query: "What\'s the weather like in New York and Tokyo and Paris?"',
    );
    console.log("Response: ");

    const weatherResult = await streamText({
      model: heroku.chat("claude-4-sonnet"),
      prompt: "What's the weather like in New York and Tokyo and Paris?",
      stopWhen: stepCountIs(5),
      tools: {
        getWeather: tool({
          description: "Get the current weather for a specific city",
          inputSchema: z.object({
            location: z
              .string()
              .describe('The city name (e.g., "New York", "Tokyo")'),
          }),
          execute: async ({ location }) => {
            console.log(`\n🌤️  [TOOL] Looking up weather for ${location}...`);
            const weather = await getCurrentWeather(location);
            console.log(`✅ [TOOL] Weather data retrieved for ${location}`);
            return weather;
          },
        }),
      },
    });

    for await (const delta of weatherResult.textStream) {
      process.stdout.write(delta);
    }

    console.log("\n\n" + "=".repeat(60));

    // Example 2: Multiple tools with streaming
    console.log("\n🔍 Example 2: News search + calculation with streaming");
    console.log("-".repeat(50));
    console.log('Query: "Search for AI news and calculate 125 * 8 + 45"');
    console.log("Response: ");

    const multiToolResult = await streamText({
      model: heroku.chat("claude-4-sonnet"),
      prompt:
        'Search for recent news about "artificial intelligence" and also calculate 125 * 8 + 45 for me',
      stopWhen: stepCountIs(6),
      tools: {
        searchNews: tool({
          description: "Search for recent news articles on a specific topic",
          inputSchema: z.object({
            query: z.string().describe("The search topic or keyword"),
            limit: z
              .number()
              .optional()
              .describe("Number of articles to return (default: 3)"),
          }),
          execute: async ({ query, limit = 3 }) => {
            console.log(`\n📰 [TOOL] Searching news for "${query}"...`);
            const news = await searchNews(query, limit);
            console.log(`✅ [TOOL] Found ${news.length} news articles`);
            return news;
          },
        }),
        calculate: tool({
          description:
            "Perform mathematical calculations with step-by-step breakdown",
          inputSchema: z.object({
            expression: z
              .string()
              .describe("The mathematical expression to calculate"),
          }),
          execute: async ({ expression }) => {
            console.log(`\n🧮 [TOOL] Calculating "${expression}"...`);
            const result = await calculateWithSteps(expression);
            console.log(`✅ [TOOL] Calculation complete: ${result.result}`);
            return result;
          },
        }),
      },
    });

    for await (const delta of multiToolResult.textStream) {
      process.stdout.write(delta);
    }

    console.log("\n\n" + "=".repeat(60));

    // Example 3: Streaming conversation with tool integration
    console.log("\n💬 Example 3: Multi-turn conversation with tools");
    console.log("-".repeat(50));
    console.log("Conversation with weather and news tools...");
    console.log("Response: ");

    const conversationResult = await streamText({
      model: heroku.chat("claude-4-sonnet"),
      messages: [
        {
          role: "user",
          content: "I'm planning a trip to London. What should I know?",
        },
        {
          role: "assistant",
          content:
            "I'd be happy to help you plan your trip to London! Let me get you some current information.",
        },
        {
          role: "user",
          content:
            "Please check the weather there and find some recent news about London.",
        },
      ],
      stopWhen: stepCountIs(5),
      tools: {
        getWeather: tool({
          description: "Get the current weather for a specific city",
          inputSchema: z.object({
            location: z.string().describe("The city name"),
          }),
          execute: async ({ location }) => {
            console.log(`\n🌤️  [TOOL] Checking weather for ${location}...`);
            const weather = await getCurrentWeather(location);
            console.log(`✅ [TOOL] Weather data retrieved`);
            return weather;
          },
        }),
        searchNews: tool({
          description: "Search for recent news about a location or topic",
          inputSchema: z.object({
            query: z.string().describe("The search query"),
            limit: z
              .number()
              .optional()
              .describe("Number of results (default: 3)"),
          }),
          execute: async ({ query, limit = 3 }) => {
            console.log(`\n📰 [TOOL] Searching news for "${query}"...`);
            const news = await searchNews(query, limit);
            console.log(`✅ [TOOL] News search complete`);
            return news;
          },
        }),
      },
    });

    for await (const delta of conversationResult.textStream) {
      process.stdout.write(delta);
    }

    console.log("\n\n✅ Basic streaming tool examples completed!");
  } catch (error) {
    console.error("❌ Error in streaming tool usage example:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

// Advanced streaming with real-time tool execution feedback
async function advancedStreamingToolExample() {
  try {
    console.log("\n🚀 Advanced streaming with real-time tool feedback...\n");
    console.log("=".repeat(60));

    console.log("\n🎯 Advanced Example: Weather analysis with streaming");
    console.log("-".repeat(50));
    console.log(
      'Query: "Compare weather in Paris and London, then calculate the temperature difference"',
    );
    console.log("Response: ");

    let toolCallCount = 0;
    const streamingStartTime = Date.now();

    const result = await streamText({
      model: heroku.chat("claude-4-sonnet"),
      prompt:
        "Compare the weather in Paris and London, then calculate the temperature difference between them",
      stopWhen: stepCountIs(8),
      tools: {
        getWeather: tool({
          description: "Get detailed weather information for a city",
          inputSchema: z.object({
            location: z.string().describe("The city name"),
          }),
          execute: async ({ location }) => {
            toolCallCount++;
            const startTime = Date.now();
            console.log(
              `\n🌡️  [TOOL ${toolCallCount}] Fetching weather for ${location}...`,
            );

            const weather = await getCurrentWeather(location);
            const duration = Date.now() - startTime;

            console.log(
              `✅ [TOOL ${toolCallCount}] Weather retrieved in ${duration}ms: ${weather.temperature}°F, ${weather.condition}`,
            );
            return {
              ...weather,
              location,
              retrievedAt: new Date().toISOString(),
            };
          },
        }),
        calculate: tool({
          description: "Perform calculations with detailed steps",
          inputSchema: z.object({
            expression: z.string().describe("Mathematical expression"),
            description: z
              .string()
              .optional()
              .describe("What this calculation represents"),
          }),
          execute: async ({ expression, description }) => {
            toolCallCount++;
            console.log(
              `\n🧮 [TOOL ${toolCallCount}] Calculating: ${description || expression}`,
            );

            const result = await calculateWithSteps(expression);
            console.log(`✅ [TOOL ${toolCallCount}] Result: ${result.result}`);
            return result;
          },
        }),
      },
    });

    let fullResponse = "";
    let deltaCount = 0;

    for await (const delta of result.textStream) {
      process.stdout.write(delta);
      fullResponse += delta;
      deltaCount++;
    }

    const totalDuration = Date.now() - streamingStartTime;

    console.log(`\n\n📊 Streaming Statistics:`);
    console.log(`- Total duration: ${totalDuration}ms`);
    console.log(`- Tool calls made: ${toolCallCount}`);
    console.log(`- Text deltas received: ${deltaCount}`);
    console.log(`- Final response length: ${fullResponse.length} characters`);

    // Access final result
    const finalText = await result.text;
    console.log(
      `\n📝 Final complete response available (${finalText.length} chars)`,
    );

    console.log("\n✅ Advanced streaming tool example completed!");
  } catch (error) {
    console.error("❌ Error in advanced streaming tool example:", error);
  }
}

// Error handling in streaming tools
async function streamingToolErrorHandlingExample() {
  try {
    console.log("\n🛡️  Streaming tool error handling example...\n");
    console.log("=".repeat(60));

    console.log("\n⚠️  Testing error recovery in streaming tools");
    console.log("-".repeat(50));
    console.log('Query: "Calculate invalid math and then calculate 10 + 5"');
    console.log("Response: ");

    const errorResult = await streamText({
      model: heroku.chat("claude-4-sonnet"),
      prompt: 'Try to calculate "hello world + 5" and then calculate 10 + 5',
      stopWhen: stepCountIs(5),
      tools: {
        calculate: tool({
          description: "Perform mathematical calculations",
          inputSchema: z.object({
            expression: z
              .string()
              .describe("Mathematical expression to calculate"),
          }),
          execute: async ({ expression }) => {
            console.log(
              `\n🧮 [TOOL] Attempting calculation: "${expression}"...`,
            );

            try {
              const result = await calculateWithSteps(expression);

              if (result.result === "Invalid expression") {
                console.log(`❌ [TOOL] Invalid expression detected`);
                throw new Error(
                  `Cannot calculate "${expression}": Invalid mathematical expression`,
                );
              }

              console.log(`✅ [TOOL] Calculation successful: ${result.result}`);
              return result;
            } catch (error) {
              console.log(
                `❌ [TOOL] Calculation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              );
              throw error;
            }
          },
        }),
      },
    });

    for await (const delta of errorResult.textStream) {
      process.stdout.write(delta);
    }

    console.log("\n\n✅ Error handling example completed!");
  } catch (error) {
    console.error("❌ Error in streaming tool error handling example:", error);
  } finally {
    console.log("\n" + "=".repeat(60));
  }
}

// Run all examples
if (import.meta.url === `file://${process.argv[1]}`) {
  await streamingToolUsageExample();
  await advancedStreamingToolExample();
  await streamingToolErrorHandlingExample();
}

export {
  streamingToolUsageExample,
  advancedStreamingToolExample,
  streamingToolErrorHandlingExample,
};
