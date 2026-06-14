import { existsSync, rmSync } from "node:fs";
import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";

/** Harmless Windows drive-root scan noise from webpack's file watcher. */
const WATCHPACK_SYSTEM_VOLUME_NOISE =
  /Watchpack Error \(initial scan\): Error: EINVAL: invalid argument, lstat '[A-Z]:\\System Volume Information'/;

function attachFilteredStderr(
  child: ChildProcessByStdio<null, null, Readable>,
): void {
  let pending = "";

  child.stderr.on("data", (chunk: Buffer | string) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";

    for (const line of lines) {
      if (!WATCHPACK_SYSTEM_VOLUME_NOISE.test(line)) {
        process.stderr.write(`${line}\n`);
      }
    }
  });

  child.stderr.on("end", () => {
    if (pending && !WATCHPACK_SYSTEM_VOLUME_NOISE.test(pending)) {
      process.stderr.write(pending);
    }
  });
}

function runNextDev(): void {
  const child = spawn(
    process.execPath,
    ["--max-old-space-size=4096", "node_modules/next/dist/bin/next", "dev"],
    {
      stdio: ["inherit", "inherit", "pipe"],
      shell: false,
      env: process.env,
    },
  );

  attachFilteredStderr(child);

  child.on("exit", (code) => {
    process.exit(code ?? 1);
  });
}

async function main() {
  const skipClean = process.argv.includes("--no-clean");

  if (!skipClean && existsSync(".next")) {
    rmSync(".next", { recursive: true, force: true });
  }

  runNextDev();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
