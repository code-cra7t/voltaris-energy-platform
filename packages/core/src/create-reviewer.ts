import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { hashStaffPassword } from "./auth.js";
import { getPool } from "./db.js";

const root = resolve(process.cwd(), "../..");
config({ path: resolve(root, ".env.local") });

const email = "reviewer@voltaris.example";
const password = randomBytes(30).toString("base64url");
const pool = getPool();
try {
  const result = await pool.query(
    `INSERT INTO staff_users(email,display_name,role,password_hash)
     VALUES($1,'Portfolio Reviewer','manager',$2)
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [email, hashStaffPassword(password)],
  );
  if (!result.rowCount) throw new Error("Reviewer already exists; credentials were not changed");
  const path = resolve(root, ".env.reviewer.local");
  await writeFile(path, `REVIEWER_EMAIL=${email}\nREVIEWER_PASSWORD=${password}\n`, { mode: 0o600, flag: "wx" });
  process.stdout.write(`Read-only reviewer account created. Credentials saved to ${path}\n`);
} finally {
  await pool.end();
}
