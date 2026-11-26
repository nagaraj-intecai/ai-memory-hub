import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['openai'],
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
