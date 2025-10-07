import { streamObject } from "ai";
import { z } from "zod";
import { heroku } from "../src/index";

async function streamObjectExample() {
  console.log("🌊 Starting streamObject example...\n");

  const itinerarySchema = z.object({
    destination: z.string(),
    summary: z.string(),
    days: z.array(
      z.object({
        day: z.number(),
        focus: z.string(),
        activities: z.array(z.string()),
      }),
    ),
    travelTips: z.array(z.string()).optional(),
  });

  try {
    const result = await streamObject({
      model: heroku.chat("claude-4-sonnet"),
      schema: itinerarySchema,
      schemaName: "travel_itinerary",
      schemaDescription:
        "A short trip itinerary with a daily focus and actionable activities.",
      prompt:
        "Plan a three day food-focused trip to Mexico City. Keep each activity actionable and concise.",
    });

    console.log("Partial itinerary updates:");
    for await (const partial of result.partialObjectStream) {
      console.dir(partial, { depth: null });
      console.log("---");
    }

    const finalObject = await result.object;
    const finishReason = await result.finishReason;
    const usage = await result.usage;

    console.log("\nFinal itinerary object:");
    console.dir(finalObject, { depth: null });

    console.log("\nGeneration metadata:");
    console.log("Finish reason:", finishReason);
    console.log("Token usage:", usage);
  } catch (error) {
    console.error("Error in streamObject example:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  streamObjectExample();
}

export { streamObjectExample };
