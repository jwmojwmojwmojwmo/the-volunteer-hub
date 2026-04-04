import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouCode 2026",
  description: "Starter project with Next.js, TypeScript, Tailwind, and Supabase"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
