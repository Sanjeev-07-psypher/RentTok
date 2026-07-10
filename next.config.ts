import type { NextConfig } from "next";

// Derive the Supabase storage hostname so next/image can serve room photos.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  // web-push is a Node library (uses https/crypto) — keep it external so it runs
  // from node_modules on the server instead of being bundled.
  serverExternalPackages: ["web-push"],
  // Allow opening the dev server over the LAN (e.g. phone testing) without the
  // cross-origin HMR warning. Add your machine's LAN IP(s) here if it changes.
  allowedDevOrigins: ["192.168.1.4", "192.168.1.*"],
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(self), camera=(), microphone=(), payment=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
