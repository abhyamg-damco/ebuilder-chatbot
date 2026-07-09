import type { NextConfig } from "next";

const basePath = process.env.IS_DEMO === "1" ? "/demo" : "";

const nextConfig: NextConfig = {
  /**
   * Stagehand depends on ai@5; this app uses ai@6.
   * Marking these packages external prevents Turbopack from bundling them
   * into the chat route and causing @ai-sdk/provider-utils export conflicts.
   * @see docs/decisions/001-dynamic-stagehand-loading.md
   * @see docs/decisions/002-ai-sdk-dependency-isolation.md
   */
  serverExternalPackages: [
    "@browserbasehq/stagehand",
    "@browserbasehq/sdk",
    "@google-cloud/storage",
    "pdf-parse",
    "mammoth",
  ],
  // Enables a minimal production bundle for self-hosted Docker / Cloud Run.
  output: "standalone",
  ...(basePath
    ? {
        basePath,
        assetPrefix: "/demo-assets",
        redirects: async () => [
          {
            source: "/",
            destination: basePath,
            permanent: false,
            basePath: false,
          },
        ],
      }
    : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  cacheComponents: true,
  devIndicators: false,
  poweredByHeader: false,
  reactCompiler: true,
  logging: {
    fetches: {
      fullUrl: false,
    },
    incomingRequests: false,
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
  experimental: {
    prefetchInlining: true,
    cachedNavigations: true,
    appNewScrollHandler: true,
    inlineCss: true,
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
