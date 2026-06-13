import { existsSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";

async function main() {
  if (existsSync(".next")) {
    rmSync(".next", { recursive: true, force: true });
  }

  const child = spawn(
    process.execPath,
    ["--max-old-space-size=4096", "node_modules/next/dist/bin/next", "dev"],
    {
      stdio: "inherit",
      shell: false,
      env: {
        ...process.env,
        WATCHPACK_POLLING: "true",
      },
    },
  );

  child.on("exit", (code) => {
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
