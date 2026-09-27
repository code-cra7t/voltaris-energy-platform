import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { getPool } from "./db.js";
import { hashStaffPassword } from "./auth.js";
import { SANDBOX_SEED_SQL } from "./sandbox-fixture.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
config({ path: resolve(root, ".env.local") });
const url = new URL(process.env.DATABASE_URL || "");
url.hostname = url.hostname.replace("-pooler.", ".");
process.env.DATABASE_URL = url.toString();

const email = process.argv[2]?.trim().toLowerCase();
const displayName = process.argv[3]?.trim() || "Operations reviewer";
const days = Number(process.argv[4] || "30");
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !Number.isInteger(days) || days < 1 || days > 90) {
  throw new Error("Usage: create-sandbox.ts email display-name [days: 1-90]");
}

const schema = `sandbox_${randomBytes(10).toString("hex")}`;
const password = process.env.SANDBOX_PASSWORD || randomBytes(24).toString("base64url");
const migration = await readFile(resolve(root, "database/migrations/001_init.sql"), "utf8");
const client = await getPool().connect();
try {
  await client.query("BEGIN");
  const staff = await client.query<{ id: string }>(
    `INSERT INTO public.staff_users(email,display_name,role,password_hash,workspace_schema)
     VALUES($1,$2,'dispatcher',$3,$4) RETURNING id::text`,
    [email, displayName, hashStaffPassword(password), schema]);
  const ownerId = staff.rows[0]?.id;
  if (!ownerId) throw new Error("Could not create reviewer account");
  await client.query(
    `INSERT INTO public.reviewer_workspaces(schema_name,owner_id,expires_at)
     VALUES($1,$2::uuid,now()+($3::integer*interval '1 day'))`, [schema, ownerId, days]);
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET LOCAL search_path TO "${schema}", public`);
  await client.query(migration);
  await client.query(SANDBOX_SEED_SQL);
  await client.query("COMMIT");
  const path = resolve(root, `.env.sandbox-${schema}.local`);
  await writeFile(path, `REVIEWER_EMAIL=${email}\nREVIEWER_PASSWORD=${password}\nWORKSPACE_SCHEMA=${schema}\n`, { mode: 0o600, flag: "wx" });
  process.stdout.write(`Created ${schema} for ${email}; credentials saved to ${path}\n`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await getPool().end();
}
