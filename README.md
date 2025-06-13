# Heroku AI SDK Provider

A TypeScript provider for the [Vercel AI SDK](https://sdk.vercel.ai/) that enables you to use Heroku's AI inference capabilities in your applications. This provider supports both chat completions and embeddings through Heroku's AI infrastructure.

## Features

- 🤖 **Chat Completions**: Support for Claude 3.5 Sonnet, Claude 3 Haiku, and other Heroku-hosted models
- 🧠 **Embeddings**: Generate vector embeddings using Cohere's multilingual embedding model
- 🔧 **Tool Support**: Function calling capabilities for building AI agents and assistants
- 📡 **Streaming**: Real-time streaming responses for chat completions
- 🔐 **TypeScript**: Full TypeScript support with comprehensive type definitions
- ⚡ **Dual Module Support**: Compatible with both ESM and CommonJS projects

## Installation

```bash
npm install heroku-ai-provider
# or
yarn add heroku-ai-provider
# or
pnpm add heroku-ai-provider
```

## Prerequisites

Before using this provider, you'll need:

1. A Heroku account with access to AI services
2. Heroku AI API keys for inference and/or embeddings
3. The Vercel AI SDK installed in your project

```bash
npm install ai
```

## Basic Setup

### Environment Variables

Set your Heroku AI API keys as environment variables:

```bash
# For chat completions
HEROKU_INFERENCE_KEY=your_inference_api_key

# For embeddings
HEROKU_EMBEDDING_KEY=your_embedding_api_key

# Optional: Custom API endpoints
HEROKU_INFERENCE_URL=https://us.inference.heroku.com
HEROKU_EMBEDDING_URL=https://us.inference.heroku.com
```

### Basic Configuration

```typescript
import { createHerokuProvider } from "heroku-ai-provider";

// Using environment variables (recommended)
const heroku = createHerokuProvider();

// Or with explicit configuration
const heroku = createHerokuProvider({
  chatApiKey: "your_inference_api_key",
  embeddingsApiKey: "your_embedding_api_key",
  chatBaseUrl: "https://us.inference.heroku.com/v1/chat/completions",
  embeddingsBaseUrl: "https://us.inference.heroku.com/v1/embeddings",
});
```

## Usage Examples

### Chat Completions

#### Basic Chat

```typescript
import { generateText } from "ai";
import { createHerokuProvider } from "heroku-ai-provider";

const heroku = createHerokuProvider();

const { text } = await generateText({
  model: heroku.chat("claude-3-5-sonnet-latest"),
  prompt: "What is the capital of France?",
});

console.log(text); // "The capital of France is Paris."
```

#### Streaming Chat

```typescript
import { streamText } from "ai";
import { createHerokuProvider } from "heroku-ai-provider";

const heroku = createHerokuProvider();

const { textStream } = await streamText({
  model: heroku.chat("claude-3-haiku"),
  prompt: "Write a short story about a robot learning to paint.",
});

for await (const delta of textStream) {
  process.stdout.write(delta);
}
```

#### Chat with System Message

```typescript
import { generateText } from "ai";
import { createHerokuProvider } from "heroku-ai-provider";

const heroku = createHerokuProvider();

const { text } = await generateText({
  model: heroku.chat("claude-3-5-sonnet-latest"),
  system: "You are a helpful assistant that explains complex topics simply.",
  prompt: "Explain quantum computing",
});
```

### Tool/Function Calling

```typescript
import { generateText, tool } from "ai";
import { createHerokuProvider } from "heroku-ai-provider";
import { z } from "zod";

const heroku = createHerokuProvider();

const { text } = await generateText({
  model: heroku.chat("claude-3-5-sonnet-latest"),
  prompt: "What is the weather like in New York?",
  tools: {
    getWeather: tool({
      description: "Get the current weather for a location",
      parameters: z.object({
        location: z.string().describe("The city and state"),
      }),
      execute: async ({ location }) => {
        // Simulate weather API call
        return {
          location,
          temperature: 72,
          condition: "sunny",
        };
      },
    }),
  },
  maxSteps: 5, // Allow multi-step tool conversations
});
```

#### Advanced Tool Usage with Multiple Steps

```typescript
import { generateText, tool } from "ai";
import { createHerokuProvider } from "heroku-ai-provider";
import { z } from "zod";

const heroku = createHerokuProvider();

const { text, steps } = await generateText({
  model: heroku.chat("claude-3-5-sonnet-latest"),
  prompt:
    "Check the weather in New York and then suggest appropriate clothing.",
  tools: {
    getWeather: tool({
      description: "Get the current weather for a location",
      parameters: z.object({
        location: z.string().describe("The city and state"),
      }),
      execute: async ({ location }) => {
        return {
          location,
          temperature: 45,
          condition: "rainy",
          humidity: 80,
        };
      },
    }),
    suggestClothing: tool({
      description: "Suggest appropriate clothing based on weather conditions",
      parameters: z.object({
        temperature: z.number().describe("Temperature in Fahrenheit"),
        condition: z.string().describe("Weather condition"),
        humidity: z.number().optional().describe("Humidity percentage"),
      }),
      execute: async ({ temperature, condition, humidity }) => {
        return {
          suggestions: [
            "Waterproof jacket",
            "Warm layers",
            "Waterproof shoes",
            "Umbrella",
          ],
          reasoning: `Given ${temperature}°F and ${condition} weather${humidity ? ` with ${humidity}% humidity` : ""}, you'll want to stay warm and dry.`,
        };
      },
    }),
  },
  maxSteps: 5,
});

