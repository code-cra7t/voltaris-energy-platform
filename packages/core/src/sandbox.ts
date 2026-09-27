import { getPool, queryPublic, validWorkspaceSchema, workspaceContext } from "./db.js";
import { SANDBOX_SEED_SQL } from "./sandbox-fixture.js";

export async function resetReviewerWorkspace(): Promise<void> {
  const ctx = workspaceContext();
  if (!ctx || ctx.schema === "public" || !validWorkspaceSchema(ctx.schema)) throw new Error("Reset is only available in an invited workspace");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL search_path TO "${ctx.schema}"`);
    const tables = await client.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename", [ctx.schema]);
    if (tables.rows.length < 15) throw new Error("Workspace schema is incomplete");
    const quoted = tables.rows.map(row => `"${row.tablename.replaceAll('"', '""')}"`).join(", ");
    await client.query(`TRUNCATE ${quoted} RESTART IDENTITY CASCADE`);
    await client.query(SANDBOX_SEED_SQL);
    await client.query("COMMIT");
    await queryPublic("UPDATE public.reviewer_workspaces SET reset_at=now() WHERE schema_name=$1 AND owner_id=$2::uuid", [ctx.schema, ctx.actorId]);
    console.info(JSON.stringify({ event: "sandbox.reset", traceId: ctx.traceId, workspace: ctx.schema }));
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function consumeSandboxAiCall(): Promise<boolean> {
  const ctx = workspaceContext();
  if (!ctx || ctx.schema === "public") return true;
  const rows = await queryPublic<{ calls: number }>(
    `INSERT INTO public.sandbox_ai_usage(owner_id,usage_date,calls) VALUES($1::uuid,current_date,1)
     ON CONFLICT (owner_id,usage_date) DO UPDATE SET calls=public.sandbox_ai_usage.calls+1
     WHERE public.sandbox_ai_usage.calls < 20 RETURNING calls`, [ctx.actorId]);
  return rows.length > 0;
}
