import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  experimental: {
    // appDir is not a valid property, removing it
  }
};

export default nextConfig;
