import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Enable 'use cache' directive for data layer caching
  cacheComponents: true,
  // Memory optimization for Webpack builds (production)
  experimental: {
    webpackMemoryOptimizations: true,
    optimizeCss: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [25, 50, 75, 85, 95],
    remotePatterns: [
      {
        hostname: 'gravatar.com',
      },
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

export default withBundleAnalyzer(nextConfig);
