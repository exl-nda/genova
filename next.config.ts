import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/metrics", destination: "/", permanent: true }];
  },
};

export default nextConfig;
