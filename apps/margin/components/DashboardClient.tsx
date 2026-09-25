"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, ChevronDown, CircleHelp, Clock3, FileText, Layers3, LoaderCircle, LogOut, Menu, RefreshCw, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import type { Analysis, AnalysisKey, Backlog, Dashboard, Evidence, EvidenceResult } from "@/lib/types";

type View = "overview" | "backlog";
type EvidenceFilter = "all" | "recognized_revenue" | "actual_cost";

const eur = (n: number, digits = 0) => new Intl.NumberFormat("en-DE", { style: "currency", currency: "EUR", maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
const pct = (n: number | null) => n === null ? "—" : `${n.toFixed(1)}%`;
const signedEur = (n: number) => `${n > 0 ? "+" : ""}${eur(n)}`;
const date = (s: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(s));
const categoryName = (s: string) => s.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (response.status === 401) { window.location.href = "/login"; throw new Error("Session expired"); }
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

function Brand() { return <div className="brand"><div className="brand-mark"><span>V</span></div><div className="brand-copy"><strong>VOLTARIS</strong><small>ENERGY INTELLIGENCE</small></div></div>; }

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "violet" | "amber" }) { return <span className={`pill pill-${tone}`}>{children}</span>; }

function Sparkline({ points, color = "#7e65e9" }: { points: number[]; color?: string }) {
  if (points.length < 2) return <span className="sparkline-empty" />;
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1;
  const path = points.map((v, i) => `${i === 0 ? "M" : "L"} ${i * (112 / (points.length - 1))} ${34 - ((v - min) / range) * 28}`).join(" ");
  return <svg viewBox="0 0 112 40" className="sparkline" aria-hidden="true"><path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MetricCard({ label, value, change, note, icon, points, tint }: { label: string; value: string; change?: number; note: string; icon: React.ReactNode; points: number[]; tint: string }) {
  return <div className="metric-card"><div className="metric-top"><span className="metric-icon" style={{ background: tint }}>{icon}</span><span className="metric-label">{label}</span></div><div className="metric-main"><strong>{value}</strong><Sparkline points={points} color={tint === "#e8f2ef" ? "#35a889" : "#8469e9"} /></div><div className="metric-foot">{change !== undefined && <span className={`change ${change >= 0 ? "positive" : "negative"}`}>{change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{signedEur(change)}</span>}<span>{note}</span></div></div>;
}

function TrendChart({ data }: { data: Dashboard["monthly"] }) {
  const max = Math.max(1, ...data.flatMap(d => [d.revenue, d.cost]));
  return <div className="trend-chart" role="img" aria-label="Monthly recognized revenue and actual cost chart">
    <div className="chart-grid"><span>{eur(max)}</span><span>{eur(max / 2)}</span><span>€0</span></div>
    <div className="chart-columns">{data.length ? data.map((d, i) => <div className="chart-month" key={`${d.label}-${i}`} title={`${d.label}: revenue ${eur(d.revenue)}, cost ${eur(d.cost)}`}><div className="bar-pair"><div className="bar revenue-bar" style={{ height: `${Math.max(2, 100 * d.revenue / max)}%` }} /><div className="bar cost-bar" style={{ height: `${Math.max(2, 100 * d.cost / max)}%` }} /></div><span>{d.label}</span></div>) : <div className="chart-empty">No actual events in this period</div>}</div>
  </div>;
}

function Drivers({ data, onEvidence }: { data: Dashboard["drivers"]; onEvidence: (kind: EvidenceFilter, category?: string) => void }) {
  const sorted = [...data].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6);
  const max = Math.max(1, ...sorted.map(d => Math.abs(d.delta)));
  return <div className="drivers-list">{sorted.length ? sorted.map((d, i) => <button className="driver-row" key={`${d.category}-${d.label}-${i}`} onClick={() => onEvidence(d.category === "revenue" ? "recognized_revenue" : "actual_cost", d.label)}><div className="driver-name"><span className={`driver-dot ${d.category}`} /> <span>{categoryName(d.label)}</span></div><div className="driver-bar"><span style={{ width: `${100 * Math.abs(d.delta) / max}%`, background: d.category === "revenue" ? "#8070e3" : "#edb67d" }} /></div><strong className={d.delta >= 0 ? "positive-text" : "negative-text"}>{signedEur(d.delta)}</strong><ArrowRight size={15} /></button>) : <p className="empty-inline">No category changes to display for this period.</p>}</div>;
}

function Overview({ dashboard, onEvidence }: { dashboard: Dashboard; onEvidence: (filter: EvidenceFilter) => void }) {
  const revChange = dashboard.current.revenue - dashboard.prior.revenue;
  const costChange = dashboard.current.cost - dashboard.prior.cost;
  const marginChange = dashboard.current.margin - dashboard.prior.margin;
  return <>
    <section className="metrics-grid" aria-label="Actual financial metrics">
      <MetricCard label="Recognized revenue" value={eur(dashboard.current.revenue)} change={revChange} note="vs. prior quarter" icon={<ArrowUpRight size={18} />} points={dashboard.monthly.map(m => m.revenue)} tint="#eae7fb" />
      <MetricCard label="Actual direct cost" value={eur(dashboard.current.cost)} change={costChange} note="vs. prior quarter" icon={<Layers3 size={18} />} points={dashboard.monthly.map(m => m.cost)} tint="#fdf0e4" />
      <MetricCard label="Service margin" value={eur(dashboard.current.margin)} change={marginChange} note="vs. prior quarter" icon={<BarChart3 size={18} />} points={dashboard.monthly.map(m => m.margin)} tint="#e8f2ef" />
      <div className="metric-card rate-card"><div className="metric-top"><span className="metric-icon" style={{ background: "#f1eefa" }}><ShieldCheck size={18} /></span><span className="metric-label">Margin rate</span></div><div className="rate-value">{pct(dashboard.current.marginPct)}</div><div className="rate-bottom"><span>Prior quarter</span><strong>{pct(dashboard.prior.marginPct)}</strong></div></div>
    </section>
    <div className="content-grid">
      <section className="panel trend-panel"><div className="panel-heading"><div><span className="eyebrow">PERFORMANCE</span><h2>Revenue and cost trend</h2><p>Posted financial events, by month</p></div><div className="legend"><span><i className="revenue-key" />Revenue</span><span><i className="cost-key" />Cost</span></div></div><TrendChart data={dashboard.monthly} /><div className="panel-footer"><span>Actuals only · {dashboard.eventCount} financial events</span><button className="text-button" onClick={() => onEvidence("all")}>View source records <ArrowRight size={15} /></button></div></section>
      <section className="panel change-panel"><div className="panel-heading"><div><span className="eyebrow">QUARTER COMPARISON</span><h2>What moved margin</h2><p>Current vs. prior quarter</p></div><span className={`delta-tag ${marginChange >= 0 ? "up" : "down"}`}>{marginChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}{signedEur(marginChange)}</span></div><div className="comparison"><div><span>Prior margin</span><strong>{eur(dashboard.prior.margin)}</strong></div><ArrowRight size={18} /><div><span>Current margin</span><strong>{eur(dashboard.current.margin)}</strong></div></div><div className="change-explain"><div><span className="mini-dot lavender" />Revenue movement</div><strong>{signedEur(revChange)}</strong></div><div className="change-explain"><div><span className="mini-dot peach" />Cost movement</div><strong>{signedEur(-costChange)}</strong></div><div className="formula-note">Margin change = revenue change − cost change</div></section>
    </div>
    <div className="content-grid lower-grid">
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">CONTRIBUTORS</span><h2>Revenue & cost drivers</h2><p>Largest changes by posted category</p></div><button className="icon-button" title="Open source records" onClick={() => onEvidence("all")}><ArrowRight size={18} /></button></div><Drivers data={dashboard.drivers} onEvidence={onEvidence} /></section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">GEOGRAPHY</span><h2>Regional performance</h2><p>Actual margin in the selected quarter</p></div></div><div className="region-table-wrap"><table className="region-table"><thead><tr><th>REGION</th><th>REVENUE</th><th>MARGIN</th><th>RATE</th></tr></thead><tbody>{dashboard.regionRows.length ? dashboard.regionRows.map(row => <tr key={row.region}><td><span className="region-icon">{row.region.slice(0, 2).toUpperCase()}</span>{row.region}</td><td>{eur(row.revenue)}</td><td>{eur(row.margin)}</td><td><span className={`rate-chip ${(row.marginPct || 0) < 0 ? "negative" : ""}`}>{pct(row.marginPct)}</span></td></tr>) : <tr><td colSpan={4} className="empty-cell">No regional actuals in this quarter</td></tr>}</tbody></table></div></section>
    </div>
  </>;
}

function BacklogView({ backlog, loading, error, retry }: { backlog: Backlog | null; loading: boolean; error: string | null; retry: () => void }) {
  if (loading) return <div className="page-state"><LoaderCircle className="spin" /><span>Loading open work orders…</span></div>;
  if (error) return <div className="page-state error-state"><CircleHelp /><strong>Backlog could not load</strong><span>{error}</span><button onClick={retry}>Try again</button></div>;
  if (!backlog) return null;
  return <><div className="backlog-intro"><div><span className="eyebrow">OPERATIONS OUTLOOK</span><h2>Approved work in the pipeline</h2><p>Forecasts come from open work orders. They are excluded from recognized revenue and actual direct cost until financial events are posted.</p></div><Pill tone="violet">Forecast, not actual</Pill></div><div className="backlog-metrics"><div><span>Open work orders</span><strong>{backlog.openCount}</strong></div><div><span>Forecast revenue</span><strong>{backlog.openCount && backlog.forecastRevenue === 0 ? "Not estimated" : eur(backlog.forecastRevenue)}</strong></div><div><span>Forecast direct cost</span><strong>{eur(backlog.forecastCost)}</strong></div><div><span>Forecast contribution</span><strong>{backlog.openCount && backlog.forecastRevenue === 0 ? "Not estimated" : eur(backlog.forecastRevenue - backlog.forecastCost)}</strong></div></div><section className="panel backlog-panel"><div className="panel-heading"><div><span className="eyebrow">WORK ORDER BACKLOG</span><h2>Open jobs</h2><p>Approved, scheduled and in-progress work</p></div></div><div className="backlog-table-wrap"><table className="backlog-table"><thead><tr><th>WORK ORDER</th><th>REGION / SITE</th><th>STATUS</th><th>SCHEDULED</th><th>FORECAST COST</th></tr></thead><tbody>{backlog.items.length ? backlog.items.map(item => <tr key={item.id}><td><strong>{item.title}</strong><small>#{item.id.slice(0, 8)}</small></td><td>{item.region}<small>{item.siteName}</small></td><td><Pill tone={item.status === "in_progress" ? "amber" : "violet"}>{item.status.replaceAll("_", " ")}</Pill></td><td>{item.scheduledFor ? date(item.scheduledFor) : "Unscheduled"}</td><td>{eur(item.forecastCost)}</td></tr>) : <tr><td colSpan={5} className="empty-cell">No open approved work orders in this region.</td></tr>}</tbody></table></div></section></>;
}

function EvidenceDrawer({ open, close, region, quarter, filter, category, setFilter }: { open: boolean; close: () => void; region: string; quarter: string; filter: EvidenceFilter; category: string | null; setFilter: (filter: EvidenceFilter) => void }) {
  const [records, setRecords] = useState<Evidence[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useMemo(() => `${region}|${quarter}|${filter}|${category || ""}`, [region, quarter, filter]);
  useEffect(() => { setRecords([]); setNextCursor(null); }, [requestId]);
  const load = useCallback(async (cursor?: string) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ region, quarter, kind: filter, limit: "30" });
      if (category) params.set("category", category);
      if (cursor) params.set("cursor", cursor);
      const result = await json<EvidenceResult>(`/api/evidence?${params}`);
      setRecords(previous => cursor ? [...previous, ...result.records] : result.records);
      setNextCursor(result.nextCursor);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load records"); }
    finally { setLoading(false); }
  }, [region, quarter, filter, category]);
  useEffect(() => { if (open) void load(); }, [open, load]);
  if (!open) return null;
  return <div className="drawer-backdrop" onClick={close}><aside className="evidence-drawer" onClick={e => e.stopPropagation()} aria-label="Financial event evidence"><div className="drawer-head"><div><span className="eyebrow">AUDITABLE EVIDENCE</span><h2>Source records</h2><p>{category ? `Posted ${category} events behind this driver` : "Posted financial events behind this view"}</p></div><button className="icon-button" title="Close evidence" onClick={close}><X size={20} /></button></div><div className="filter-tabs">{(["all", "recognized_revenue", "actual_cost"] as const).map(f => <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f === "all" ? "All events" : f === "recognized_revenue" ? "Revenue" : "Costs"}</button>)}</div>{loading && !records.length && <div className="drawer-state"><LoaderCircle className="spin" /> Loading records…</div>}{error && <div className="drawer-state error-state">{error} <button className="text-button" onClick={() => void load()}>Try again</button></div>}<div className="record-count">{records.length} source event{records.length === 1 ? "" : "s"} shown</div><div className="evidence-list">{records.map((row: Evidence) => <article className="evidence-record" key={row.id}><div className="record-top"><Pill tone={row.kind === "recognized_revenue" ? "green" : "amber"}>{row.kind === "recognized_revenue" ? "Recognized revenue" : "Actual cost"}</Pill><strong>{eur(row.amount)}</strong></div><h3>{row.description || row.category}</h3><p>{row.siteName} · {row.region}</p><div className="record-meta"><span><Clock3 size={13} />{date(row.occurredAt)}</span><span><FileText size={13} />Event {row.id.slice(0, 8)}</span>{row.workOrderId && <span>WO {row.workOrderId.slice(0, 8)}</span>}{row.sourceReference && <span>Source {row.sourceReference}</span>}</div></article>)}{!records.length && !loading && !error && <div className="drawer-state">No posted events match this filter.</div>}</div>{nextCursor && <button className="load-more" disabled={loading} onClick={() => void load(nextCursor)}>{loading ? "Loading…" : "Load more records"}</button>}</aside></div>;
}

