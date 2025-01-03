import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

import ThemeProviderWrapper from "@/providers/ThemeProvider";

const geistSans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Creative Photography Group",
  description: "Shoot, share, explore! 📸 Hosting monthly photography meetups and photo walks in and around Rotterdam.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <meta name="apple-mobile-web-app-title" content="Creative Photography Group" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full bg-background text-foreground antialiased`}
      >
        <ThemeProviderWrapper>
          {children}
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
