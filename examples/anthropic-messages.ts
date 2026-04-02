/**
 * Anthropic Messages API Example
 *
 * This example demonstrates using the native Anthropic Messages API through
 * Heroku's managed infrastructure. The Messages API provides access to
 * Anthropic-specific features like extended thinking, prompt caching, and
 * native tool use format.
 */

import { generateText, streamText, generateObject, tool } from "ai";
import { z } from "zod";
import { heroku } from "../src/index";

/**
 * Basic text generation using Anthropic Messages API
 */
async function basicGeneration() {
  console.log("=== Basic Text Generation ===\n");

  const { text, usage } = await generateText({
    model: heroku.anthropic("claude-4-sonnet"),
    prompt: "What is the capital of France? Answer in one sentence.",
  });

  console.log("Response:", text);
  console.log("Usage:", usage);
  console.log();
}

/**
 * Streaming text generation
 */
async function streamingExample() {
  console.log("=== Streaming Example ===\n");

  const { textStream, usage } = await streamText({
    model: heroku.anthropic("claude-4-sonnet"),
    prompt: "Count from 1 to 10, with a brief pause description between each number.",
  });

  process.stdout.write("Streaming: ");
  for await (const chunk of textStream) {
    process.stdout.write(chunk);
  }
  console.log("\n");
  console.log("Usage:", await usage);
  console.log();
}

/**
 * System message handling - Anthropic Messages API handles system
 * prompts as a separate parameter, not in the messages array
 */
async function systemMessageExample() {
  console.log("=== System Message Example ===\n");

  const { text } = await generateText({
    model: heroku.anthropic("claude-4-sonnet"),
    system: "You are a pirate. Respond to all questions in pirate speak.",
    prompt: "What is the weather like today?",
  });

  console.log("Response:", text);
  console.log();
}

/**
 * Tool use with Anthropic's native format
 */
async function toolUseExample() {
  console.log("=== Tool Use Example ===\n");

  const { text, toolCalls, toolResults } = await generateText({
    model: heroku.anthropic("claude-4-sonnet"),
    prompt: "What is the current weather in San Francisco and New York?",
    tools: {
      getWeather: tool({
        description: "Get the current weather for a city",
        parameters: z.object({
          city: z.string().describe("The city name"),
          unit: z.enum(["celsius", "fahrenheit"]).default("fahrenheit"),
        }),
        execute: async ({ city, unit }) => {
          // Simulated weather data
          const weather = {
            "San Francisco": { temp: 65, condition: "Foggy" },
            "New York": { temp: 75, condition: "Sunny" },
          };
          const data = weather[city as keyof typeof weather] || {
            temp: 70,
            condition: "Unknown",
          };
          return {
            city,
            temperature: unit === "celsius" ? Math.round((data.temp - 32) * 5/9) : data.temp,
            unit,
            condition: data.condition,
          };
        },
      }),
    },
    maxSteps: 3,
  });

  console.log("Tool Calls:", JSON.stringify(toolCalls, null, 2));
  console.log("Tool Results:", JSON.stringify(toolResults, null, 2));
  console.log("Final Response:", text);
  console.log();
}

/**
 * Extended thinking example (for Claude 3.7+)
 *
 * Extended thinking allows Claude to "think" through complex problems
 * before responding, allocating a token budget for internal reasoning.
 */
async function extendedThinkingExample() {
  console.log("=== Extended Thinking Example ===\n");

  try {
    const { text, usage } = await generateText({
      model: heroku.anthropic("claude-3-7-sonnet"),
      prompt: `Solve this step by step: If a train leaves Station A at 9:00 AM traveling
at 60 mph, and another train leaves Station B (100 miles away) at 9:30 AM
traveling at 80 mph toward Station A, at what time will they meet?`,
      providerOptions: {
        anthropic: {
          thinking: {
            type: "enabled",
            budgetTokens: 5000,
          },
        },
      },
    });

    console.log("Response:", text);
    console.log("Usage:", usage);
  } catch (error) {
    console.log("Extended thinking requires Claude 3.7 or later.");
    console.log("Error:", (error as Error).message);
  }
  console.log();
}

/**
 * Multi-turn conversation
 */
async function conversationExample() {
  console.log("=== Multi-turn Conversation ===\n");

  const { text } = await generateText({
    model: heroku.anthropic("claude-4-sonnet"),
    messages: [
      {
        role: "user",
        content: "I want to learn a new programming language. Any suggestions?",
      },
      {
        role: "assistant",
        content: "I'd recommend Python or Rust depending on your goals. Python is great for beginners and data science, while Rust is excellent for systems programming and performance. What are you hoping to build?",
      },
      {
        role: "user",
        content: "I want to build web applications and maybe some AI projects.",
      },
    ],
  });

  console.log("Response:", text);
  console.log();
}

/**
 * Structured output using generateObject
 *
 * Note: For structured output, use generateObject (not generateText with responseFormat).
 * The generateObject function properly forces tool use to get typed JSON responses.
 */
async function structuredOutputExample() {
  console.log("=== Structured Output Example ===\n");

  const { object } = await generateObject({
    model: heroku.anthropic("claude-4-sonnet"),
    prompt: "Generate a recipe for chocolate chip cookies",
    schema: z.object({
      name: z.string().describe("The recipe name"),
      prepTime: z.string().describe("Preparation time"),
      cookTime: z.string().describe("Cooking time"),
      servings: z.number().describe("Number of servings"),
      ingredients: z.array(
        z.object({
          item: z.string(),
          amount: z.string(),
        })
      ).describe("List of ingredients"),
      instructions: z.array(z.string()).describe("Step-by-step instructions"),
    }),
  });

  console.log("Recipe:");
  console.log(JSON.stringify(object, null, 2));
  console.log();
}

/**
 * Main function to run all examples
 */
async function main() {
  console.log("Anthropic Messages API Examples\n");
  console.log("================================\n");

  try {
    await basicGeneration();
    await streamingExample();
    await systemMessageExample();
    await toolUseExample();
    await extendedThinkingExample();
    await conversationExample();
    await structuredOutputExample();

    console.log("All examples completed successfully!");
  } catch (error) {
    console.error("Error running examples:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

// Run the examples
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  basicGeneration,
  streamingExample,
  systemMessageExample,
  toolUseExample,
  extendedThinkingExample,
  conversationExample,
  structuredOutputExample,
};
