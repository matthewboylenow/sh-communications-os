import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server actions carry media metadata, not media itself. 2mb is plenty.
    serverActions: { bodySizeLimit: "2mb" },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "sainthelen.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default config;
