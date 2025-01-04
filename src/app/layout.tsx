import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProviderWrapper as ThemeProvider } from "@/app/providers/ThemeProvider";
import ModalProvider from "@/app/providers/ModalProvider";
import SupabaseProvider from "./providers/SupabaseProvider";

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
        className={`${geistSans.variable} ${geistMono.variable} h-full bg-background font-[family-name:var(--font-inter)] text-foreground antialiased`}
      >
        <SupabaseProvider>
          <ThemeProvider>
            <ModalProvider>
              {children}
            </ModalProvider>
          </ThemeProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
