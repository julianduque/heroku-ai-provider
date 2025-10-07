import { tool as createTool } from "ai";
import { z } from "zod";

export const weatherTool = createTool({
  description: "Display the weather for a location",
  inputSchema: z.object({
    location: z.string().describe("The location to get the weather for"),
  }),
  execute: async ({ location }) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // Replace with a real weather API call in production.
    return {
      location,
      weather: "Sunny",
      temperature: 21,
    };
  },
});

export const stockTool = createTool({
  description: "Get the latest price for a stock symbol",
  inputSchema: z.object({
    symbol: z.string().describe("Ticker symbol to fetch, e.g. AAPL"),
  }),
  execute: async ({ symbol }) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // Replace with a real stocks API call in production.
    return {
      symbol: symbol.toUpperCase(),
      price: 123.45,
    };
  },
});

export const tools = {
  displayWeather: weatherTool,
  getStockPrice: stockTool,
};
