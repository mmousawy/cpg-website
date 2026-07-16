import bundleAnalyzer from '@next/bundle-analyzer';
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
    // Single format reduces variants (Supabase auto-serves WebP via /render/image)
    formats: ['image/webp'],
    // 30 for blur placeholders, 92 for full images (passed to Supabase ?quality=)
    qualities: [30, 92],
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
    // Next.js ships a default asset rule for SVGs. To let @svgr/webpack turn
    // SVG imports into React components we have to (1) exclude .svg from the
    // default rule and (2) add our own SVGR rule that still respects Next's
    // metadata/url resource queries.
    const fileLoaderRule = config.module.rules.find(
      (rule: { test?: { test?: (s: string) => boolean } }) =>
        rule?.test?.test?.('.svg'),
    );

    if (fileLoaderRule) {
      fileLoaderRule.exclude = /\.svg$/i;
    }

    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      resourceQuery: { not: [/__next_metadata__/, /url/] },
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

export default withBundleAnalyzer(nextConfig);
