import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { config } from "dotenv";
import { getPool } from "./db.js";

config({ path: resolve(process.cwd(), "../../.env.local") });

const migrationPath = fileURLToPath(
  new URL("../../../database/migrations/001_init.sql", import.meta.url),
);
const sql = await readFile(migrationPath, "utf8");
await getPool().query(sql);
await getPool().end();
process.stdout.write("Applied database/migrations/001_init.sql\n");
