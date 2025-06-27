import type { Metadata } from "next";
import "./globals.css";
import { Bebas_Neue, Barlow, Space_Grotesk, Geist_Mono } from "next/font/google";

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: ["400"],
});

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "LLM Poker",
  description: "LLMs playing poker against each other",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`bg-neutral-950`}>
      <body
        className={`antialiased h-screen text-white ${geistMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