console.log("Final response:", text);
console.log("Tool execution steps:", steps.length);
```

### Embeddings

#### Basic Embeddings

```typescript
import { embed } from "ai";
import { createHerokuProvider } from "heroku-ai-provider";

const heroku = createHerokuProvider();

const { embedding } = await embed({
  model: heroku.embedding("cohere-embed-multilingual"),
  value: "Hello, world!",
});

console.log(embedding); // [0.1, 0.2, -0.3, ...]
```

#### Multiple Embeddings

```typescript
import { embedMany } from "ai";
import { createHerokuProvider } from "heroku-ai-provider";

const heroku = createHerokuProvider();

const { embeddings } = await embedMany({
  model: heroku.embedding("cohere-embed-multilingual"),
  values: ["First document", "Second document", "Third document"],
});

console.log(embeddings.length); // 3
```

#### Using the Convenience Function

```typescript
import { createEmbedFunction } from "heroku-ai-provider";

// Create a reusable embed function
const embedText = createEmbedFunction({
  apiKey: process.env.HEROKU_EMBEDDING_KEY!,
  model: "cohere-embed-multilingual",
});

const embedding = await embedText("Hello, world!");
console.log(embedding); // [0.1, 0.2, -0.3, ...]
```

## Configuration Options

### HerokuProviderSettings

```typescript
interface HerokuProviderSettings {
  // API keys (falls back to environment variables)
  chatApiKey?: string; // HEROKU_INFERENCE_KEY
  embeddingsApiKey?: string; // HEROKU_EMBEDDING_KEY

  // Base URLs (falls back to environment variables or defaults)
  chatBaseUrl?: string; // HEROKU_INFERENCE_URL
  embeddingsBaseUrl?: string; // HEROKU_EMBEDDING_URL
}
```

### Supported Models

#### Chat Models

- `claude-3-5-sonnet-latest` - Latest Claude 3.5 Sonnet (recommended)
- `claude-3-haiku` - Fast and efficient Claude 3 Haiku
- `claude-4-sonnet` - Claude 4 Sonnet (when available)
- `claude-3-7-sonnet` - Claude 3.7 Sonnet
- `claude-3-5-haiku` - Claude 3.5 Haiku

#### Embedding Models

- `cohere-embed-multilingual` - Multilingual embedding model by Cohere

## Framework Integration

### Next.js App Router

```typescript
// app/api/chat/route.ts
import { streamText } from "ai";
import { createHerokuProvider } from "heroku-ai-provider";

