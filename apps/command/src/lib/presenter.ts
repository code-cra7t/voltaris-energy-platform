import type {
  AssetSummary,
  EvidenceRef,
  IncidentDetail as CoreIncidentDetail,
  IncidentSummary as CoreIncidentSummary,
} from "@voltaris/core";
import type { Asset, Citation, IncidentDetail, IncidentSummary } from "./types";

const code = (id: string) => `INC-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
const workCode = (id: string) => `WO-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
const title = (text: string) => {
  const first = text.trim().split(/[.!?\n]/)[0]?.trim() || "EV charger fault";
  return first.length > 72 ? `${first.slice(0, 69).trimEnd()}…` : first;
};

export function presentAsset(asset: AssetSummary): Asset {
  return {
    id: asset.id,
    code: asset.assetCode,
    name: `${asset.manufacturer} ${asset.model}`.trim(),
    siteName: asset.site.name,
    region: asset.site.region,
    status: asset.status,
  };
}

const status = (value: CoreIncidentSummary["status"]) => ({ open: "reported", analyzed: "analyzed", proposed: "proposed", scheduled: "approved", resolved: "completed" } as const)[value];

export function presentIncident(incident: CoreIncidentSummary): IncidentSummary {
  return {
    id: incident.id,
    reference: code(incident.id),
    title: title(incident.summary),
    description: incident.summary,
    status: status(incident.status),
    createdAt: incident.reportedAt,
    asset: {
      id: "",
      code: incident.assetCode,
      name: incident.assetCode,
      siteName: incident.siteName,
      region: incident.region,
    },
    severity: incident.priority,
  };
}

function presentCitation(item: EvidenceRef): Citation {
  return { id: item.id, label: item.title, excerpt: item.excerpt, sourceType: item.sourceType === "maintenance_log" ? "maintenance" : item.sourceType };
}

export function presentDetail(incident: CoreIncidentDetail): IncidentDetail {
  const summary = presentIncident(incident);
  const slaDueAt = incident.contract ? new Date(new Date(incident.reportedAt).getTime() + incident.contract.responseHours * 60 * 60 * 1000).toISOString() : undefined;
  const citations = incident.evidence.map(presentCitation);
  for (const log of incident.maintenanceHistory) {
    if (!citations.some(item => item.id === log.id)) citations.push({ id: log.id, label: `Maintenance · ${new Date(log.occurredAt).toLocaleDateString("en-GB")}`, excerpt: log.summary, sourceType: "maintenance", date: log.occurredAt });
  }
  return {
    ...summary,
    description: incident.description,
    asset: presentAsset(incident.asset),
    site: { name: incident.asset.site.name, region: incident.asset.site.region, address: incident.asset.site.city },
    contract: incident.contract ? { name: `${incident.contract.name} · ${incident.contract.serviceLevel}`, responseHours: incident.contract.responseHours, slaDueAt } : undefined,
    citations,
    analysis: incident.finding ? {
      summary: incident.finding.overview,
      findings: [
        { title: "Plausible causes", explanation: incident.finding.likelyCauses.join(" · ") || "The evidence does not support a specific cause yet.", citationIds: incident.finding.evidenceIds },
        { title: "Recommended checks", explanation: incident.finding.recommendedChecks.join(" · ") || "A qualified technician should assess the charger on site.", citationIds: incident.finding.evidenceIds },
      ],
      safetyNote: incident.finding.limitations.length ? incident.finding.limitations.join(" ") : "Advisory assessment only. A qualified technician must verify the fault before any physical work.",
      generatedAt: incident.finding.generatedAt,
    } : null,
    proposal: incident.proposal ? {
      id: incident.proposal.id,
      status: incident.proposal.status,
      technician: { id: incident.proposal.technician.id, name: incident.proposal.technician.name, skills: incident.proposal.technician.skills },
      slot: { id: incident.proposal.id, start: incident.proposal.startsAt, end: incident.proposal.endsAt },
      rationale: incident.proposal.rationale,
      estimatedCost: incident.proposal.forecastCostCents / 100,
      currency: "EUR",
      slaDueAt,
      createdAt: incident.proposal.createdAt,
    } : null,
    workOrder: incident.workOrder ? {
      id: incident.workOrder.id,
      reference: workCode(incident.workOrder.id),
      status: incident.workOrder.status,
      scheduledStart: incident.workOrder.startsAt,
      scheduledEnd: incident.workOrder.endsAt,
      technicianName: incident.workOrder.technician.name,
      estimatedCost: incident.workOrder.forecastCostCents / 100,
      currency: "EUR",
    } : null,
    activity: incident.actions.map(action => ({ id: action.id, kind: action.action.includes("approv") || action.action.includes("reject") ? "approval" : action.action.includes("work_order") ? "work_order" : "agent", title: action.action.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase()), detail: action.detail, actor: action.actor, createdAt: action.createdAt })),
  };
}
