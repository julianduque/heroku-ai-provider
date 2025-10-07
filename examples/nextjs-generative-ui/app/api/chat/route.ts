import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, UIMessage, stepCountIs } from "ai";
import { heroku } from "heroku-ai-provider";
import { tools } from "../../../ai/tools";

export async function POST(request: NextRequest) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: heroku.chat("claude-4-sonnet"),
    system:
      "You are a helpful assistant that can display weather and stock information.",
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
