import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { config } from "dotenv";
import { getPool } from "./db.js";

config({ path: resolve(process.cwd(), "../../.env.local") });

const migrationDir = fileURLToPath(new URL("../../../database/migrations/", import.meta.url));
for (const filename of (await readdir(migrationDir)).filter(name => /^\d+.*\.sql$/.test(name)).sort()) {
  const sql = await readFile(resolve(migrationDir, filename), "utf8");
  await getPool().query(sql);
  process.stdout.write(`Applied ${filename}\n`);
}
await getPool().end();