const heroku = createHerokuProvider();

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: heroku.chat("claude-3-5-sonnet-latest"),
    messages,
    maxSteps: 5, // Enable multi-step tool conversations
  });

  return result.toDataStreamResponse();
}
```

### Next.js with Tool Support

```typescript
// app/api/chat/route.ts
import { streamText, tool } from "ai";
import { createHerokuProvider } from "heroku-ai-provider";
import { z } from "zod";

const heroku = createHerokuProvider();

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: heroku.chat("claude-3-5-sonnet-latest"),
    messages,
    tools: {
      getTime: tool({
        description: "Get the current time",
        parameters: z.object({
          timezone: z
            .string()
            .optional()
            .describe("Timezone (e.g., 'America/New_York')"),
        }),
        execute: async ({ timezone = "UTC" }) => {
          return {
            time: new Date().toLocaleString("en-US", { timeZone: timezone }),
            timezone,
          };
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
```

### Express.js

```typescript
import express from "express";
import { generateText } from "ai";
import { createHerokuProvider } from "heroku-ai-provider";

const app = express();
const heroku = createHerokuProvider();

app.post("/chat", async (req, res) => {
  const { prompt } = req.body;

  const { text } = await generateText({
    model: heroku.chat("claude-3-haiku"),
    prompt,
  });

  res.json({ response: text });
});
```

## Error Handling

The provider includes comprehensive error handling with user-friendly error messages:

```typescript
import {
  createHerokuProvider,
  isConfigurationError,
  isTemporaryServiceError,
} from "heroku-ai-provider";

try {
  const heroku = createHerokuProvider();
  const result = await generateText({
    model: heroku.chat("claude-3-5-sonnet-latest"),
    prompt: "Hello!",
  });
} catch (error) {
  if (isConfigurationError(error)) {
    console.error("Configuration error:", error.message);
    // Handle API key or URL configuration issues
  } else if (isTemporaryServiceError(error)) {
    console.error("Service error:", error.message);
    // Handle temporary service issues (retry logic)
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Troubleshooting

### Common Issues

#### Authentication Errors

- **Issue**: "Chat API key is required" or "Embeddings API key is required"
- **Solution**: Ensure your API keys are set in environment variables or passed directly to `createHerokuProvider()`

#### Model Not Found

- **Issue**: "Unsupported chat model" or "Unsupported embedding model"
- **Solution**: Check that you're using a supported model from the list above

#### Network Errors

- **Issue**: Connection timeouts or network failures
- **Solution**: Verify your internet connection and that Heroku's AI services are accessible

#### URL Configuration

- **Issue**: "Invalid URL format" errors
- **Solution**: Ensure custom URLs are valid and use HTTP/HTTPS protocol

#### Tool Execution Issues

- **Issue**: Tools are called but AI doesn't provide final response
- **Solution**: Ensure you're using `maxSteps: 5` or higher to allow multi-step tool conversations

#### Schema Validation Errors

- **Issue**: "Unrecognized request argument" errors when using tools
- **Solution**: This provider automatically filters out problematic schema properties (like `$schema`) that some validation libraries add

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure tests pass: `npm test`
5. Lint your code: `npm run lint`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/julianduque/heroku-ai-provider.git
cd heroku-ai-provider

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the project
pnpm build

# Lint code
pnpm lint
```

### Testing

The project uses Jest for testing. Run tests with:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage
```

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## Resources

- 📖 Documentation: [Heroku AI Documentation](https://devcenter.heroku.com/categories/ai)
- 🐛 Issues: [GitHub Issues](https://github.com/julianduque/heroku-ai-provider/issues)

## Related Projects

- [Vercel AI SDK](https://sdk.vercel.ai/) - The AI SDK this provider integrates with
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) - Command line interface for Heroku
- [Heroku AI Services](https://devcenter.heroku.com/categories/ai) - Official Heroku AI documentation
