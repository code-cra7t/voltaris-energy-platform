import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyStaffSession, type StaffUser } from "@voltaris/core";

export const SESSION_COOKIE = "voltaris_session";

export async function getStaff(): Promise<StaffUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifyStaffSession(token) : null;
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
  if (status === 500) console.error("Command API error", error);
  return NextResponse.json({ error: status === 500 ? "The operation could not be completed. Please try again." : message }, { status });
}

export function canDispatch(user: StaffUser) {
  return user.role === "admin" || user.role === "dispatcher";
}
