import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import ConfirmProvider from "@/app/providers/ConfirmProvider";
import ModalProvider from "@/app/providers/ModalProvider";
import QueryProvider from "@/app/providers/QueryProvider";
import { ThemeProviderWrapper as ThemeProvider } from "@/app/providers/ThemeProvider";
import Layout from "@/components/layout/Layout";
import NavigationProgress from "@/components/layout/NavigationProgress";
import ConfirmModal from "@/components/shared/ConfirmModal";
import Modal from "@/components/shared/Modal";
import PageLoading from "@/components/shared/PageLoading";
import { AuthProvider } from "@/context/AuthContext";
import { UnsavedChangesProvider } from "@/context/UnsavedChangesContext";
import SupabaseProvider from "./providers/SupabaseProvider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://creativephotographygroup.com'),
  title: {
    default: "Creative Photography Group",
    template: "%s - Creative Photography Group",
  },
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
        className={`${geistSans.variable} ${geistMono.variable} h-full bg-background font-[family-name:var(--font-geist-sans)] text-foreground antialiased`}
      >
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <SupabaseProvider>
          <QueryProvider>
            <AuthProvider>
              <ThemeProvider>
                <ConfirmProvider>
                  <UnsavedChangesProvider>
                    <ModalProvider>
                      <Suspense fallback={<PageLoading />}>
                        <Layout>
                          {children}
                        </Layout>
                      </Suspense>
                      <Modal />
                    </ModalProvider>
                  </UnsavedChangesProvider>
                  <ConfirmModal />
                </ConfirmProvider>
              </ThemeProvider>
            </AuthProvider>
          </QueryProvider>
        </SupabaseProvider>
        <Analytics />
      </body>
    </html>
  );
}
