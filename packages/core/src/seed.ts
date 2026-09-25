import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { config } from "dotenv";
import { getPool } from "./db.js";
import { hashStaffPassword } from "./auth.js";

config({ path: resolve(process.cwd(), "../../.env.local") });

const seedPath = fileURLToPath(new URL("../../../database/seed.sql", import.meta.url));
const sql = await readFile(seedPath, "utf8");
await getPool().query(sql);

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (email && password) {
  const displayName = email.split("@")[0] || "Voltaris Admin";
  await getPool().query(
    `INSERT INTO staff_users(email,display_name,role,password_hash)
     VALUES($1,$2,'admin',$3) ON CONFLICT (email) DO NOTHING`,
    [email.toLowerCase(), displayName, hashStaffPassword(password)],
  );
  process.stdout.write("Seeded Voltaris records and admin account\n");
} else {
  process.stdout.write("Seeded Voltaris records; set ADMIN_EMAIL and ADMIN_PASSWORD to create an admin account\n");
}
await getPool().end();
