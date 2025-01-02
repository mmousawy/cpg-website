import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['gravatar.com', 'lpdjlhlslqtdswhnchmv.supabase.co'],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      use: ['@svgr/webpack'],
    })

    return config
  },
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};

export default nextConfig;
