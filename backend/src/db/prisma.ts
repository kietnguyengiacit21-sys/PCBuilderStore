import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

let prismaClient: PrismaClient | undefined;

/**
 * Neon's serverless driver talks to Neon over WebSockets and cannot reach a
 * plain PostgreSQL server (e.g. one installed locally). Use it only for Neon
 * hosts and fall back to the standard `pg` driver everywhere else.
 */
export function isNeonDatabaseUrl(connectionString: string): boolean {
  try {
    return new URL(connectionString).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

function createAdapter(connectionString: string) {
  return isNeonDatabaseUrl(connectionString)
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString });
}

export function getPrismaClient(): PrismaClient {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for database operations.");
  }

  prismaClient ??= new PrismaClient({
    adapter: createAdapter(env.DATABASE_URL),
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return prismaClient;
}

export const databaseProbe = {
  async check(): Promise<void> {
    await getPrismaClient().$queryRaw`SELECT 1`;
  },
};

export async function disconnectDatabase(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = undefined;
  }
}
