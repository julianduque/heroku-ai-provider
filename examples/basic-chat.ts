import { generateText } from "ai";
import { createHerokuProvider } from "../src/index";

async function basicChatExample() {
  // Create the Heroku provider
  const heroku = createHerokuProvider({
    // You can either set API keys here or use environment variables
    // chatApiKey: 'your_api_key_here',
    chatApiKey: process.env.HEROKU_INFERENCE_KEY,
  });

  try {
    console.log("🤖 Starting basic chat example...\n");

    // Simple text generation
    const { text } = await generateText({
      model: heroku.chat("claude-3-5-sonnet-latest"),
      prompt: "What is the capital of France?",
    });

    console.log("Question: What is the capital of France?");
    console.log("Answer:", text);
    console.log("\n---\n");

    // Chat with system message
    const { text: explanation } = await generateText({
      model: heroku.chat("claude-3-5-sonnet-latest"),
      system:
        "You are a helpful assistant that explains complex topics in simple terms.",
      prompt: "Explain how machine learning works",
    });

    console.log("Question: Explain how machine learning works");
    console.log("Answer:", explanation);
    console.log("\n---\n");

    // Multi-turn conversation
    const { text: response } = await generateText({
      model: heroku.chat("claude-3-5-sonnet-latest"),
      messages: [
        {
          role: "user",
          content: "Hello! Can you help me plan a trip to Japan?",
        },
        {
          role: "assistant",
          content:
            "I'd be happy to help you plan your trip to Japan! What time of year are you thinking of visiting?",
        },
        {
          role: "user",
          content: "I want to see cherry blossoms, so probably spring.",
        },
      ],
    });

    console.log("Multi-turn conversation response:");
    console.log(response);
  } catch (error) {
    console.error("Error in basic chat example:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  basicChatExample();
}

export { basicChatExample };
