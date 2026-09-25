"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const body = await response.json();
      if (!response.ok) { setError(body.error || "Sign-in failed."); return; }
      window.location.href = "/";
    } catch { setError("Could not connect. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="login-page"><div className="login-illustration"><div className="login-logo"><span>V</span><strong>VOLTARIS</strong></div><div className="login-copy"><span>ENERGY INTELLIGENCE</span><h1>See the story behind every margin.</h1><p>Connected service operations and financial evidence, made clear for decisions that matter.</p></div><div className="login-bars" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /></div><div className="login-illustration-footer">MARGIN · SERVICE INTELLIGENCE</div></div><div className="login-form-side"><form className="login-card" onSubmit={submit}><div className="login-lock"><LockKeyhole size={22} /></div><span className="eyebrow">WELCOME BACK</span><h2>Sign in to Margin</h2><p>Use your Voltaris staff account to access service financial intelligence.</p><label htmlFor="email">Work email</label><input id="email" type="email" autoComplete="username" placeholder="name@voltaris.example" required value={email} onChange={e => setEmail(e.target.value)} /><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={e => setPassword(e.target.value)} />{error && <div className="login-error" role="alert">{error}</div>}<button className="login-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <>Sign in <ArrowRight size={18} /></>}</button><div className="login-assurance"><ShieldCheck size={15} /> Staff access · secure session</div></form><span className="login-disclaimer">Voltaris Energy is a fictional company. This product uses persisted synthetic records.</span></div></main>;
}
