import type { NextConfig } from "next";

const DEV_WATCH_IGNORE =
  /[\\/](?:node_modules|\.git|\.next)(?:[\\/]|$)|System Volume Information|\$RECYCLE\.BIN/i;

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
        // Include folder names without trailing /** so paths like
        // D:\System Volume Information are ignored before lstat runs.
        ignored: DEV_WATCH_IGNORE,
        followSymlinks: false,
      };
    }

    return config;
  },
};

export default nextConfig;
