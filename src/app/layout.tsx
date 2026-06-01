import type { Metadata, Viewport } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "XP Boost",
  description: "Your personal productivity hub",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Browser chrome follows the OS theme (matches body bg in each mode).
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1a1918" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Theme follows the OS via prefers-color-scheme (see globals.css). No
    // forced `dark` class — the app supports both light and dark.
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
