import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mask Taster",
  description: "An unofficial wording repair game. Rewrite a task, then hand it to Little Alex Horne.",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "16x16 32x32 48x48" },
      { url: "/favicon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: [{ url: "/favicon-32.png", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
