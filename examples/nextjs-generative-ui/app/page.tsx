"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Weather } from "../components/weather";
import { Stock } from "../components/stock";
import { ToolCallPreview } from "../components/tool-call-preview";
import ReactMarkdown from "react-markdown";

export default function Page() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isLoading } = useChat();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim()) {
      return;
    }

    sendMessage({ text: input });
    setInput("");
  };

  return (
    <main className="chat-container">
      <header className="chat-header">
        <h1>Generative UI Chat</h1>
        <p>
          Powered by the AI SDK v5, Next.js App Router, and the Heroku AI
          provider.
        </p>
      </header>

      <section className="message-panel">
        {messages.length === 0 ? (
          <p className="empty-state">
            Ask about the weather or a stock price to see dynamic components
            rendered by the model.
          </p>
        ) : null}

        {messages.map((message) => (
          <article key={message.id} className="message">
            <div className="message-label">
              {message.role === "user" ? "User" : "Assistant"}
            </div>

            <div className="message-body">
              {message.parts.map((part, index) => {
                if (part.type === "text") {
                  return (
                    <ReactMarkdown key={index} className="message-text">
                      {part.text}
                    </ReactMarkdown>
                  );
                }

                if (part.type === "tool-displayWeather") {
                  if (part.state === "input-available") {
                    return (
                      <ToolCallPreview
                        key={index}
                        icon="🌦️"
                        title="Weather Lookup"
                        description="Preparing to call the displayWeather tool"
                        payload={part.input ?? {}}
                      />
                    );
                  }

                  if (part.state === "output-available") {
                    return <Weather key={index} {...part.output} />;
                  }

                  if (part.state === "output-error") {
                    return (
                      <p key={index} className="message-error">
                        Weather tool error: {part.errorText}
                      </p>
                    );
                  }
                }

                if (part.type === "tool-getStockPrice") {
                  if (part.state === "input-available") {
                    return (
                      <ToolCallPreview
                        key={index}
                        icon="💹"
                        title="Stock Quote"
                        description="Preparing to call the getStockPrice tool"
                        payload={part.input ?? {}}
                      />
                    );
                  }

                  if (part.state === "output-available") {
                    return <Stock key={index} {...part.output} />;
                  }

                  if (part.state === "output-error") {
                    return (
                      <p key={index} className="message-error">
                        Stock tool error: {part.errorText}
                      </p>
                    );
                  }
                }

                return null;
              })}
            </div>
          </article>
        ))}
      </section>

      <form className="message-input" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the assistant about the weather in San Francisco..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </main>
  );
}
