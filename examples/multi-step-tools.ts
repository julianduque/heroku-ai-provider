import { generateText, tool, stepCountIs } from "ai";
import { heroku } from "../src/index";
import { z } from "zod";
import "dotenv/config";

async function debugToolUsage() {
  console.log("🔍 Debug: Testing simple tool usage...\n");

  try {
    const result = await generateText({
      model: heroku.chat("claude-4-sonnet"),
      prompt: "What is 2 + 2? Use the calculator tool to find out.",
      tools: {
        calculate: tool({
          description: "Perform mathematical calculations",
          inputSchema: z.object({
            expression: z.string().describe("The mathematical expression"),
          }),
          execute: async ({ expression }) => {
            console.log(`🧮 Calculating: ${expression}`);
            const result = { expression, result: eval(expression) };
            console.log(`📊 Tool returned:`, result);
            return result;
          },
        }),
      },
      stopWhen: stepCountIs(3),
    });

    console.log("\n🎯 Final result:");
    console.log("Text:", result.text);
    console.log("Tool calls made:", result.toolCalls?.length || 0);
    console.log("Finish reason:", result.finishReason);
    console.log("Steps taken:", result.steps?.length || 0);

    if (result.steps) {
      console.log("\n📋 Steps breakdown:");
      result.steps.forEach((step, index) => {
        console.log(`Step ${index + 1}:`, {
          toolCalls: step.toolCalls?.length || 0,
          text:
            step.text?.slice(0, 100) +
            (step.text && step.text.length > 100 ? "..." : ""),
        });
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await debugToolUsage();
}

export { debugToolUsage };
