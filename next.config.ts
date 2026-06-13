import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "playwright"],
  webpack: (config, { dev }) => {
    config.resolve ??= {};
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };

    if (dev) {
      // Avoid restoring large corrupted webpack packs that can OOM on low-memory hosts.
      config.cache = false;
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/System Volume Information/**",
          "**/$RECYCLE.BIN/**",
        ],
        ...(process.platform === "win32" ? { poll: 1000 } : {}),
      };
    }

    return config;
  },
};

export default nextConfig;
