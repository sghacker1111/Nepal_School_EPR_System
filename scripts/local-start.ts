import { spawn } from "node:child_process";
import { resolve } from "node:path";

const incomingDatabaseUrl = process.env.DATABASE_URL;
if (!incomingDatabaseUrl)
  throw new Error("The embedded database server did not provide DATABASE_URL.");

const databaseUrl = new URL(incomingDatabaseUrl);
databaseUrl.searchParams.set("sslmode", "disable");

const localEnvironment: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: databaseUrl.toString(),
  DIRECT_URL: databaseUrl.toString(),
  APP_URL: process.env.APP_URL ?? "http://127.0.0.1:3000",
  AUTH_SECRET:
    process.env.AUTH_SECRET ??
    "local-development-secret-change-before-production-2026",
  SESSION_TTL_HOURS: process.env.SESSION_TTL_HOURS ?? "12",
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL ?? "admin@example.test",
  SUPER_ADMIN_USERNAME: process.env.SUPER_ADMIN_USERNAME ?? "superadmin",
  SUPER_ADMIN_INITIAL_PASSWORD:
    process.env.SUPER_ADMIN_INITIAL_PASSWORD ?? "ChangeMe@12345",
  ALLOW_PRODUCTION_SEED: "false",
  NODE_ENV: "development",
};

function runNode(entrypoint: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [entrypoint, ...args], {
      env: localEnvironment,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              `${entrypoint} ${args.join(" ")} exited with code ${code}.`,
            ),
          ),
    );
  });
}

process.stdout.write(
  "\nPreparing the embedded local PostgreSQL-compatible database…\n",
);
await runNode(resolve("node_modules/prisma/build/index.js"), ["generate"]);
await runNode(resolve("node_modules/prisma/build/index.js"), [
  "migrate",
  "deploy",
]);
await runNode(resolve("node_modules/prisma/build/index.js"), ["db", "seed"]);
process.stdout.write("\nLocal environment ready.\n");
process.stdout.write(
  "Super Admin bootstrap applies only to a new database. See README for first-login instructions.\n",
);
process.stdout.write("Open http://127.0.0.1:3000/super-admin/login\n\n");
await runNode(resolve("node_modules/next/dist/bin/next"), [
  "dev",
  "--hostname",
  "127.0.0.1",
]);
