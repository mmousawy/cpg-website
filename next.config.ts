import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      use: ['@svgr/webpack'],
    })

    return config
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
