import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native packages stay on the server, unbundled.
  serverExternalPackages: ["better-sqlite3", "sharp"],
};

export default nextConfig;
