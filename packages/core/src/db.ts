import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";
import pg, { type PoolClient, type QueryResultRow } from "pg";

const { Pool } = pg;
type WorkspaceContext = { schema: string; actorId: string; traceId: string };
const context = new AsyncLocalStorage<WorkspaceContext>();
let pool: pg.Pool | undefined;

export function validWorkspaceSchema(schema: string): boolean {
  return schema === "public" || /^sandbox_[a-z0-9_]{8,48}$/.test(schema);
}

export function workspaceContext(): WorkspaceContext | undefined { return context.getStore(); }

export function withWorkspace<T>(schema: string, actorId: string, traceId: string, fn: () => Promise<T>): Promise<T> {
  if (!validWorkspaceSchema(schema)) throw new Error("Invalid workspace");
  if (schema === "public") return context.run({ schema, actorId, traceId }, fn);
  return queryPublic<{ allowed: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM public.reviewer_workspaces
      WHERE schema_name=$1 AND owner_id=$2::uuid AND active AND expires_at>now()) AS allowed`, [schema, actorId],
  ).then(rows => {
    if (!rows[0]?.allowed) throw new Error("Reviewer workspace expired or unavailable");
    return context.run({ schema, actorId, traceId }, fn);
  });
}

function connectionUrl(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const url = new URL(connectionString);
  if (["prefer", "require", "verify-ca"].includes(url.searchParams.get("sslmode") ?? "")) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({ connectionString: connectionUrl(), max: 8, connectionTimeoutMillis: 8_000 });
  }
  return pool;
}

export async function closePools(): Promise<void> {
  if (pool) await pool.end();
  pool = undefined;
}

export async function queryPublic<T extends QueryResultRow = QueryResultRow>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
  return (await getPool().query<T>(sql, [...params])).rows;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const ctx = context.getStore();
  if (!ctx) throw new Error("Business query requires a workspace context");
  const start = performance.now();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    // SET LOCAL is scoped to this transaction and works with Neon's pooler.
    // A single search_path entry prevents fallback to public business tables.
    await client.query(`SET LOCAL search_path TO "${ctx.schema}"`);
    const rows = (await client.query<T>(sql, [...params])).rows;
    await client.query("COMMIT");
    return rows;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); console.info(JSON.stringify({ event: "db.query", traceId: ctx.traceId, workspace: ctx.schema, durationMs: Math.round(performance.now() - start) })); }
}

export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const ctx = context.getStore();
  if (!ctx) throw new Error("Business transaction requires a workspace context");
  const client = await getPool().connect();
  const start = performance.now();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL search_path TO "${ctx.schema}"`);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    console.info(JSON.stringify({ event: "db.transaction", traceId: ctx.traceId, workspace: ctx.schema, durationMs: Math.round(performance.now() - start) }));
  }
}
