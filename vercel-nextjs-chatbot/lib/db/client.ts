import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/** Returns true when the URL targets a transaction pooler (PgBouncer / Supabase pooler). */
function isTransactionPooler(url: string): boolean {
  return (
    url.includes("pooler.supabase.com") ||
    url.includes("pgbouncer=true") ||
    /:6543\//.test(url)
  );
}

/** Resolves postgres.js options for Supabase, Neon, and other hosted Postgres URLs. */
function getPostgresOptions(url: string): postgres.Options<Record<string, never>> {
  const options: postgres.Options<Record<string, never>> = {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  };

  // Transaction poolers do not support prepared statements.
  if (isTransactionPooler(url)) {
    options.prepare = false;
  }

  if (
    url.includes("supabase.com") ||
    url.includes("sslmode=require") ||
    url.includes("sslmode=verify-full")
  ) {
    options.ssl = "require";
  }

  return options;
}

let client: postgres.Sql | undefined;

/**
 * Returns the shared Postgres client. Lazily initialized so `next build` can run
 * without POSTGRES_URL; fails fast on first query when the env var is missing.
 */
export function getPostgresClient(): postgres.Sql {
  const url = process.env.POSTGRES_URL;

  if (!url) {
    // Allow `next build` in Docker/CI without a database URL; queries fail at runtime
    // with a clear error if POSTGRES_URL is still missing when the app handles traffic.
    if (
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.NEXT_PHASE === "phase-export"
    ) {
      if (!client) {
        client = postgres("");
      }
      return client;
    }

    throw new Error(
      "POSTGRES_URL is not set. Add it to the Cloud Run service env (PROD-CHATBOT secret)."
    );
  }

  if (!client) {
    client = postgres(url, getPostgresOptions(url));
  }

  return client;
}

/** Drizzle ORM instance backed by the shared Postgres client. */
export function getDb() {
  return drizzle(getPostgresClient());
}

/** Closes the shared connection (used by one-off scripts). */
export async function closePostgresClient(): Promise<void> {
  if (client) {
    await client.end();
    client = undefined;
  }
}
