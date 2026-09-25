import { authenticateStaff, signStaffSession } from "@voltaris/core";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    const staff = await authenticateStaff(email, password);
    if (!staff) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    const response = NextResponse.json({ user: { displayName: staff.displayName, role: staff.role } });
    response.cookies.set(SESSION_COOKIE, signStaffSession(staff), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
    return response;
  } catch {
    return NextResponse.json({ error: "Sign in is unavailable. Please try again." }, { status: 500 });
  }
}
