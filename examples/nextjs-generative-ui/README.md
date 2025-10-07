# Next.js Generative UI Example

This minimal Next.js App Router example shows how to combine the AI SDK v5 generative UI primitives with the [`heroku-ai-provider`](https://github.com/julianduque/heroku-ai-provider). The assistant can render custom React components when the model decides to call matching tools.

## Features

- `@ai-sdk/react` `useChat` hook for client-side chat state.
- Generative UI tool streaming with `streamText` and `toUIMessageStreamResponse`.
- Heroku Managed Inference model access via `heroku.chat('claude-3-5-haiku')`.
- Weather and stock showcase components rendered from tool invocations.

## Getting Started

1. Install dependencies in the repository root if you haven’t already:

   ```bash
   pnpm install
   ```

2. Create a `.env.local` file in this example directory (Next.js convention) with your Heroku API key:

   ```bash
   cd examples/nextjs-generative-ui
   echo "INFERENCE_KEY=your_heroku_inference_key" > .env.local
   ```

   - Optionally override `INFERENCE_URL` if you use a region-specific endpoint.

3. Launch the dev server:

   ```bash
   pnpm dlx next dev
   ```

   Run the command inside this example directory to pick up the local `app/` structure.

4. Open `http://localhost:3000` and ask questions like “What’s the weather in San Francisco?” or “Show me the price for AAPL.” The assistant will render the matching card components when the model calls a tool.

## File Overview

- `app/page.tsx` – Client component rendering chat history and tool-driven UI.
- `app/api/chat/route.ts` – Edge-compatible API route that streams responses and wires tools.
- `ai/tools.ts` – Defines the weather and stock tools exposed to the model.
- `components/weather.tsx` and `components/stock.tsx` – UI components used for tool output.

Feel free to extend the example by adding additional tools, styling, or persistence.
