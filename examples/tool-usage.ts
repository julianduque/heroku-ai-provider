import { generateText, tool } from "ai";
import { createHerokuProvider } from "../src/index";
import { z } from "zod";
import "dotenv/config";

// Mock functions for demonstration
async function getCurrentWeather(location: string) {
  // In a real app, this would call a weather API
  const weatherData = {
    "New York": { temperature: 72, condition: "sunny", humidity: 65 },
    London: { temperature: 15, condition: "cloudy", humidity: 80 },
    Tokyo: { temperature: 25, condition: "rainy", humidity: 90 },
  };

  return (
    weatherData[location as keyof typeof weatherData] || {
      temperature: 20,
      condition: "unknown",
      humidity: 70,
    }
  );
}

async function searchDatabase(query: string) {
  // Mock database search
  const results = [
    `Result 1 for "${query}": Lorem ipsum dolor sit amet`,
    `Result 2 for "${query}": Consectetur adipiscing elit`,
    `Result 3 for "${query}": Sed do eiusmod tempor incididunt`,
  ];

  return results;
}

async function calculateMath(expression: string) {
  // Simple calculator (in real app, use a proper math parser)
  try {
    // WARNING: eval is dangerous - use a proper math parser in production
    const result = eval(expression.replace(/[^0-9+\-*/.() ]/g, ""));
    return { expression, result };
  } catch {
    return { expression, result: "Invalid expression" };
  }
}