const suggestionPrompts: Array<{ key: AnalysisKey; text: string }> = [
  { key: "margin_change", text: "Why did service margin change?" },
  { key: "revenue_drivers", text: "What changed recognized revenue?" },
  { key: "cost_drivers", text: "What drove actual direct costs?" },
  { key: "backlog", text: "What is in the service backlog?" },
];

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [region, setRegion] = useState("all");
  const [quarter, setQuarter] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [backlog, setBacklog] = useState<Backlog | null>(null);
  const [loading, setLoading] = useState(true);
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backlogError, setBacklogError] = useState<string | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilter>("all");
  const [evidenceCategory, setEvidenceCategory] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  const loadDashboard = useCallback(async () => { setLoading(true); setError(null); try { const params = new URLSearchParams({ region }); if (quarter) params.set("quarter", quarter); const result = await json<Dashboard>(`/api/dashboard?${params}`); setDashboard(result); setAvailableRegions(previous => [...new Set([...previous, ...result.regions])].sort()); if (!quarter) setQuarter(result.current.key); } catch (e) { setError(e instanceof Error ? e.message : "Could not load dashboard"); } finally { setLoading(false); } }, [region, quarter]);
  const loadBacklog = useCallback(async () => { setBacklogLoading(true); setBacklogError(null); try { setBacklog(await json<Backlog>(`/api/backlog?${new URLSearchParams({ region })}`)); } catch (e) { setBacklogError(e instanceof Error ? e.message : "Could not load backlog"); } finally { setBacklogLoading(false); } }, [region]);
  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
  useEffect(() => { if (view === "backlog") void loadBacklog(); }, [view, loadBacklog]);
  useEffect(() => { setAnalysis(null); setAskError(null); }, [region, quarter]);

  async function ask(input: string, chosen?: AnalysisKey) { if (!input.trim() || askLoading) return; setQuestion(input); setAskLoading(true); setAskError(null); setAnalysis(null); try { setAnalysis(await json<Analysis>("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: input, analysis: chosen, region, quarter }) })); } catch (e) { setAskError(e instanceof Error ? e.message : "Analysis unavailable"); } finally { setAskLoading(false); } }
  async function logout() { await fetch("/api/logout", { method: "POST" }); window.location.href = "/login"; }
  const currentLabel = dashboard?.current.label || "Current quarter";
  const openEvidence = (filter: EvidenceFilter, category?: string) => { setEvidenceFilter(filter); setEvidenceCategory(category || null); setEvidenceOpen(true); };
  const updatedLabel = useMemo(() => dashboard?.updatedAt ? date(dashboard.updatedAt) : null, [dashboard?.updatedAt]);

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}><Brand /><div className="side-section-label">WORKSPACE</div><nav className="side-nav" aria-label="Main navigation"><button className={view === "overview" ? "active" : ""} onClick={() => { setView("overview"); setMobileMenu(false); }}><BarChart3 size={19} /> Overview</button><button className={view === "backlog" ? "active" : ""} onClick={() => { setView("backlog"); setMobileMenu(false); }}><Layers3 size={19} /> Service backlog</button><button onClick={() => { openEvidence("all"); setMobileMenu(false); }}><FileText size={19} /> Financial events</button></nav><div className="sidebar-bottom"><div className="data-card"><span className="data-card-icon"><ShieldCheck size={17} /></span><strong>Traceable by design</strong><p>Every metric links to posted source records.</p></div><button className="logout" onClick={logout}><LogOut size={18} /> Sign out</button><div className="side-version">MARGIN <span>·</span> VOLTARIS ENERGY</div></div></aside>
    {mobileMenu && <div className="mobile-scrim" onClick={() => setMobileMenu(false)} />}
    <main className="main-area"><header className="topbar"><button className="mobile-menu-button" aria-label="Open menu" onClick={() => setMobileMenu(true)}><Menu size={23} /></button><div className="breadcrumb">Workspace <span>/</span> <strong>{view === "overview" ? "Overview" : "Service backlog"}</strong></div><div className="topbar-right"><span className="live-dot" /> Live from posted records <span className="topbar-divider" /><Pill tone="violet">Fictional company</Pill></div></header>
      <div className="page-wrap"><div className="page-title-row"><div><div className="page-kicker"><span className="kicker-line" /> REVENUE & OPERATIONS INTELLIGENCE</div><h1>{view === "overview" ? "Service margin overview" : "Service backlog"}</h1><p>{view === "overview" ? "See what changed, understand why, and trace every number to its source." : "Approved work orders and their forecast contribution to future service margin."}</p></div><div className="title-actions"><button className="refresh-button" title="Refresh data" onClick={() => { if (view === "overview") void loadDashboard(); else void loadBacklog(); }}><RefreshCw size={16} /> Refresh</button></div></div>
        <div className="toolbar"><div className="toolbar-left"><label>REGION <span className="select-wrap"><select value={region} onChange={e => setRegion(e.target.value)}><option value="all">All regions</option>{availableRegions.map(r => <option key={r} value={r}>{r}</option>)}</select><ChevronDown size={15} /></span></label>{view === "overview" && <label>PERIOD <span className="select-wrap"><select value={quarter} onChange={e => setQuarter(e.target.value)}>{dashboard?.availableQuarters.map(q => <option key={q.key} value={q.key}>{q.label}</option>)}{!dashboard && <option value="">Current quarter</option>}</select><ChevronDown size={15} /></span></label>}</div><div className="toolbar-meta"><span><Clock3 size={14} /> {updatedLabel ? `Updated ${updatedLabel}` : "Loading live data"}</span>{dashboard?.synthetic && <Pill tone="amber">Synthetic company records</Pill>}</div></div>
        {view === "overview" ? <>{loading && <div className="page-state"><LoaderCircle className="spin" /><span>Calculating service margin from posted events…</span></div>}{error && <div className="page-state error-state"><CircleHelp /><strong>Dashboard could not load</strong><span>{error}</span><button onClick={() => void loadDashboard()}>Try again</button></div>}{!loading && !error && dashboard && <><Overview dashboard={dashboard} onEvidence={openEvidence} /><section className="ask-panel" id="ask-business"><div className="ask-intro"><div className="ask-icon"><Sparkles size={21} /></div><div><span className="eyebrow">ASK YOUR BUSINESS</span><h2>Turn numbers into an answer</h2><p>Questions use approved analyses of computed metrics and linked records.</p></div></div><div className="suggestion-row">{suggestionPrompts.map(p => <button key={p.key} onClick={() => void ask(p.text, p.key)} disabled={askLoading}>{p.text} <ArrowRight size={13} /></button>)}</div><form className="ask-form" onSubmit={e => { e.preventDefault(); void ask(question); }}><Search size={19} /><input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask about margin, revenue, costs, or backlog…" aria-label="Ask your business" /><button disabled={!question.trim() || askLoading}>{askLoading ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={19} />}</button></form>{askError && <div className="ask-error"><CircleHelp size={17} />{askError}</div>}{analysis && <div className="answer-card"><div className="answer-header"><Sparkles size={17} /><strong>Analysis</strong><Pill tone={analysis.generatedBy === "ai_grounded" ? "violet" : "green"}>{analysis.generatedBy === "ai_grounded" ? "AI explanation of computed data" : "Computed from records"}</Pill></div><h3>{analysis.question}</h3><p>{analysis.answer}</p><div className="answer-evidence">{analysis.evidence.map((e, i) => <div key={`${e.label}-${i}`}><span>{e.label}</span><strong>{e.value}</strong>{e.detail && <small>{e.detail}</small>}</div>)}</div>{analysis.caveat && <div className="answer-caveat">{analysis.caveat}</div>}<button className="text-button" onClick={() => openEvidence("all")}>Inspect financial records <ArrowRight size={15} /></button></div>}</section></>}</> : <BacklogView backlog={backlog} loading={backlogLoading} error={backlogError} retry={() => void loadBacklog()} />}
        <footer className="footer"><span>Voltaris Energy is a fictional company. Figures are calculated from persisted synthetic records.</span><span>Actuals and forecasts are always shown separately.</span></footer>
      </div>
    </main>
    <EvidenceDrawer open={evidenceOpen} close={() => setEvidenceOpen(false)} region={region} quarter={quarter} filter={evidenceFilter} category={evidenceCategory} setFilter={filter => { setEvidenceFilter(filter); setEvidenceCategory(null); }} />
  </div>;
}
