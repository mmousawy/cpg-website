import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Memory and performance optimizations
  experimental: {
    webpackMemoryOptimizations: true, // For production builds (uses Webpack)
    turbo: {
      memoryLimit: 4096, // Limit Turbopack memory to 4GB
    },
  },
  images: {
    qualities: [25, 50, 75, 85, 95],
    remotePatterns: [
      {
        hostname: "gravatar.com",
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
};

export default nextConfig;