async function toolUsageExample() {
  const heroku = createHerokuProvider({
    chatApiKey: process.env.HEROKU_INFERENCE_KEY,
  });

  try {
    console.log("🔧 Starting tool usage example...\n");

    // Example 1: Weather tool
    const weatherResult = await generateText({
      model: heroku.chat("claude-3-5-sonnet-latest"),
      prompt: "What is the weather like in New York and London?",
      maxSteps: 5, // Allow multiple steps for tool execution + final response
      tools: {
        getWeather: tool({
          description: "Get the current weather for a specific city",
          parameters: z.object({
            location: z
              .string()
              .describe('The city name (e.g., "New York", "London")'),
          }),
          execute: async ({ location }) => {
            console.log(`🌤️  Looking up weather for ${location}...`);
            return await getCurrentWeather(location);
          },
        }),
      },
    });

    console.log("Weather Query Result:", weatherResult.text);
    console.log("\n---\n");

    // Example 2: Multiple tools
    const multiToolResult = await generateText({
      model: heroku.chat("claude-3-5-sonnet-latest"),
      prompt:
        'Search for information about "machine learning" and calculate 15 * 24',
      maxSteps: 5, // Allow multiple steps for tool execution + final response
      tools: {
        searchDatabase: tool({
          description: "Search the database for relevant information",
          parameters: z.object({
            query: z.string().describe("The search query"),
          }),
          execute: async ({ query }) => {
            console.log(`🔍 Searching database for "${query}"...`);
            return await searchDatabase(query);
          },
        }),
        calculate: tool({
          description: "Perform mathematical calculations",
          parameters: z.object({
            expression: z
              .string()
              .describe("The mathematical expression to calculate"),
          }),
          execute: async ({ expression }) => {
            console.log(`🧮 Calculating "${expression}"...`);
            return await calculateMath(expression);
          },
        }),
      },
    });

    console.log("Multi-tool Result:", multiToolResult.text);
    console.log("\n---\n");

    // Example 3: Tool choice control
    const specificToolResult = await generateText({
      model: heroku.chat("claude-3-5-sonnet-latest"),
      prompt: "I need to know the weather in Tokyo",
      tools: {
        getWeather: tool({
          description: "Get the current weather for a specific city",
          parameters: z.object({
            location: z.string().describe("The city name"),
          }),
          execute: async ({ location }) => {
            console.log(`🌤️  Getting weather for ${location}...`);
            return await getCurrentWeather(location);
          },
        }),
        getTime: tool({
          description: "Get the current time in a specific timezone",
          parameters: z.object({
            timezone: z.string().describe('The timezone (e.g., "UTC", "EST")'),
          }),
          execute: async ({ timezone }) => {
            console.log(`🕐 Getting time for ${timezone}...`);
            return { timezone, time: new Date().toISOString() };
          },
        }),
      },
      toolChoice: "required", // Force the model to use a tool
    });

    console.log("Specific Tool Result:", specificToolResult.text);
    console.log("\n---\n");

    // Example 4: Error handling in tools
    const errorHandlingResult = await generateText({
      model: heroku.chat("claude-3-5-sonnet-latest"),
      prompt: 'Calculate "not a valid expression" and then calculate 5 + 3',
      tools: {
        calculate: tool({
          description: "Perform mathematical calculations",
          parameters: z.object({
            expression: z
              .string()
              .describe("The mathematical expression to calculate"),
          }),
          execute: async ({ expression }) => {
            console.log(`🧮 Attempting to calculate "${expression}"...`);
            const result = await calculateMath(expression);

            if (result.result === "Invalid expression") {
              throw new Error(
                `Cannot calculate "${expression}": Invalid mathematical expression`,
              );
            }

            return result;
          },
        }),
      },
    });

    console.log("Error Handling Result:", errorHandlingResult.text);
  } catch (error) {
    console.error("Error in tool usage example:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

// Advanced tool example with complex data structures
async function advancedToolExample() {
  const heroku = createHerokuProvider({
    chatApiKey: process.env.HEROKU_INFERENCE_KEY,
  });

  try {
    console.log("\n🚀 Advanced tool usage example...\n");

    const result = await generateText({
      model: heroku.chat("claude-3-5-sonnet-latest"),
      prompt:
        'Help me manage my tasks. Add a new task called "Write documentation" with high priority, then list all my tasks.',
      maxSteps: 5, // Allow multiple steps for tool execution + final response
      tools: {
        addTask: tool({
          description: "Add a new task to the task list",
          parameters: z.object({
            title: z.string().describe("The task title"),
            priority: z
              .enum(["low", "medium", "high"])
              .describe("Task priority level"),
            description: z
              .string()
              .optional()
              .describe("Optional task description"),
            dueDate: z
              .string()
              .optional()
              .describe("Optional due date in YYYY-MM-DD format"),
          }),
          execute: async ({ title, priority, description, dueDate }) => {
            console.log(`📝 Adding task: ${title} (${priority} priority)`);

            // Mock task storage
            const task = {
              id: Math.random().toString(36).substr(2, 9),
              title,
              priority,
              description: description || "",
              dueDate: dueDate || null,
              completed: false,
              createdAt: new Date().toISOString(),
            };

            return { success: true, task };
          },
        }),
        listTasks: tool({
          description: "List all tasks with their details",
          parameters: z.object({
            filter: z
              .enum(["all", "completed", "pending"])
              .optional()
              .describe("Filter tasks by status"),
            sortBy: z
              .enum(["priority", "dueDate", "createdAt"])
              .optional()
              .describe("Sort tasks by field"),
          }),
          execute: async ({ filter = "all", sortBy = "priority" }) => {
            console.log(
              `📋 Listing tasks (filter: ${filter}, sort: ${sortBy})`,
            );

            // Mock task list
            const tasks = [
              {
                id: "task1",
                title: "Review code",
                priority: "high",
                description: "Review the new feature implementation",
                dueDate: "2024-01-15",
                completed: false,
              },
              {
                id: "task2",
                title: "Update documentation",
                priority: "medium",
                description: "Update the API documentation",
                dueDate: null,
                completed: true,
              },
            ];

            return { tasks, count: tasks.length };
          },
        }),
      },
    });

    console.log("Advanced Tool Result:", result.text);
    console.log("\n✅ Advanced tool usage example completed successfully!\n");
  } catch (error) {
    console.error("Error in advanced tool example:", error);
  }
}

// Run the examples
if (import.meta.url === `file://${process.argv[1]}`) {
  await toolUsageExample();
  await advancedToolExample();
}

export { toolUsageExample, advancedToolExample };
