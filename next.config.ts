import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Local brand assets are served unoptimized so the original logo is used as-is.
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      // jsPDF optionally lazy-loads canvg for SVG rendering. We only generate
      // text/vector PDFs, and canvg drags in core-js, which Turbopack cannot
      // resolve in the client bundle. Alias it away.
      canvg: false,
    },
  },
};

export default nextConfig;
