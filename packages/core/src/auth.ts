import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { queryPublic, validWorkspaceSchema } from "./db.js";
import type { StaffUser } from "./types.js";

const SESSION_DURATION_SECONDS = 8 * 60 * 60;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return secret;
}

export function hashStaffPassword(password: string): string {
  if (password.length < 12) {
    throw new Error("Staff password must be at least 12 characters");
  }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [algorithm, salt, hex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  if (expected.length !== 64) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, expected);
}

export async function authenticateStaff(
  email: string,
  password: string,
): Promise<StaffUser | null> {
  const rows = await queryPublic<{
    id: string;
    email: string;
    display_name: string;
    role: StaffUser["role"];
    password_hash: string;
    workspace_schema: string;
  }>(
    `SELECT s.id::text, s.email, s.display_name, s.role, s.password_hash, s.workspace_schema
     FROM public.staff_users s
     LEFT JOIN public.reviewer_workspaces w ON w.owner_id = s.id
     WHERE lower(s.email) = lower($1)
       AND (s.workspace_schema = 'public' OR (w.active AND w.expires_at > now())) LIMIT 1`,
    [email.trim()],
  );
  const row = rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    workspaceSchema: validWorkspaceSchema(row.workspace_schema) ? row.workspace_schema : "public",
  };
}

export function signStaffSession(user: StaffUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      workspaceSchema: user.workspaceSchema,
      exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", sessionSecret())
    .update(`v1.${payload}`)
    .digest("base64url");
  return `v1.${payload}.${signature}`;
}

export function verifyStaffSession(token: string): StaffUser | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const payload = parts[1];
  const signature = parts[2];
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", sessionSecret())
    .update(`v1.${payload}`)
    .digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    if (
      typeof data.sub !== "string" ||
      typeof data.email !== "string" ||
      typeof data.displayName !== "string" ||
      !["admin", "dispatcher", "manager"].includes(String(data.role)) ||
      typeof data.exp !== "number" ||
      data.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return {
      id: data.sub,
      email: data.email,
      displayName: data.displayName,
      role: data.role as StaffUser["role"],
      workspaceSchema: typeof data.workspaceSchema === "string" && validWorkspaceSchema(data.workspaceSchema) ? data.workspaceSchema : "public",
    };
  } catch {
    return null;
  }
}
