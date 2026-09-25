import { geminiJson } from "./gemini.js";
import { query, transaction } from "./db.js";
import type {
  AgentAction,
  AssetSummary,
  DispatchProposal,
  EvidenceRef,
  IncidentDetail,
  IncidentFinding,
  IncidentSummary,
  TechnicianRef,
  WorkOrderRef,
} from "./types.js";

type DbRow = Record<string, unknown>;

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function cents(value: unknown): number {
  return Number(value || 0);
}

function requireUuid(value: string, field: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${field} is invalid`);
  }
}

function siteFromRow(row: DbRow) {
  return {
    id: String(row.site_id),
    name: String(row.site_name),
    region: String(row.region),
    city: String(row.city),
  };
}

function assetFromRow(row: DbRow): AssetSummary {
  return {
    id: String(row.asset_id),
    assetCode: String(row.asset_code),
    model: String(row.model),
    manufacturer: String(row.manufacturer),
    status: row.asset_status as AssetSummary["status"],
    site: siteFromRow(row),
    openIncidentCount: Number(row.open_incident_count || 0),
  };
}

function technicianFromRow(row: DbRow): TechnicianRef {
  return {
    id: String(row.technician_id),
    name: String(row.technician_name),
    baseCity: String(row.base_city),
    skills: Array.isArray(row.skills) ? row.skills.map(String) : [],
  };
}

async function logAction(
  incidentId: string,
  action: string,
  outcome: AgentAction["outcome"],
  detail: string,
  actor: string,
): Promise<void> {
  await query(
    "INSERT INTO agent_actions(incident_id, action, outcome, detail, actor) VALUES($1,$2,$3,$4,$5)",
    [incidentId, action, outcome, detail, actor],
  );
}

export async function listAssets(): Promise<AssetSummary[]> {
  const rows = await query<DbRow>(`
    SELECT a.id::text AS asset_id, a.asset_code, a.model, a.manufacturer, a.status AS asset_status,
           s.id::text AS site_id, s.name AS site_name, s.region, s.city,
           count(i.id) FILTER (WHERE i.status <> 'resolved')::int AS open_incident_count
    FROM assets a JOIN sites s ON s.id = a.site_id
    LEFT JOIN incidents i ON i.asset_id = a.id
    GROUP BY a.id, s.id ORDER BY s.region, s.name, a.asset_code
  `);
  return rows.map(assetFromRow);
}

export async function listIncidents(): Promise<IncidentSummary[]> {
  const rows = await query<DbRow>(`
    SELECT i.id::text, i.summary, i.status, i.priority, i.reported_at,
           a.asset_code, s.name AS site_name, s.region
    FROM incidents i JOIN assets a ON a.id = i.asset_id
    JOIN sites s ON s.id = a.site_id
    ORDER BY i.reported_at DESC LIMIT 100
  `);
  return rows.map((row) => ({
    id: String(row.id),
    assetCode: String(row.asset_code),
    siteName: String(row.site_name),
    region: String(row.region),
    summary: String(row.summary),
    status: row.status as IncidentSummary["status"],
    priority: row.priority as IncidentSummary["priority"],
    reportedAt: iso(row.reported_at),
  }));
}

export async function getIncidentDetail(id: string): Promise<IncidentDetail | null> {
  requireUuid(id, "Incident ID");
  const rows = await query<DbRow>(`
    SELECT i.*, i.id::text AS incident_id, a.id::text AS asset_id, a.asset_code,
           a.model, a.manufacturer, a.status AS asset_status,
           s.id::text AS site_id, s.name AS site_name, s.region, s.city,
           c.id::text AS contract_id, c.name AS contract_name, c.service_level, c.response_hours,
           (SELECT count(*) FROM incidents x WHERE x.asset_id=a.id AND x.status <> 'resolved')::int AS open_incident_count
    FROM incidents i JOIN assets a ON a.id=i.asset_id JOIN sites s ON s.id=a.site_id
    LEFT JOIN LATERAL (
      SELECT * FROM contracts cx WHERE cx.site_id=s.id AND cx.starts_on<=CURRENT_DATE
        AND (cx.ends_on IS NULL OR cx.ends_on>=CURRENT_DATE)
      ORDER BY cx.starts_on DESC LIMIT 1
    ) c ON true
    WHERE i.id=$1
  `, [id]);
  const row = rows[0];
  if (!row) return null;

  const [maintenance, chunks, proposalRows, workRows, actionRows] = await Promise.all([
    query<DbRow>(
      "SELECT id::text, occurred_at, summary, cost_cents, source_reference FROM maintenance_logs WHERE asset_id=$1 ORDER BY occurred_at DESC LIMIT 8",
      [row.asset_id],
    ),
    query<DbRow>(`
      SELECT k.id::text, k.content, d.id::text AS document_id, d.title, d.source_type
      FROM knowledge_chunks k JOIN knowledge_documents d ON d.id=k.document_id
      WHERE d.model IS NULL OR d.model=$1 OR d.manufacturer=$2
      ORDER BY CASE WHEN d.model=$1 THEN 0 WHEN d.manufacturer=$2 THEN 1 ELSE 2 END, k.chunk_index
      LIMIT 6
    `, [row.model, row.manufacturer]),
    query<DbRow>(`
      SELECT p.*, p.id::text AS proposal_id, t.id::text AS technician_id,
             t.name AS technician_name, t.base_city, v.starts_at, v.ends_at,
             array_remove(array_agg(sk.skill), NULL) AS skills
      FROM dispatch_proposals p JOIN technicians t ON t.id=p.technician_id
      JOIN availability_slots v ON v.id=p.slot_id
      LEFT JOIN technician_skills sk ON sk.technician_id=t.id
      WHERE p.incident_id=$1 GROUP BY p.id,t.id,v.id ORDER BY p.created_at DESC LIMIT 1
    `, [id]),
    query<DbRow>(`
      SELECT w.*, w.id::text AS work_order_id, t.id::text AS technician_id,
             t.name AS technician_name, t.base_city, v.starts_at, v.ends_at,
             array_remove(array_agg(sk.skill), NULL) AS skills
      FROM work_orders w JOIN technicians t ON t.id=w.technician_id
      JOIN availability_slots v ON v.id=w.slot_id
      LEFT JOIN technician_skills sk ON sk.technician_id=t.id
      WHERE w.incident_id=$1 GROUP BY w.id,t.id,v.id LIMIT 1
    `, [id]),
    query<DbRow>(
      "SELECT id::text, action, outcome, detail, actor, created_at FROM agent_actions WHERE incident_id=$1 ORDER BY created_at DESC LIMIT 50",
      [id],
    ),
  ]);

  const evidence: EvidenceRef[] = [
    ...chunks.map((item) => ({
      id: String(item.id),
      title: String(item.title),
      excerpt: String(item.content),
      sourceType: "runbook" as const,
      sourceId: String(item.document_id),
    })),
    ...maintenance.map((item) => ({
      id: String(item.id),
      title: `Maintenance ${iso(item.occurred_at).slice(0, 10)}`,
      excerpt: String(item.summary),
      sourceType: "maintenance_log" as const,
      sourceId: String(item.id),
    })),
  ];
  if (row.contract_id) {
    evidence.push({
      id: String(row.contract_id),
      title: String(row.contract_name),
      excerpt: `${row.service_level} service; response target ${row.response_hours} hours`,
      sourceType: "contract",
      sourceId: String(row.contract_id),
    });
  }

  const proposalRow = proposalRows[0];
  const proposal: DispatchProposal | null = proposalRow
    ? {
        id: String(proposalRow.proposal_id),
        technician: technicianFromRow(proposalRow),
        startsAt: iso(proposalRow.starts_at),
        endsAt: iso(proposalRow.ends_at),
        rationale: String(proposalRow.rationale),
        workSummary: String(proposalRow.work_summary),
        forecastCostCents: cents(proposalRow.forecast_cost_cents),
        status: proposalRow.status as DispatchProposal["status"],
        createdAt: iso(proposalRow.created_at),
      }
    : null;
  const workRow = workRows[0];
  const workOrder: WorkOrderRef | null = workRow
    ? {
        id: String(workRow.work_order_id),
        incidentId: id,
        status: workRow.status as WorkOrderRef["status"],
        technician: technicianFromRow(workRow),
        startsAt: iso(workRow.starts_at),
        endsAt: iso(workRow.ends_at),
        forecastCostCents: cents(workRow.forecast_cost_cents),
        actualCostCents: workRow.actual_cost_cents == null ? null : cents(workRow.actual_cost_cents),
        completedAt: workRow.completed_at ? iso(workRow.completed_at) : null,
      }
    : null;

  return {
    id,
    assetCode: String(row.asset_code),
    siteName: String(row.site_name),
    region: String(row.region),
    summary: String(row.summary),
    description: String(row.description),
    status: row.status as IncidentSummary["status"],
    priority: row.priority as IncidentSummary["priority"],
    reportedAt: iso(row.reported_at),
    asset: assetFromRow(row),
    contract: row.contract_id
      ? {
          id: String(row.contract_id),
          name: String(row.contract_name),
          serviceLevel: String(row.service_level),
          responseHours: Number(row.response_hours),
        }
      : null,
    maintenanceHistory: maintenance.map((item) => ({
      id: String(item.id),
      occurredAt: iso(item.occurred_at),
      summary: String(item.summary),
      costCents: cents(item.cost_cents),
    })),
    evidence,
    finding: row.finding ? (row.finding as IncidentFinding) : null,
    proposal,
    workOrder,
    actions: actionRows.map((item) => ({
      id: String(item.id),
      incidentId: id,
      action: String(item.action),
      outcome: item.outcome as AgentAction["outcome"],
      detail: String(item.detail),
      actor: String(item.actor),
      createdAt: iso(item.created_at),
    })),
  };
}

export async function createIncident(input: {
  assetId: string;
  description: string;
  reportedBy: string;
}): Promise<{ id: string }> {
  requireUuid(input.assetId, "Asset ID");
  const description = input.description.trim();
  if (description.length < 15 || description.length > 4_000) {
    throw new Error("Incident description must be 15–4,000 characters");
  }
  const summary = description.split(/[.!?\n]/)[0]?.trim().slice(0, 120) || "EV charging fault";
  return transaction(async (client) => {
    const result = await client.query<{ id: string }>(
      "INSERT INTO incidents(asset_id,summary,description,reported_by) VALUES($1,$2,$3,$4) RETURNING id::text",
      [input.assetId, summary, description, input.reportedBy],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new Error("Incident could not be created");
    await client.query(
      "INSERT INTO agent_actions(incident_id,action,outcome,detail,actor) VALUES($1,'incident_created','success',$2,$3)",
      [id, `Incident recorded for asset ${input.assetId}`, input.reportedBy],
    );
    return { id };
  });
}

export async function analyzeIncident(id: string, actor: string): Promise<IncidentDetail> {
  const incident = await getIncidentDetail(id);
  if (!incident) throw new Error("Incident not found");
  if (incident.status === "scheduled" || incident.status === "resolved") {
    throw new Error("This incident can no longer be analyzed");
  }
  if (!incident.evidence.length) throw new Error("No relevant maintenance evidence is available");
  const evidenceList = incident.evidence.map((item) =>
    `[${item.id}] ${item.title} (${item.sourceType}): ${item.excerpt}`,
  ).join("\n");
  const result = await geminiJson<Partial<IncidentFinding>>(`
You are an EV charging maintenance operations assistant. Do not claim a definitive electrical diagnosis or recommend unsafe physical intervention. Use only the supplied evidence. Return JSON with keys overview (string), likelyCauses (array of short strings), recommendedChecks (array of safe checks for a trained technician), urgency (routine|priority|urgent), limitations (array of strings), evidenceIds (array of exact IDs cited below). If evidence is insufficient, say so. Do not invent IDs.

Incident: ${incident.description}
Asset: ${incident.asset.assetCode}, ${incident.asset.manufacturer} ${incident.asset.model}, status ${incident.asset.status}
Site: ${incident.siteName}, ${incident.region}
Contract: ${incident.contract ? `${incident.contract.serviceLevel}, ${incident.contract.responseHours} hour response target` : "none recorded"}
Evidence:\n${evidenceList}
  `.trim());
  const allowedIds = new Set(incident.evidence.map((item) => item.id));
  const finding: IncidentFinding = {
    overview: String(result.overview || "Evidence review completed"),
    likelyCauses: Array.isArray(result.likelyCauses) ? result.likelyCauses.map(String).slice(0, 5) : [],
    recommendedChecks: Array.isArray(result.recommendedChecks) ? result.recommendedChecks.map(String).slice(0, 5) : [],
    urgency: ["routine", "priority", "urgent"].includes(String(result.urgency))
      ? result.urgency as IncidentFinding["urgency"] : "priority",
    limitations: Array.isArray(result.limitations) ? result.limitations.map(String).slice(0, 5) : [],
    evidenceIds: Array.isArray(result.evidenceIds)
      ? result.evidenceIds.map(String).filter((item) => allowedIds.has(item)) : [],
    generatedAt: new Date().toISOString(),
  };
  if (!finding.evidenceIds.length) {
    throw new Error("AI analysis did not cite any valid source");
  }
  await transaction(async (client) => {
    await client.query(
      "UPDATE incidents SET finding=$2::jsonb,status='analyzed',updated_at=now() WHERE id=$1",
      [id, JSON.stringify(finding)],
    );
    await client.query(
      "INSERT INTO agent_actions(incident_id,action,outcome,detail,actor) VALUES($1,'evidence_analyzed','success',$2,$3)",
      [id, `Grounded finding saved with ${finding.evidenceIds.length} cited source(s)`, actor],
    );
  });
  return (await getIncidentDetail(id))!;
}

export async function proposeDispatch(id: string, actor: string): Promise<IncidentDetail> {
  const incident = await getIncidentDetail(id);
  if (!incident) throw new Error("Incident not found");
  if (!incident.finding) throw new Error("Analyze evidence before proposing dispatch");
  if (incident.workOrder) throw new Error("A work order already exists for this incident");
  const responseDeadline = incident.contract
    ? new Date(new Date(incident.reportedAt).getTime() + incident.contract.responseHours * 3_600_000)
    : null;
  const rows = await query<DbRow>(`
    SELECT t.id::text AS technician_id, t.name AS technician_name, t.base_city,
           v.id::text AS slot_id, v.starts_at, v.ends_at,
           array_agg(sk.skill ORDER BY sk.skill) AS skills,
           CASE WHEN lower(t.base_city)=lower($1) THEN 0 ELSE 1 END AS travel_rank,
           CASE WHEN $2::timestamptz IS NULL OR v.starts_at <= $2::timestamptz
             THEN 0 ELSE 1 END AS sla_rank
    FROM technicians t JOIN technician_skills sk ON sk.technician_id=t.id
    JOIN availability_slots v ON v.technician_id=t.id
    WHERE t.active=true AND sk.skill='ev_charger' AND v.status='available'
      AND v.starts_at>now() AND v.starts_at<now()+interval '21 days'
    GROUP BY t.id,v.id ORDER BY sla_rank,travel_rank,v.starts_at LIMIT 1
  `, [incident.asset.site.city, responseDeadline?.toISOString() ?? null]);
  const row = rows[0];
  if (!row) throw new Error("No qualified technician slot is available");
  const sameCity = String(row.base_city).toLowerCase() === incident.asset.site.city.toLowerCase();
  const forecastCostCents = 12_000 + (sameCity ? 2_000 : 6_000) +
    (incident.finding.urgency === "urgent" ? 3_000 : 0);
  const slaNote = responseDeadline
    ? Number(row.sla_rank) === 0
      ? `Proposed start is within the ${incident.contract!.responseHours}-hour contractual response window.`
      : `SLA risk: no available qualified slot starts within the ${incident.contract!.responseHours}-hour response window; target was ${responseDeadline.toISOString()}. Escalation is required.`
    : "No active response-time target is recorded.";
  const rationale = `${sameCity ? "Local" : "Regional"} EV-charger technician with an available slot. ${slaNote} Estimate: €120 labor + €${sameCity ? 20 : 60} travel${incident.finding.urgency === "urgent" ? " + €30 urgent-response allowance" : ""}. Human approval required.`;
  await transaction(async (client) => {
    await client.query(
      `INSERT INTO dispatch_proposals(incident_id,technician_id,slot_id,rationale,work_summary,forecast_cost_cents)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [id, row.technician_id, row.slot_id, rationale,
        `Investigate ${incident.asset.assetCode}: ${incident.summary}`, forecastCostCents],
    );
    await client.query("UPDATE incidents SET status='proposed',updated_at=now() WHERE id=$1", [id]);
    await client.query(
      "INSERT INTO agent_actions(incident_id,action,outcome,detail,actor) VALUES($1,'dispatch_proposed','success',$2,$3)",
      [id, `Proposed ${row.technician_name} for ${iso(row.starts_at)}; no slot booked`, actor],
    );
  });
  return (await getIncidentDetail(id))!;
}

