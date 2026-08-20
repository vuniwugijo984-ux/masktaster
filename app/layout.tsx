import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mask Taster",
  description: "An unofficial wording repair game. Rewrite a task, then hand it to Little Alex Horne.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: [
      { url: "/greg-favicon.ico", type: "image/x-icon" },
      { url: "/greg-favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/greg-favicon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/greg-favicon.ico",
    apple: [{ url: "/greg-apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
