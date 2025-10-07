import { generateObject } from "ai";
import { z } from "zod";
import { heroku } from "../src/index";

async function generateObjectExample() {
  try {
    console.log("🤖 Starting generateObject example...\n");

    const recipeSchema = z.object({
      title: z.string(),
      totalTimeMinutes: z.number(),
      servings: z.union([z.number(), z.string()]),
      ingredients: z.array(
        z.object({
          item: z.string(),
          amount: z.string(),
        }),
      ),
      steps: z.array(z.string()),
      tips: z.array(z.string()).optional(),
    });

    const { object } = await generateObject({
      model: heroku.chat("claude-4-sonnet"),
      schema: recipeSchema,
      prompt:
        "Generate a quick vegetarian pasta recipe formatted to match the provided schema. Include actionable steps and optional tips if relevant.",
      schemaName: "Recipe",
      schemaDescription:
        "A structured cooking recipe with ingredients, steps, and optional tips.",
    });

    console.log("Generated recipe object:");
    console.dir(object, { depth: null });
  } catch (error) {
    console.error("Error in generateObject example:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateObjectExample();
}

export { generateObjectExample };
