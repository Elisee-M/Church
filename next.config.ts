import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Local brand assets are served unoptimized so the original logo is used as-is.
    unoptimized: true,
  },
};

export default nextConfig;
