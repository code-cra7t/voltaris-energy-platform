import assert from "node:assert/strict";
import test from "node:test";
import { presentDetail } from "./presenter.ts";

test("presents persisted evidence, proposal, SLA, work order, and audit activity", () => {
  const incident = {
    id: "11111111-1111-4111-8111-111111111111",
    assetCode: "CHG-104",
    siteName: "Berlin East",
    region: "Berlin",
    summary: "Charger reports connector fault",
    description: "Charger reports connector fault after each session.",
    status: "scheduled",
    priority: "high",
    reportedAt: "2026-09-25T08:00:00.000Z",
    asset: {
      id: "22222222-2222-4222-8222-222222222222",
      assetCode: "CHG-104",
      model: "Hyper 200",
      manufacturer: "Voltaris",
      status: "degraded",
      site: { id: "site-1", name: "Berlin East", region: "Berlin", city: "Berlin" },
      openIncidentCount: 1,
    },
    contract: { id: "contract-1", name: "Premium Care", serviceLevel: "Priority", responseHours: 4 },
    maintenanceHistory: [{ id: "log-1", occurredAt: "2026-09-20T08:00:00.000Z", summary: "Connector inspected", costCents: 9000 }],
    evidence: [{ id: "chunk-1", title: "Connector fault guide", excerpt: "Check latch sensor", sourceType: "runbook", sourceId: "doc-1" }],
    finding: { overview: "A latch sensor issue is plausible.", likelyCauses: ["Latch sensor"], recommendedChecks: ["Inspect logs"], urgency: "priority", limitations: ["On-site verification required."], evidenceIds: ["chunk-1"], generatedAt: "2026-09-25T08:05:00.000Z" },
    proposal: { id: "proposal-1", technician: { id: "tech-1", name: "Alex Meyer", baseCity: "Berlin", skills: ["ev_charger"] }, startsAt: "2026-09-25T10:00:00.000Z", endsAt: "2026-09-25T12:00:00.000Z", rationale: "Local qualified technician.", workSummary: "Inspect charger", forecastCostCents: 14000, status: "approved", createdAt: "2026-09-25T08:08:00.000Z" },
    workOrder: { id: "work-1", incidentId: "11111111-1111-4111-8111-111111111111", status: "scheduled", technician: { id: "tech-1", name: "Alex Meyer", baseCity: "Berlin", skills: ["ev_charger"] }, startsAt: "2026-09-25T10:00:00.000Z", endsAt: "2026-09-25T12:00:00.000Z", forecastCostCents: 14000, actualCostCents: null, completedAt: null },
    actions: [{ id: "action-1", incidentId: "11111111-1111-4111-8111-111111111111", action: "dispatch_approved", outcome: "success", detail: "Approved work order", actor: "Alex Dispatcher", createdAt: "2026-09-25T08:10:00.000Z" }],
  };

  const view = presentDetail(incident);
  assert.equal(view.status, "approved");
  assert.equal(view.contract.slaDueAt, "2026-09-25T12:00:00.000Z");
  assert.equal(view.analysis.findings[0].citationIds[0], "chunk-1");
  assert.equal(view.citations.length, 2);
  assert.equal(view.proposal.estimatedCost, 140);
  assert.equal(view.workOrder.estimatedCost, 140);
  assert.equal(view.activity[0].actor, "Alex Dispatcher");
});
