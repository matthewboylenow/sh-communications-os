import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saint Helen Communications OS",
  description: "Editorial source of truth for Saint Helen communications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
