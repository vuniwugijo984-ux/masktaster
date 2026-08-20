import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mask Taster",
  description: "An unofficial wording repair game. Rewrite a task, then hand it to Little Alex Horne.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
