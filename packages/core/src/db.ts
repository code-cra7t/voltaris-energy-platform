import pg, { type PoolClient, type QueryResultRow } from "pg";

const { Pool } = pg;
let pool: pg.Pool | undefined;

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured");
    }
    // Keep the current certificate and host verification semantics when pg
    // adopts standard libpq meanings for sslmode=require in a future major version.
    const databaseUrl = new URL(connectionString);
    if (["prefer", "require", "verify-ca"].includes(databaseUrl.searchParams.get("sslmode") ?? "")) {
      databaseUrl.searchParams.set("sslmode", "verify-full");
    }
    pool = new Pool({ connectionString: databaseUrl.toString(), max: 8, connectionTimeoutMillis: 8_000 });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(sql, [...params]);
  return result.rows;
}

export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
