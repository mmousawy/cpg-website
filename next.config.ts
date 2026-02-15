import bundleAnalyzer from '@next/bundle-analyzer';
import { withBotId } from 'botid/next/config';
import { readFileSync } from 'fs';
import type { NextConfig } from 'next';

// Read version from package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // Enable 'use cache' directive for data layer caching
  cacheComponents: true,
  // Memory optimization for Webpack builds (production)
  experimental: {
    webpackMemoryOptimizations: true,
    optimizeCss: true,
  },
  images: {
    loader: 'custom',
    loaderFile: './src/utils/supabaseImageLoader.ts',
    // Cache transformed images for 31 days (reduces re-transformations)
    minimumCacheTTL: 2678400,
    // Single format reduces variants (Supabase uses WebP automatically)
    formats: ['image/webp'],
    // Single quality level - all components will use 85
    qualities: [85],
    remotePatterns: [
      {
        hostname: 'lpdjlhlslqtdswhnchmv.supabase.co',
      },
      {
        hostname: 'db.creativephotography.group',
      },
      {
        hostname: 'cdn.discordapp.com',
      },
      {
        hostname: '*.googleusercontent.com',
      },
      {
        hostname: 'secure.meetupstatic.com',
      },
      {
        hostname: 'i.pravatar.cc',
      },
    ],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Note: CSP and HSTS should be configured at the hosting/CDN level (Vercel)
          // Trusted Types requires more complex setup and may break existing functionality
        ],
      },
    ];
  },
};

export default withBotId(withBundleAnalyzer(nextConfig));
