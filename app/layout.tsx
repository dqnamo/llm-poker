import type { Metadata } from "next";
import "./globals.css";
import { Geist_Mono } from "next/font/google";
import Footer from "./components/Footer";
import { PostHogProvider } from "./components/PostHogProvider";

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
        className={`antialiased h-full ${geistMono.variable} flex flex-col`}
      >
        <PostHogProvider>
          {children}
          <Footer />
        </PostHogProvider>
      </body>
    </html>
  );
}