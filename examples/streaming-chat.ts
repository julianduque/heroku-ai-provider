import { streamText } from "ai";
import { createHerokuProvider } from "../src/index";

async function streamingChatExample() {
  // Create the Heroku provider
  const heroku = createHerokuProvider({
    chatApiKey: process.env.HEROKU_INFERENCE_KEY,
  });

  try {
    console.log("🌊 Starting streaming chat example...\n");

    // Basic streaming
    console.log(
      'Streaming response to: "Write a short story about a robot learning to paint"',
    );
    console.log("Response: ");

    const { textStream } = await streamText({
      model: heroku.chat("claude-3-5-sonnet-latest"),
      prompt: "Write a short story about a robot learning to paint.",
    });

    for await (const delta of textStream) {
      process.stdout.write(delta);
    }

    console.log("\n\n---\n");

    // Streaming with system message
    console.log("Streaming creative writing with system prompt...");
    console.log("Response: ");

    const { textStream: poetryStream } = await streamText({
      model: heroku.chat("claude-3-5-sonnet-latest"),
      system: "You are a creative poet who writes in haiku format.",
      prompt: "Write a haiku about the ocean",
    });

    for await (const delta of poetryStream) {
      process.stdout.write(delta);
    }

    console.log("\n\n---\n");

    // Streaming conversation with messages array
    console.log("Streaming multi-turn conversation...");
    console.log("Response: ");

    const { textStream: conversationStream } = await streamText({
      model: heroku.chat("claude-3-5-sonnet-latest"),
      messages: [
        { role: "user", content: "I need help cooking dinner tonight." },
        {
          role: "assistant",
          content:
            "I'd be happy to help! What ingredients do you have available?",
        },
        { role: "user", content: "I have chicken, rice, and some vegetables." },
      ],
    });

    for await (const delta of conversationStream) {
      process.stdout.write(delta);
    }

    console.log("\n\n✅ Streaming examples completed!");
  } catch (error) {
    console.error("Error in streaming chat example:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

// Advanced streaming with event handling
async function advancedStreamingExample() {
  const heroku = createHerokuProvider();

  try {
    console.log("\n🚀 Advanced streaming with event handling...\n");

    const result = await streamText({
      model: heroku.chat("claude-3-5-sonnet-latest"),
      prompt: "Explain the benefits of renewable energy in 3 key points.",
    });

    let fullText = "";
    let tokenCount = 0;

    for await (const delta of result.textStream) {
      process.stdout.write(delta);
      fullText += delta;
      tokenCount++;
    }

    console.log(`\n\n📊 Streaming completed:`);
    console.log(`- Total text length: ${fullText.length} characters`);
    console.log(`- Estimated tokens: ~${tokenCount} deltas received`);

    // Access the full response
    const finalResult = await result.text;
    console.log(`\n📝 Final response length: ${finalResult.length} characters`);
  } catch (error) {
    console.error("Error in advanced streaming example:", error);
  }
}

// Run the examples
if (import.meta.url === `file://${process.argv[1]}`) {
  await streamingChatExample();
  await advancedStreamingExample();
}

export { streamingChatExample, advancedStreamingExample };
