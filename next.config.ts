import type { NextConfig } from "next";
import { wifiEditorialRedirects } from "./lib/telecom/redirects";

const nextConfig: NextConfig = {
  distDir: process.env.PLAYWRIGHT_DIST_DIR || ".next",
  poweredByHeader: false,
  trailingSlash: false,
  async headers() {
    return [{ source: "/:path*", has: [{ type: "host", value: ".*\\.vercel\\.app" }], headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
  async redirects() {
    return wifiEditorialRedirects.map(rule => ({ ...rule, permanent: true }));
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "images-eu.ssl-images-amazon.com" },
    ],
  },
};

export default nextConfig;
