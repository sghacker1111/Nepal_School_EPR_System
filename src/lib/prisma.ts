import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getRuntimeEnv } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const env = getRuntimeEnv();
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    max: env.NODE_ENV === "production" ? 5 : 10,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
