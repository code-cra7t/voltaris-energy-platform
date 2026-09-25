import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyStaffSession } from "@voltaris/core";
import type { Quarter, StaffUser } from "@voltaris/core";

export async function staff(): Promise<StaffUser | null> {
  const token = (await cookies()).get("voltaris_session")?.value;
  return token ? verifyStaffSession(token) : null;
}

export function unauthorized() { return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 }); }
export function failed(error: unknown) {
  console.error("Margin request failed", error);
  return NextResponse.json({ error: "The requested data is temporarily unavailable. Please try again." }, { status: 500 });
}
export function badRequest(error: string) { return NextResponse.json({ error }, { status: 400 }); }

export function parseRegion(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "all") return null;
  if (trimmed.length > 100) throw new Error("Invalid region");
  return trimmed;
}

export function parseQuarter(value: string | null): Quarter | undefined {
  if (!value) return undefined;
  if (!/^20\d{2}-Q[1-4]$/.test(value)) throw new Error("Invalid quarter");
  return value;
}

export function quarterPeriod(key: string) {
  const [yearText, quarterText] = key.split("-Q");
  const year = Number(yearText), q = Number(quarterText);
  const start = new Date(Date.UTC(year, (q - 1) * 3, 1));
  const end = new Date(Date.UTC(year, q * 3, 0));
  return { key, label: `Q${q} ${year}`, start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function priorQuarters(key: string, count = 6) {
  const [yearText, quarterText] = key.split("-Q");
  let year = Number(yearText), q = Number(quarterText);
  const result = [];
  for (let i = 0; i < count; i++) { result.push(quarterPeriod(`${year}-Q${q}`)); q--; if (q === 0) { q = 4; year--; } }
  return result;
}