export async function approveProposal(input: {
  incidentId: string;
  proposalId: string;
  actor: string;
}): Promise<IncidentDetail> {
  requireUuid(input.incidentId, "Incident ID");
  requireUuid(input.proposalId, "Proposal ID");
  await transaction(async (client) => {
    const result = await client.query<DbRow>(`
      SELECT p.*, v.status AS slot_status, a.site_id
      FROM dispatch_proposals p JOIN availability_slots v ON v.id=p.slot_id
      JOIN incidents i ON i.id=p.incident_id JOIN assets a ON a.id=i.asset_id
      WHERE p.id=$1 AND p.incident_id=$2 FOR UPDATE OF p,v
    `, [input.proposalId, input.incidentId]);
    const proposal = result.rows[0];
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "pending") throw new Error("Proposal has already been decided");
    if (proposal.slot_status !== "available") throw new Error("The proposed slot is no longer available");
    const booked = await client.query(
      "UPDATE availability_slots SET status='booked' WHERE id=$1 AND status='available' RETURNING id",
      [proposal.slot_id],
    );
    if (!booked.rowCount) throw new Error("The proposed slot is no longer available");
    await client.query("UPDATE dispatch_proposals SET status='approved' WHERE id=$1", [input.proposalId]);
    const work = await client.query<{ id: string }>(`
      INSERT INTO work_orders(incident_id,proposal_id,technician_id,slot_id,status,forecast_cost_cents)
      VALUES($1,$2,$3,$4,'scheduled',$5) RETURNING id::text
    `, [input.incidentId, input.proposalId, proposal.technician_id,
      proposal.slot_id, proposal.forecast_cost_cents]);
    const workId = work.rows[0]?.id;
    if (!workId) throw new Error("Work order could not be created");
    await client.query(
      `INSERT INTO financial_events(occurred_on,kind,category,amount_cents,description,site_id,work_order_id,source_reference)
       VALUES(CURRENT_DATE,'forecast_cost','maintenance_dispatch',$1,$2,$3,$4,$5)`,
      [proposal.forecast_cost_cents, `Forecast cost for work order ${workId}`,
        proposal.site_id, workId, `FORECAST-${workId}`],
    );
    await client.query("UPDATE incidents SET status='scheduled',updated_at=now() WHERE id=$1", [input.incidentId]);
    await client.query(
      "INSERT INTO approvals(incident_id,proposal_id,actor,decision) VALUES($1,$2,$3,'approved')",
      [input.incidentId, input.proposalId, input.actor],
    );
    await client.query(
      "INSERT INTO agent_actions(incident_id,action,outcome,detail,actor) VALUES($1,'dispatch_approved','success',$2,$3)",
      [input.incidentId, `Approved and scheduled work order ${workId}`, input.actor],
    );
  });
  return (await getIncidentDetail(input.incidentId))!;
}

