import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Generative UI with Heroku AI",
  description:
    "Example Next.js app showing the AI SDK v5 generative UI flow using the Heroku AI provider.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="app-body">{children}</body>
    </html>
  );
}
