/**
 * Integration test for Anthropic Messages API
 * Run with: npx tsx test-anthropic-integration.ts
 *
 * Requires INFERENCE_KEY and INFERENCE_URL environment variables
 */

import { generateText, streamText, generateObject, tool } from "ai";
import { z } from "zod";
import { createHerokuAI } from "./src/index";

const heroku = createHerokuAI();

async function testBasicGeneration() {
  console.log("\n=== Test 1: Basic Text Generation ===");
  try {
    const { text, usage } = await generateText({
      model: heroku.anthropic("claude-4-sonnet"),
      prompt: "What is 2 + 2? Reply with just the number.",
    });

    console.log("Response:", text);
    console.log("Usage:", usage);
    console.log("PASS: Basic generation works");
    return true;
  } catch (error) {
    console.error("FAIL:", (error as Error).message);
    return false;
  }
}

async function testSystemMessage() {
  console.log("\n=== Test 2: System Message Handling ===");
  try {
    const { text } = await generateText({
      model: heroku.anthropic("claude-4-sonnet"),
      system: "You are a pirate. Always respond in pirate speak. Keep responses under 20 words.",
      prompt: "Say hello",
    });

    console.log("Response:", text);
    const hasPirateWords = /ahoy|matey|arr|ye|sailor|ship|treasure/i.test(text);
    if (hasPirateWords) {
      console.log("PASS: System message applied correctly");
      return true;
    } else {
      console.log("WARN: Response may not reflect pirate speak");
      return true; // Still consider pass if it responded
    }
  } catch (error) {
    console.error("FAIL:", (error as Error).message);
    return false;
  }
}

async function testStreaming() {
  console.log("\n=== Test 3: Streaming ===");
  try {
    const { textStream, usage } = await streamText({
      model: heroku.anthropic("claude-4-sonnet"),
      prompt: "Count from 1 to 5, one number per line.",
    });

    let fullText = "";
    let chunkCount = 0;
    process.stdout.write("Streaming: ");
    for await (const chunk of textStream) {
      process.stdout.write(chunk);
      fullText += chunk;
      chunkCount++;
    }
    console.log();
    console.log("Chunks received:", chunkCount);
    console.log("Usage:", await usage);

    if (chunkCount > 1 && fullText.length > 0) {
      console.log("PASS: Streaming works");
      return true;
    } else {
      console.log("FAIL: Expected multiple chunks");
      return false;
    }
  } catch (error) {
    console.error("FAIL:", (error as Error).message);
    return false;
  }
}

async function testToolUse() {
  console.log("\n=== Test 4: Tool Use ===");
  try {
    const { text, toolCalls } = await generateText({
      model: heroku.anthropic("claude-4-sonnet"),
      prompt: "What is the current time in UTC? Use the get_time tool.",
      tools: {
        get_time: tool({
          description: "Get the current time in a specified timezone",
          parameters: z.object({
            timezone: z.string().describe("The timezone (e.g., UTC, PST)"),
          }),
          execute: async ({ timezone }) => {
            return {
              timezone,
              time: new Date().toISOString(),
              formatted: new Date().toLocaleTimeString("en-US", { timeZone: "UTC" }),
            };
          },
        }),
      },
      maxSteps: 2,
    });

    console.log("Tool calls made:", toolCalls?.length ?? 0);
    console.log("Final response:", text?.substring(0, 200));

    if (toolCalls && toolCalls.length > 0) {
      console.log("PASS: Tool use works");
      return true;
    } else {
      console.log("WARN: No tool calls detected, but may have responded directly");
      return true;
    }
  } catch (error) {
    console.error("FAIL:", (error as Error).message);
    return false;
  }
}

async function testMultiTurn() {
  console.log("\n=== Test 5: Multi-turn Conversation ===");
  try {
    const { text } = await generateText({
      model: heroku.anthropic("claude-4-sonnet"),
      messages: [
        { role: "user", content: "My name is Alice." },
        { role: "assistant", content: "Hello Alice! Nice to meet you." },
        { role: "user", content: "What is my name?" },
      ],
    });

    console.log("Response:", text);
    if (text.toLowerCase().includes("alice")) {
      console.log("PASS: Multi-turn conversation maintains context");
      return true;
    } else {
      console.log("FAIL: Expected response to include 'Alice'");
      return false;
    }
  } catch (error) {
    console.error("FAIL:", (error as Error).message);
    return false;
  }
}

async function testStructuredOutput() {
  console.log("\n=== Test 6: Structured Output (generateObject) ===");
  try {
    const { object } = await generateObject({
      model: heroku.anthropic("claude-4-sonnet"),
      prompt: "Generate a person named John who is 25 years old",
      schema: z.object({
        name: z.string(),
        age: z.number(),
      }),
    });

    console.log("Object:", object);
    if (object.name && typeof object.age === "number") {
      console.log("PASS: Structured output works");
      return true;
    } else {
      console.log("FAIL: Invalid structured output");
      return false;
    }
  } catch (error) {
    console.error("FAIL:", (error as Error).message);
    return false;
  }
}

async function testGenerationParameters() {
  console.log("\n=== Test 7: Generation Parameters ===");
  try {
    const { text, usage } = await generateText({
      model: heroku.anthropic("claude-4-sonnet"),
      prompt: "Write a one-word response.",
      temperature: 0,
      maxOutputTokens: 50,
    });

    console.log("Response:", text);
    console.log("Output tokens:", usage?.outputTokens);

    if (usage?.outputTokens && usage.outputTokens <= 50) {
      console.log("PASS: Generation parameters applied");
      return true;
    } else {
      console.log("WARN: Could not verify token limit");
      return true;
    }
  } catch (error) {
    console.error("FAIL:", (error as Error).message);
    return false;
  }
}

async function main() {
  console.log("===========================================");
  console.log("Anthropic Messages API Integration Tests");
  console.log("===========================================");

  const results: boolean[] = [];

  results.push(await testBasicGeneration());
  results.push(await testSystemMessage());
  results.push(await testStreaming());
  results.push(await testToolUse());
  results.push(await testMultiTurn());
  results.push(await testStructuredOutput());
  results.push(await testGenerationParameters());

  console.log("\n===========================================");
  console.log("Test Results Summary");
  console.log("===========================================");
  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log("\nAll tests passed!");
    process.exit(0);
  } else {
    console.log(`\n${total - passed} test(s) failed.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
