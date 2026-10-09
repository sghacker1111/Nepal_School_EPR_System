import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

// Never read an existing DATABASE_URL or a persisted database for these tests.
const db = await PGlite.create();
const server = new PGLiteSocketServer({
  db,
  host: "127.0.0.1",
  port: 55433,
  maxConnections: 10,
});
try {
  await server.start();
  await new Promise<void>((done, reject) => {
    const child = spawn(
      process.execPath,
      [resolve("node_modules/tsx/dist/cli.mjs"), "scripts/test-local.ts"],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL:
            "postgresql://postgres:postgres@127.0.0.1:55433/postgres?sslmode=disable",
        },
      },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? done()
        : reject(new Error(`Integration checks exited with ${code}.`)),
    );
  });
} finally {
  await server.stop();
  await db.close();
}
