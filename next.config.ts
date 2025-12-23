import type { NextConfig } from "next";
const CNBHost = new URL(
  process.env?.CNB_VSCODE_PROXY_URI || "http://localhost:3000"
).host?.replace("{{port}}", process.env?.PORT || "3000");

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  reactStrictMode: false,
  allowedDevOrigins: [CNBHost],
};

export default nextConfig;