export async function rejectProposal(input: {
  incidentId: string;
  proposalId: string;
  actor: string;
  reason?: string;
}): Promise<IncidentDetail> {
  requireUuid(input.incidentId, "Incident ID");
  requireUuid(input.proposalId, "Proposal ID");
  await transaction(async (client) => {
    const changed = await client.query(
      "UPDATE dispatch_proposals SET status='rejected' WHERE id=$1 AND incident_id=$2 AND status='pending' RETURNING id",
      [input.proposalId, input.incidentId],
    );
    if (!changed.rowCount) throw new Error("Pending proposal not found");
    await client.query("UPDATE incidents SET status='analyzed',updated_at=now() WHERE id=$1", [input.incidentId]);
    await client.query(
      "INSERT INTO approvals(incident_id,proposal_id,actor,decision,reason) VALUES($1,$2,$3,'rejected',$4)",
      [input.incidentId, input.proposalId, input.actor, input.reason || null],
    );
    await client.query(
      "INSERT INTO agent_actions(incident_id,action,outcome,detail,actor) VALUES($1,'dispatch_rejected','rejected',$2,$3)",
      [input.incidentId, input.reason || "Proposal rejected by staff", input.actor],
    );
  });
  return (await getIncidentDetail(input.incidentId))!;
}

