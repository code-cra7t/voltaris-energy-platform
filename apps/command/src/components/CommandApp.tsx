"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Asset, IncidentDetail, IncidentSummary, Citation } from "@/lib/types";

type View = "queue" | "evidence" | "activity";
type BusyAction = "create" | "analyze" | "propose" | "approve" | "reject" | "complete" | null;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { window.location.assign("/login"); throw new Error("Your session has expired. Sign in again."); }
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : `Request failed (${response.status})`);
  return data as T;
}

function formatDate(value?: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin", ...options }).format(parsed);
}

function formatMoney(value: number | null | undefined, currency = "EUR") {
  return value == null ? "Pending estimate" : new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function statusLabel(status: string) {
  return ({ reported: "Reported", analyzing: "Analyzing", analyzed: "Analysis ready", proposed: "Awaiting approval", approved: "Scheduled", rejected: "Proposal rejected", completed: "Completed" } as Record<string, string>)[status] ?? status.replaceAll("_", " ");
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const paths: Record<string, React.ReactNode> = {
    bolt: <><path d="m13 2-9 11h7l-1 9 10-12h-7l1-8Z" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    file: <><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z"/><path d="M13 3v7h7M8 15h8M8 18h5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
    chevron: <><path d="m9 18 6-6-6-6"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    x: <><path d="M5 5l14 14M19 5 5 19"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.8 9A7 7 0 0 1 18.2 6L20 12M4 12l1.8 6A7 7 0 0 0 18.2 15"/></>,
    spark: <><path d="m12 2 1.7 7.3L21 11l-7.3 1.7L12 20l-1.7-7.3L3 11l7.3-1.7L12 2ZM19 18l.5 1.5L21 20l-1.5.5L19 22l-.5-1.5L17 20l1.5-.5L19 18Z"/></>,
    shield: <><path d="M12 2 4 5v6c0 5 3.3 8.5 8 11 4.7-2.5 8-6 8-11V5l-8-3Z"/><path d="m9 12 2 2 4-4"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    log: <><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5M14 7l5 5-5 5M19 12H9"/></>,
    tool: <><path d="M14.5 6.5a5 5 0 0 0-6.8 6.8L3 18l3 3 4.7-4.7a5 5 0 0 0 6.8-6.8L14 13l-3-3 3.5-3.5Z"/></>,
  };
  return <svg {...common}>{paths[name] ?? paths.grid}</svg>;
}

function CitationChip({ citation, onClick }: { citation: Citation; onClick: () => void }) {
  return <button className="citation-chip" type="button" onClick={onClick}><Icon name="file" size={13}/>{citation.label}<Icon name="chevron" size={12}/></button>;
}

export function CommandApp({ staffName, canDispatch }: { staffName: string; canDispatch: boolean }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [view, setView] = useState<View>("queue");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showReport, setShowReport] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [description, setDescription] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [showCompletion, setShowCompletion] = useState(false);
  const [actualCost, setActualCost] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [assetData, incidentData] = await Promise.all([request<Asset[]>("/api/assets"), request<IncidentSummary[]>("/api/incidents")]);
      setAssets(assetData); setIncidents(incidentData);
      setSelectedId(previous => previous ?? incidentData[0]?.id ?? null);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true); setError(null);
    try { setDetail(await request<IncidentDetail>(`/api/incidents/${encodeURIComponent(id)}`)); }
    catch (err) { setDetail(null); setError((err as Error).message); }
    finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (selectedId) void loadDetail(selectedId); else setDetail(null); }, [selectedId, loadDetail]);

  const filtered = useMemo(() => incidents.filter(incident => {
    const matchesFilter = filter === "all" || (filter === "open" ? !["approved", "completed"].includes(incident.status) : incident.status === filter);
    const term = search.toLowerCase().trim();
    return matchesFilter && (!term || `${incident.reference} ${incident.title} ${incident.asset.code} ${incident.asset.siteName}`.toLowerCase().includes(term));
  }), [incidents, filter, search]);
  const openCount = incidents.filter(item => !["approved", "completed"].includes(item.status)).length;
  const approvalCount = incidents.filter(item => item.status === "proposed").length;
  const scheduledCount = incidents.filter(item => item.status === "approved").length;

  async function createIncident(event: FormEvent) {
    event.preventDefault(); setBusy("create"); setError(null); setNotice(null);
    try {
      const result = await request<{ id: string }>("/api/incidents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetId, description: description.trim() }) });
      setShowReport(false); setDescription(""); setNotice("Incident reported. Review the record, then run the evidence analysis.");
      await load(); setSelectedId(result.id); setView("queue");
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(null); }
  }

  async function runAction(action: Exclude<BusyAction, "create" | null>, body?: object) {
    if (!detail) return;
    setBusy(action); setError(null); setNotice(null);
    try {
      const path = action === "analyze" || action === "propose" ? action : action === "complete" ? "complete" : "decision";
      const payload = action === "approve" || action === "reject" ? { decision: action, proposalId: detail.proposal?.id, note: decisionNote.trim() } : body ?? {};
      const next = await request<IncidentDetail>(`/api/incidents/${encodeURIComponent(detail.id)}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setDetail(next); setDecisionNote("");
      if (action === "complete") { setShowCompletion(false); setActualCost(""); setCompletionNote(""); }
      setIncidents(current => current.map(item => item.id === next.id ? next : item));
      setNotice(({ analyze: "Analysis saved with its evidence and activity record.", propose: "Dispatch proposal is ready for staff review.", approve: "Approved and scheduled. A work order has been created.", reject: "Proposal rejected and recorded in the audit trail.", complete: "Work order completed and recorded." } as Record<string, string>)[action]);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(null); }
  }

  async function logout() {
    try { await request("/api/auth/logout", { method: "POST" }); window.location.assign("/login"); }
    catch (err) { setError((err as Error).message); }
  }

  function showCitation(id: string) {
    const citation = detail?.citations.find(item => item.id === id);
    if (citation) setActiveCitation(citation);
  }

  const navigation = [
    { id: "queue" as const, label: "Incident queue", icon: "grid" },
    { id: "evidence" as const, label: "Evidence", icon: "file" },
    { id: "activity" as const, label: "Audit activity", icon: "clock" },
  ];

  function submitCompletion(event: FormEvent) {
    event.preventDefault();
    const amount = Number(actualCost);
    if (!Number.isFinite(amount) || amount < 0 || !completionNote.trim()) { setError("Enter a valid actual cost and completion note."); return; }
    void runAction("complete", { workOrderId: detail?.workOrder?.id, actualCostCents: Math.round(amount * 100), completionNote: completionNote.trim() });
  }

  return <div className="app-shell">
    {mobileMenu && <button className="mobile-backdrop" type="button" aria-label="Close menu" onClick={() => setMobileMenu(false)}/>}
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="brand"><span className="brand-mark"><Icon name="bolt" size={22}/></span><span><strong>voltaris<span className="brand-dot">.</span></strong><small>ENERGY OPERATIONS</small></span></div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace-picker"><span className="workspace-emblem">V</span><span><strong>Command</strong><small>AI operations agent</small></span><span className="live-dot" title="Live workspace"/></div>
      <div className="nav-label">OPERATIONS</div>
      <nav aria-label="Main navigation">{navigation.map(item => <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} type="button" onClick={() => { setView(item.id); setMobileMenu(false); }}><Icon name={item.icon} size={18}/>{item.label}{item.id === "queue" && openCount > 0 && <span className="nav-count">{openCount}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="guardrail"><Icon name="shield" size={18}/><div><strong>Human in control</strong><span>Every dispatch needs staff approval.</span></div></div><button className="signout" type="button" onClick={logout}><Icon name="log" size={17}/> Sign out</button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" type="button" aria-label="Open menu" onClick={() => setMobileMenu(!mobileMenu)}><Icon name="menu"/></button><div className="breadcrumbs"><span>Operations</span><Icon name="chevron" size={14}/><strong>{navigation.find(item => item.id === view)?.label}</strong></div><div className="topbar-right"><span className="env-pill"><span/> Live workspace</span><span className="topbar-divider"/><span className="avatar" title={staffName}>{staffName.split(/\s+/).map(part => part[0]).join("").slice(0,2).toUpperCase()}</span></div></header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> SERVICE INTELLIGENCE</div><h1>Command center<span className="title-period">.</span></h1><p>Investigate charger faults, review evidence, and schedule the right response.</p></div>{canDispatch && <button className="primary-button report-button" type="button" onClick={() => { setShowReport(true); setError(null); }}><Icon name="plus" size={18}/> Report incident</button>}</div>

        {error && <div className="alert error" role="alert"><span>{error}</span><button type="button" onClick={() => { setError(null); void load(); }}>Retry <Icon name="arrow" size={15}/></button></div>}
        {notice && <div className="alert success" role="status"><Icon name="check" size={17}/><span>{notice}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}><Icon name="x" size={15}/></button></div>}

        <section className="stats" aria-label="Operations overview"><div className="stat-card"><div className="stat-icon orange"><Icon name="bolt" size={21}/></div><div><span>Open incidents</span><strong>{loading ? "—" : openCount}</strong><small>Need investigation or decision</small></div></div><div className="stat-card"><div className="stat-icon blue"><Icon name="shield" size={21}/></div><div><span>Awaiting approval</span><strong>{loading ? "—" : approvalCount}</strong><small>Ready for staff review</small></div></div><div className="stat-card"><div className="stat-icon green"><Icon name="tool" size={21}/></div><div><span>Scheduled work</span><strong>{loading ? "—" : scheduledCount}</strong><small>Approved service visits</small></div></div></section>

        <div className="work-grid">
          <section className="queue-panel"><div className="panel-heading"><div><span className="section-kicker">INCIDENTS</span><h2>Service queue <span>{filtered.length}</span></h2></div><button className="icon-button" type="button" title="Refresh incidents" aria-label="Refresh incidents" onClick={() => void load()}><Icon name="refresh" size={17}/></button></div><div className="queue-tools"><label className="search-box"><Icon name="search" size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search incidents" aria-label="Search incidents"/></label><select value={filter} onChange={event => setFilter(event.target.value)} aria-label="Filter incidents"><option value="all">All status</option><option value="open">Open</option><option value="proposed">Awaiting approval</option><option value="approved">Scheduled</option><option value="completed">Completed</option></select></div>
            {loading ? <div className="queue-loading"><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></div> : filtered.length === 0 ? <div className="empty-queue"><div className="empty-icon"><Icon name="grid" size={22}/></div><strong>{incidents.length === 0 ? "No incidents yet" : "No matching incidents"}</strong><p>{incidents.length === 0 ? "Report a charger fault to start the service workflow." : "Try a different search or status filter."}</p></div> : <div className="incident-list">{filtered.map(item => <button key={item.id} type="button" className={`incident-row ${selectedId === item.id ? "selected" : ""}`} onClick={() => { setSelectedId(item.id); setActiveCitation(null); }}><div className="row-top"><span className="incident-reference">{item.reference}</span><span className={`status status-${item.status}`}>{statusLabel(item.status)}</span></div><strong>{item.title}</strong><div className="row-meta"><span><Icon name="bolt" size={13}/>{item.asset.code}</span><span>{formatDate(item.createdAt, { dateStyle: "medium", timeStyle: undefined })}</span></div><div className="row-site">{item.asset.siteName} · {item.asset.region}</div></button>)}</div>}
          </section>

          <section className="detail-panel" aria-live="polite">{detailLoading ? <div className="detail-loading"><div className="skeleton short"/><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></div> : !detail ? <div className="detail-empty"><div className="detail-empty-graphic"><Icon name="bolt" size={30}/></div><h2>Select an incident</h2><p>Choose a report from the queue to investigate its evidence and dispatch options.</p></div> : <>
            <div className="detail-header"><div><div className="detail-ref"><span>{detail.reference}</span><span className={`status status-${detail.status}`}>{statusLabel(detail.status)}</span></div><h2>{detail.title}</h2><p>{detail.description}</p></div><div className="detail-time">Reported {formatDate(detail.createdAt)}</div></div>
            <div className="context-grid"><div className="context-item"><span>ASSET</span><strong>{detail.asset.code}</strong><small>{detail.asset.name}</small></div><div className="context-item"><span>SITE</span><strong>{detail.site.name}</strong><small>{detail.site.region}</small></div><div className="context-item"><span>SERVICE LEVEL</span><strong>{detail.contract?.name ?? "No contract"}</strong><small>{detail.contract?.slaDueAt ? `Due ${formatDate(detail.contract.slaDueAt)}` : detail.contract?.responseHours ? `${detail.contract.responseHours}h response` : "Check coverage"}</small></div></div>

            {view === "queue" && <div className="detail-body"><div className="section-title"><span className="section-number">01</span><div><span className="section-kicker">EVIDENCE ENGINE</span><h3>Incident analysis</h3></div></div>{detail.analysis ? <div className="analysis-card"><div className="analysis-heading"><span className="ai-mark"><Icon name="spark" size={17}/></span><div><strong>Evidence-backed assessment</strong><small>Generated {formatDate(detail.analysis.generatedAt)}{detail.analysis.model ? ` · ${detail.analysis.model}` : ""}</small></div></div><p className="analysis-summary">{detail.analysis.summary}</p><div className="findings">{detail.analysis.findings.map((finding, index) => <div className="finding" key={`${finding.title}-${index}`}><div className="finding-index">{String(index + 1).padStart(2, "0")}</div><div><div className="finding-heading"><strong>{finding.title}</strong>{finding.confidence && <span>{finding.confidence}</span>}</div><p>{finding.explanation}</p><div className="citation-list">{finding.citationIds.map(id => { const citation = detail.citations.find(item => item.id === id); return citation ? <CitationChip key={id} citation={citation} onClick={() => showCitation(id)}/> : null; })}</div></div></div>)}</div><div className="safety-note"><Icon name="shield" size={18}/><span>{detail.analysis.safetyNote}</span></div></div> : <div className="step-empty"><span className="step-icon"><Icon name="spark" size={22}/></span><div><strong>Start with the facts</strong><p>Command will review maintenance history and guidance, then cite every finding.</p></div>{canDispatch && <button className="secondary-button" type="button" disabled={busy !== null} onClick={() => void runAction("analyze")}>{busy === "analyze" ? "Analyzing…" : "Analyze incident"}<Icon name="arrow" size={16}/></button>}</div>}
              <div className="section-title second"><span className="section-number">02</span><div><span className="section-kicker">DISPATCH PLANNING</span><h3>Response plan</h3></div></div>{detail.proposal ? <div className="proposal-card"><div className="proposal-top"><div><span className="proposal-icon"><Icon name="tool" size={20}/></span><span><strong>Technician & appointment</strong><small>Availability and skills checked before this proposal</small></span></div><span className={`status status-${detail.proposal.status}`}>{detail.proposal.status === "pending" ? "Needs approval" : statusLabel(detail.proposal.status)}</span></div><div className="proposal-grid"><div><span>TECHNICIAN</span><strong>{detail.proposal.technician.name}</strong><small>{detail.proposal.technician.skills.join(" · ")}</small></div><div><span>APPOINTMENT</span><strong>{formatDate(detail.proposal.slot.start)}</strong><small>Until {formatDate(detail.proposal.slot.end)}</small></div><div><span>FORECAST COST</span><strong>{formatMoney(detail.proposal.estimatedCost, detail.proposal.currency)}</strong><small>Not an actual cost</small></div></div><p className="proposal-rationale">{detail.proposal.rationale}</p>{detail.proposal.status === "rejected" && canDispatch && <div className="rebuild-control"><button className="secondary-button" type="button" disabled={busy !== null} onClick={() => void runAction("propose")}>{busy === "propose" ? "Checking…" : "Build a new proposal"}<Icon name="arrow" size={16}/></button></div>}{detail.proposal.status === "pending" && canDispatch && <div className="approval-controls"><label htmlFor="decision-note">Rejection reason <span>optional; used only if rejected</span></label><textarea id="decision-note" value={decisionNote} onChange={event => setDecisionNote(event.target.value)} placeholder="Add context for the audit trail" rows={2}/><div><button className="reject-button" type="button" disabled={busy !== null} onClick={() => void runAction("reject")}><Icon name="x" size={16}/>{busy === "reject" ? "Recording…" : "Reject proposal"}</button><button className="primary-button" type="button" disabled={busy !== null} onClick={() => void runAction("approve")}><Icon name="check" size={17}/>{busy === "approve" ? "Scheduling…" : "Approve & schedule"}</button></div></div>}</div> : <div className="step-empty"><span className="step-icon blue-step"><Icon name="map" size={22}/></span><div><strong>Find the right response</strong><p>Check skill, available slot, and service deadline before a human decision.</p></div>{canDispatch && <button className="secondary-button" type="button" disabled={busy !== null || !detail.analysis} onClick={() => void runAction("propose")}>{busy === "propose" ? "Checking…" : "Build proposal"}<Icon name="arrow" size={16}/></button>}</div>}
              {detail.workOrder && <><div className="section-title second"><span className="section-number">03</span><div><span className="section-kicker">APPROVED ACTION</span><h3>Work order</h3></div></div><div className="work-order-card"><div className="work-order-icon"><Icon name="check" size={22}/></div><div><strong>{detail.workOrder.reference}</strong><p>{detail.workOrder.technicianName} · {formatDate(detail.workOrder.scheduledStart)}</p><span className="work-order-state">{statusLabel(detail.workOrder.status)}</span></div>{canDispatch && detail.workOrder.status === "scheduled" && <button className="secondary-button complete-button" type="button" onClick={() => setShowCompletion(true)}>Complete work <Icon name="arrow" size={15}/></button>}</div></>}
            </div>}

            {view === "evidence" && <div className="detail-body"><div className="section-title"><span className="section-number">E</span><div><span className="section-kicker">TRACEABLE SOURCES</span><h3>Evidence library</h3></div></div><p className="section-intro">Sources retrieved for this incident. Select a source to inspect the excerpt used in the analysis.</p>{detail.citations.length === 0 ? <div className="empty-inline">No sources have been retrieved yet. Run incident analysis to collect evidence.</div> : <div className="evidence-grid">{detail.citations.map(citation => <button className="evidence-card" type="button" key={citation.id} onClick={() => setActiveCitation(citation)}><div><span className={`source-kind source-${citation.sourceType}`}>{citation.sourceType}</span><Icon name="arrow" size={16}/></div><strong>{citation.label}</strong><p>{citation.excerpt}</p><small>{citation.date ? formatDate(citation.date, { dateStyle: "medium", timeStyle: undefined }) : "Source record"}</small></button>)}</div>}</div>}

            {view === "activity" && <div className="detail-body"><div className="section-title"><span className="section-number">A</span><div><span className="section-kicker">ACCOUNTABILITY</span><h3>Audit activity</h3></div></div><p className="section-intro">A chronological record of staff decisions, AI steps, and operational changes.</p>{detail.activity.length === 0 ? <div className="empty-inline">No activity recorded for this incident.</div> : <div className="timeline">{detail.activity.map(item => <div className="timeline-item" key={item.id}><span className={`timeline-dot timeline-${item.kind}`}/><div className="timeline-content"><div><strong>{item.title}</strong><time>{formatDate(item.createdAt)}</time></div><p>{item.detail}</p><small>{item.actor}</small></div></div>)}</div>}</div>}
          </>}</section>
        </div>
        <footer className="page-footer"><span>Voltaris Energy · fictional company and sample records</span><span>Evidence-led operations · Human-approved actions</span></footer>
      </div>
    </main>

    {showReport && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowReport(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="report-title"><div className="modal-header"><div><span className="section-kicker">NEW INCIDENT</span><h2 id="report-title">Report a charger fault</h2><p>Create a service record for an existing asset.</p></div><button className="icon-button" type="button" aria-label="Close" onClick={() => setShowReport(false)}><Icon name="x" size={20}/></button></div><form onSubmit={createIncident}>{error && <div className="modal-error" role="alert">{error}</div>}<label>Asset <span>required</span><select required value={assetId} onChange={event => setAssetId(event.target.value)}><option value="">Select a charger</option>{assets.map(asset => <option key={asset.id} value={asset.id}>{asset.code} · {asset.name} — {asset.siteName}</option>)}</select></label><label>What happened? <span>required</span><textarea required minLength={15} maxLength={1000} rows={5} value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the symptom, any fault code, and when it started."/></label><div className="reporter-label">Reported by <strong>{staffName}</strong></div><div className="modal-hint"><Icon name="shield" size={16}/> A technician is booked only after a separate approval.</div><div className="modal-actions"><button className="ghost-button" type="button" onClick={() => setShowReport(false)}>Cancel</button><button className="primary-button" type="submit" disabled={busy === "create" || assets.length === 0}>{busy === "create" ? "Reporting…" : "Create incident"}<Icon name="arrow" size={16}/></button></div></form></div></div>}
    {showCompletion && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowCompletion(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="complete-title"><div className="modal-header"><div><span className="section-kicker">SERVICE RECORD</span><h2 id="complete-title">Complete work order</h2><p>Post the final cost and service note to the shared ledger.</p></div><button className="icon-button" type="button" aria-label="Close" onClick={() => setShowCompletion(false)}><Icon name="x" size={20}/></button></div><form onSubmit={submitCompletion}>{error && <div className="modal-error" role="alert">{error}</div>}<label>Actual cost (€) <span>required</span><input required type="number" min="0" step="0.01" value={actualCost} onChange={event => setActualCost(event.target.value)} placeholder="0.00"/></label><label>Completion note <span>required</span><textarea required minLength={10} maxLength={1000} rows={4} value={completionNote} onChange={event => setCompletionNote(event.target.value)} placeholder="Summarize the technician's work and outcome."/></label><div className="modal-actions"><button className="ghost-button" type="button" onClick={() => setShowCompletion(false)}>Cancel</button><button className="primary-button" type="submit" disabled={busy === "complete"}>{busy === "complete" ? "Saving…" : "Complete work"}</button></div></form></div></div>}
    {activeCitation && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setActiveCitation(null); }}><div className="source-modal" role="dialog" aria-modal="true" aria-labelledby="source-title"><div className="source-modal-top"><span className={`source-kind source-${activeCitation.sourceType}`}>{activeCitation.sourceType}</span><button className="icon-button" type="button" aria-label="Close source" onClick={() => setActiveCitation(null)}><Icon name="x" size={20}/></button></div><h2 id="source-title">{activeCitation.label}</h2><p className="source-date">{activeCitation.date ? formatDate(activeCitation.date) : "Source record"}</p><div className="source-excerpt">{activeCitation.excerpt}</div><div className="source-footer"><Icon name="file" size={16}/> Cited source from the incident evidence set</div></div></div>}
  </div>;
}
