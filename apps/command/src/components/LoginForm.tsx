"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to sign in.");
      window.location.assign("/");
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return <main className="login-page"><div className="login-art"><div className="login-brand"><span>ϟ</span><strong>voltaris<span>.</span></strong></div><div className="login-art-content"><span>VOLTARIS COMMAND</span><h1>Better decisions.<br/><em>Faster response.</em></h1><p>One accountable workflow from EV charger fault to technician dispatch.</p><div className="login-process"><div><b>01</b><span>Report</span></div><i/><div><b>02</b><span>Investigate</span></div><i/><div><b>03</b><span>Approve</span></div></div></div><div className="login-art-footer">Fictional company · Real operational workflow</div></div><div className="login-side"><div className="login-card"><div className="login-mobile-brand">ϟ <strong>voltaris<span>.</span></strong></div><span className="section-kicker">STAFF ACCESS</span><h2>Welcome to Command<span>.</span></h2><p>Sign in to review incidents and approve service work.</p>{error && <div className="login-error" role="alert">{error}</div>}<form onSubmit={signIn}><label>Email address<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="name@voltaris.example"/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password"/></label><button className="primary-button" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in to Command"}<span>→</span></button></form><div className="login-security">⌑ <span>Private workspace · Human-approved dispatch</span></div></div></div></main>;
}
