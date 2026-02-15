import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Suspense } from 'react';

import ConfirmProvider from '@/app/providers/ConfirmProvider';
import ModalProvider from '@/app/providers/ModalProvider';
import QueryProvider from '@/app/providers/QueryProvider';
import { ThemeProviderWrapper as ThemeProvider } from '@/app/providers/ThemeProvider';
import Layout from '@/components/layout/Layout';
import NavigationProgress from '@/components/layout/NavigationProgress';
import NotificationToastManager from '@/components/notifications/NotificationToastManager';
import VersionLogger from '@/components/VersionLogger';
import ConfirmModal from '@/components/shared/ConfirmModal';
import Modal from '@/components/shared/Modal';
import SmoothScrollProvider from '@/components/shared/SmoothScrollProvider';
import PageLoading from '@/components/shared/PageLoading';
import { AuthProvider } from '@/context/AuthContext';
import { UnsavedChangesProvider } from '@/context/UnsavedChangesContext';
import { siteConfig, defaultOgImage, defaultTwitterImage, getAbsoluteUrl, truncateDescription } from '@/utils/metadata';
import SupabaseProvider from './providers/SupabaseProvider';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
    ],
    apple: '/apple-icon.png',
  },
  title: {
    default: siteConfig.name,
    template: '%s - Creative Photography Group',
  },
  description: truncateDescription(siteConfig.description),
  keywords: ['photography', 'photography meetups', 'photo walks', 'Netherlands', 'creative photography', 'photography community'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: truncateDescription(siteConfig.description),
    images: [
      {
        url: getAbsoluteUrl(defaultOgImage),
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: truncateDescription(siteConfig.description),
    images: [getAbsoluteUrl(defaultTwitterImage)],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full"
    >
      <head>
        <meta
          name="apple-mobile-web-app-title"
          content="Creative Photography Group"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full bg-background font-[family-name:var(--font-geist-sans)] text-foreground antialiased`}
      >
        <Suspense
          fallback={null}
        >
          <NavigationProgress />
        </Suspense>
        <SmoothScrollProvider />
        <VersionLogger />
        <SupabaseProvider>
          <QueryProvider>
            <AuthProvider>
              <ThemeProvider>
                <ConfirmProvider>
                  <UnsavedChangesProvider>
                    <ModalProvider>
                      <Suspense
                        fallback={<PageLoading />}
                      >
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
              <NotificationToastManager />
            </AuthProvider>
          </QueryProvider>
        </SupabaseProvider>
        <Analytics />
      </body>
    </html>
  );
}
