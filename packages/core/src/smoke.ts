import assert from "node:assert/strict";
import { resolve } from "node:path";
import { config } from "dotenv";
import {
  analyzeIncident,
  approveProposal,
  authenticateStaff,
  completeWorkOrder,
  createIncident,
  getBacklog,
  getIncidentDetail,
  getMarginDashboard,
  listAssets,
  proposeDispatch,
} from "./index.js";
import { getPool } from "./db.js";

config({ path: resolve(process.cwd(), "../../.env.local") });

try {
  const user = await authenticateStaff(process.env.ADMIN_EMAIL || "", process.env.ADMIN_PASSWORD || "");
  assert(user, "Admin authentication failed");
  const assets = await listAssets();
  assert(assets.length > 0, "No assets loaded");
  const baselineBacklog = await getBacklog({ region: assets[0]!.site.region });
  const baselineDashboard = await getMarginDashboard({ region: assets[0]!.site.region, quarter: "2026-Q3" });

  const created = await createIncident({
    assetId: assets[0]!.id,
    description: "QA validation: charger reports repeated session failures after a controller restart. Review maintenance evidence and arrange trained field support.",
    reportedBy: user.email,
  });
  const analyzed = await analyzeIncident(created.id, user.email);
  assert(analyzed.finding?.evidenceIds.length, "Analysis lacks cited evidence");
  const proposed = await proposeDispatch(created.id, user.email);
  assert(proposed.proposal?.status === "pending", "Dispatch proposal missing");
  assert(!proposed.workOrder, "Work order was written before approval");
  const approved = await approveProposal({
    incidentId: created.id,
    proposalId: proposed.proposal.id,
    actor: user.email,
  });
  assert(approved.workOrder?.status === "scheduled", "Approval did not create scheduled work order");
  const backlog = await getBacklog({ region: assets[0]!.site.region });
  assert(backlog.openWorkOrderCount === baselineBacklog.openWorkOrderCount + 1, "Margin backlog did not reflect Command approval");
  const afterApproval = await getMarginDashboard({ region: assets[0]!.site.region, quarter: "2026-Q3" });
  assert.equal(afterApproval.current.marginCents, baselineDashboard.current.marginCents,
    "Forecast changed actual margin before work completion");

  const completed = await completeWorkOrder({
    workOrderId: approved.workOrder.id,
    actor: user.email,
    actualCostCents: 13_500,
    completionNote: "QA validation: trained technician inspected the controller and restored service.",
  });
  assert(completed.workOrder?.status === "completed", "Work order did not complete");
  const afterCompletion = await getMarginDashboard({ region: assets[0]!.site.region, quarter: "2026-Q3" });
  assert.equal(afterCompletion.current.actualCostCents,
    baselineDashboard.current.actualCostCents + 13_500,
    "Actual completion cost did not appear in Margin");
  const persisted = await getIncidentDetail(created.id);
  assert(persisted?.actions.some((action) => action.action === "dispatch_approved"), "Approval audit missing");
  process.stdout.write(`PASS: incident ${created.id}; citations, approval gate, backlog, actual margin, audit\n`);
} finally {
  await getPool().end();
}
