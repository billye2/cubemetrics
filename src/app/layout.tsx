import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PurrfectBBS",
  description: "A classic BBS experience in your browser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full m-0 p-0 overflow-hidden bg-black">
        {children}
      </body>
    </html>
  );
}
