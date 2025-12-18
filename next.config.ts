import type { NextConfig } from "next";
const CNBHost = new URL(process.env.CNB_VSCODE_PROXY_URI || '')
  .host?.replace('{{port}}', process.env.PORT || '3000');

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  allowedDevOrigins: [CNBHost]
};

export default nextConfig;
