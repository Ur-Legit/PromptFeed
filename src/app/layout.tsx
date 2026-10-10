import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromptFeed",
  description: "Turn any prompt into a news feed that keeps itself fresh.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight text-lg">
              PromptFeed
            </Link>
            <Link href="/" className="text-sm text-stone-500 hover:text-foreground">
              Your feeds
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl px-4 py-8 flex-1">{children}</main>
      </body>
    </html>
  );
}
