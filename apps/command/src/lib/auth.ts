import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { withWorkspace, verifyStaffSession, type StaffUser } from "@voltaris/core";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

export const SESSION_COOKIE = "voltaris_session";

export async function getStaff(): Promise<StaffUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifyStaffSession(token) : null;
}

export async function inWorkspace<T>(user: StaffUser, operation: string, fn: () => Promise<T>): Promise<T> {
  const traceId = randomUUID();
  const start = performance.now();
  try { return await withWorkspace(user.workspaceSchema, user.id, traceId, fn); }
  catch (error) {
    console.error(JSON.stringify({ event: "request.error", traceId, product: "command", operation, workspace: user.workspaceSchema,
      error: error instanceof Error ? error.name : "UnknownError" }));
    throw error;
  } finally {
    console.info(JSON.stringify({ event: "request.complete", traceId, product: "command", operation,
      workspace: user.workspaceSchema, durationMs: Math.round(performance.now() - start) }));
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Your role does not permit this action." }, { status: 403 });
}

export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to complete the request.";
  const status = /not found/i.test(message) ? 404 : /invalid|required|unavailable|already|conflict|cannot|must|no qualified|no relevant|no pending/i.test(message) ? 400 : 500;
  if (status === 500) console.error(JSON.stringify({ event: "request.failed", product: "command",
    errorType: error instanceof Error ? error.name : "UnknownError" }));
  return NextResponse.json({ error: status === 500 ? "The operation could not be completed. Please try again." : message }, { status });
}

export function canDispatch(user: StaffUser) {
  return user.role === "admin" || user.role === "dispatcher";
}
