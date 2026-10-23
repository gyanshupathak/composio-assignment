import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AuthPath — Know what it takes to connect an app",
  description:
    "Plain-English guides for connecting external apps: which login setup to use, how long it takes, and the problems developers actually hit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-[#f7f6f3] font-sans text-stone-900">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-stone-200/80 py-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 text-sm text-stone-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              <span className="font-medium text-stone-600">AuthPath</span> ·
              Guides for connecting apps with Composio
            </span>
            <span>Every claim links to a real source.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
