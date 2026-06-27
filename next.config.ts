import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },

  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl.replace(/\/$/, "")}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${apiUrl.replace(/\/$/, "")}/uploads/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${apiUrl.replace(/\/$/, "")}/socket.io/:path*`,
      },
    ];
  },

  async headers() {
    const baseHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];

    if (process.env.NODE_ENV !== "development") {
      baseHeaders.push({
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(), geolocation=()",
      });
    }

    return [
      {
        source: "/:path*",
        headers: baseHeaders,
      },
    ];
  },
};

export default nextConfig;
