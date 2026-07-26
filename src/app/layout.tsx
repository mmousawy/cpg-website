import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { Suspense } from 'react';

import ConfirmProvider from '@/app/providers/ConfirmProvider';
import ModalProvider from '@/app/providers/ModalProvider';
import QueryProvider from '@/app/providers/QueryProvider';
import { ThemeProviderWrapper as ThemeProvider } from '@/app/providers/ThemeProvider';
import ClientShellExtras from '@/components/layout/ClientShellExtras';
import LazyOverlays from '@/components/layout/LazyOverlays';
import Layout from '@/components/layout/Layout';
import NavigationProgress from '@/components/layout/NavigationProgress';
import DeferredNotificationToastManager from '@/components/notifications/DeferredNotificationToastManager';
import JsonLd from '@/components/shared/JsonLd';
import { socialLinks } from '@/config/socials';
import { AuthProvider } from '@/context/AuthContext';
import { UnsavedChangesProvider } from '@/context/UnsavedChangesContext';
import { defaultOgImage, defaultTwitterImage, getAbsoluteUrl, siteConfig, truncateDescription } from '@/utils/metadata';
import SupabaseProvider from './providers/SupabaseProvider';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
  // Preload races App Router streaming: Link headers fire before @font-face CSS
  // applies, which triggers Firefox "preloaded but not used" warnings.
  preload: false,
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});

const cheriaHeading = localFont({
  src: '../../public/cheria-bold.woff2',
  variable: '--font-cheria-heading',
  // Bold display face — cover heading weights so the face matches font-heading usage.
  weight: '400 700',
  display: 'swap',
  preload: false,
});
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
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
      className="h-full overflow-x-clip"
    >
      <head>
        <link
          rel="preconnect"
          href="https://db.creativephotography.group"
          crossOrigin="anonymous"
        />
        <meta
          name="apple-mobile-web-app-title"
          content="Creative Photography Group"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cheriaHeading.variable} h-full overflow-x-clip bg-background font-(family-name:--font-geist-sans) text-foreground antialiased`}
      >
        <JsonLd
          data={[
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: siteConfig.name,
              alternateName: ['Creative Photography Group', 'CPG'],
              url: siteConfig.url,
              description: siteConfig.description,
              publisher: {
                '@type': 'Organization',
                name: siteConfig.name,
                url: siteConfig.url,
                logo: {
                  '@type': 'ImageObject',
                  url: getAbsoluteUrl('/opengraph-image.jpg'),
                },
                sameAs: socialLinks.map((s) => s.url),
              },
            },
          ]}
        />
        <Suspense
          fallback={null}
        >
          <NavigationProgress />
        </Suspense>
        <ClientShellExtras />
        <SupabaseProvider>
          <QueryProvider>
            <AuthProvider>
              <ThemeProvider>
                <ConfirmProvider>
                  <UnsavedChangesProvider>
                    <ModalProvider>
                      <Suspense
                        fallback={null}
                      >
                        <Layout>
                          {children}
                        </Layout>
                      </Suspense>
                      <LazyOverlays />
                    </ModalProvider>
                  </UnsavedChangesProvider>
                </ConfirmProvider>
              </ThemeProvider>
              <Suspense
                fallback={null}
              >
                <DeferredNotificationToastManager />
              </Suspense>
            </AuthProvider>
          </QueryProvider>
        </SupabaseProvider>
        <Analytics />
      </body>
    </html>
  );
}
