import { NextRequest, NextResponse } from "next/server";
import { authenticateStaff, signStaffSession } from "@voltaris/core";

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your email and password." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || email.length > 255 || password.length > 500) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  try {
    const user = await authenticateStaff(email, password);
    if (!user) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    const response = NextResponse.json({ user: { displayName: user.displayName, role: user.role } });
    response.cookies.set("voltaris_session", signStaffSession(user), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
    return response;
  } catch (error) {
    console.error("Margin sign-in failed", error);
    return NextResponse.json({ error: "Sign-in is temporarily unavailable. Try again." }, { status: 500 });
  }
}