export async function completeWorkOrder(input: {
  workOrderId: string;
  actor: string;
  actualCostCents: number;
  completionNote: string;
}): Promise<IncidentDetail> {
  requireUuid(input.workOrderId, "Work order ID");
  if (!Number.isInteger(input.actualCostCents) || input.actualCostCents < 0) {
    throw new Error("Actual cost must be a nonnegative whole number of cents");
  }
  if (!input.completionNote.trim()) throw new Error("A completion note is required");
  const incidentId = await transaction(async (client) => {
    const work = await client.query<DbRow>(`
      SELECT w.*, a.site_id FROM work_orders w JOIN incidents i ON i.id=w.incident_id
      JOIN assets a ON a.id=i.asset_id WHERE w.id=$1 FOR UPDATE OF w
    `, [input.workOrderId]);
    const row = work.rows[0];
    if (!row) throw new Error("Work order not found");
    if (row.status === "completed" || row.status === "cancelled") {
      throw new Error("Work order cannot be completed again");
    }
    await client.query(
      "UPDATE work_orders SET status='completed',actual_cost_cents=$2,completion_note=$3,completed_at=now() WHERE id=$1",
      [input.workOrderId, input.actualCostCents, input.completionNote.trim()],
    );
    await client.query("UPDATE incidents SET status='resolved',updated_at=now() WHERE id=$1", [row.incident_id]);
    await client.query(
      `INSERT INTO financial_events(occurred_on,kind,category,amount_cents,description,site_id,work_order_id,source_reference)
       VALUES(CURRENT_DATE,'actual_cost','maintenance_dispatch',$1,$2,$3,$4,$5)`,
      [input.actualCostCents, input.completionNote.trim(), row.site_id,
        input.workOrderId, `ACTUAL-${input.workOrderId}`],
    );
    await client.query(
      "INSERT INTO agent_actions(incident_id,action,outcome,detail,actor) VALUES($1,'work_order_completed','success',$2,$3)",
      [row.incident_id, `Actual cost recorded: €${(input.actualCostCents / 100).toFixed(2)}`, input.actor],
    );
    return String(row.incident_id);
  });
  return (await getIncidentDetail(incidentId))!;
}
