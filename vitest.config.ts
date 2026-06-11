import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    clearMocks: true,
    env: {
      DATABASE_URL:
        "postgresql://sales:sales@localhost:5432/sales_intelligence_test?schema=public",
      DIRECT_URL:
        "postgresql://sales:sales@localhost:5432/sales_intelligence_test?schema=public",
      OPENAI_API_KEY: "test-openai-key",
      ALLOW_DEV_UUID_AUTH: "true",
    },
  },
  resolve: {
    alias: {
      "@/app": path.resolve(__dirname, "app"),
      "@/components": path.resolve(__dirname, "components"),
      "@/agents": path.resolve(__dirname, "agents"),
      "@/services": path.resolve(__dirname, "services"),
      "@/repositories": path.resolve(__dirname, "repositories"),
      "@/lib": path.resolve(__dirname, "lib"),
      "@/types": path.resolve(__dirname, "types"),
      "@/prompts": path.resolve(__dirname, "prompts"),
    },
  },
});
