// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // This will skip ESLint checks (and any no-unused-vars / no-explicit-any errors)
    // when Next.js runs its production build (e.g. on AWS Amplify).
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
