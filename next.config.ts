import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite"],
  // The embedded dev database is never used on Vercel, so keep it out of the serverless bundle.
  outputFileTracingExcludes: process.env.VERCEL ? { "*": ["node_modules/@electric-sql/pglite/**"] } : undefined,
  experimental: {
    // Uploads (prescriptions, product images) are capped at 4 MB in src/lib/server-utils.ts
    serverActions: { bodySizeLimit: "5mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
