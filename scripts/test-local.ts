import { spawn } from "node:child_process";
import { resolve } from "node:path";

if (!process.env.DATABASE_URL?.includes("55433"))
  throw new Error(
    "Integration tests require the isolated embedded database on port 55433.",
  );
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set("sslmode", "disable");
process.env.DATABASE_URL = url.toString();
process.env.DIRECT_URL = url.toString();
process.env.AUTH_SECRET = "isolated-test-secret-never-use-in-production-2026";
const run = (file: string, args: string[]) =>
  new Promise<void>((done, reject) => {
    const child = spawn(process.execPath, [resolve(file), ...args], {
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? done()
        : reject(new Error("Test process exited with " + code)),
    );
  });
await run("node_modules/prisma/build/index.js", ["migrate", "deploy"]);
await run("node_modules/tsx/dist/cli.mjs", ["scripts/workflow-check.ts"]);
if (process.env.ERP_TEST_SERVE === "1")
  await run("node_modules/next/dist/bin/next", [
    "dev",
    "--port",
    "3001",
    "--hostname",
    "127.0.0.1",
  ]);
