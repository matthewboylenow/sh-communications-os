import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans, Newsreader } from "next/font/google";
import "./globals.css";

/*
 * The parish wordmark is a serif "Saint" locked to a light sans "Helen". The
 * app uses the same split rather than inventing a pairing: serif for words,
 * sans for the apparatus around them, mono for anything carrying a unit.
 */

const serif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-text-serif",
  display: "swap",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-ui-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mark-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Saint Helen Communications OS",
  description: "Editorial source of truth for Saint Helen communications.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2efe7" },
    { media: "(prefers-color-scheme: dark)", color: "#131417" },
  ],
};

/**
 * Runs before first paint so the theme is settled before anything renders.
 * Without it the app flashes light on a dark screen at half past eight in the
 * evening, which is exactly when this gets used.
 */
const themeScript = `(function(){try{var s=localStorage.getItem("sh-theme");var d=s==="dark"||(!s&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
