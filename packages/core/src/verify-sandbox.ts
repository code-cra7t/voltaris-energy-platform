import assert from "node:assert/strict";
import { config } from "dotenv";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { withWorkspace, closePools, queryPublic } from "./db.js";
import { analyzeIncident, approveProposal, completeWorkOrder, createIncident,
  getBacklog, getIncidentDetail, getMarginDashboard, listAssets, proposeDispatch } from "./index.js";
import { resetReviewerWorkspace } from "./sandbox.js";

config({ path: resolve(process.cwd(), "../../.env.local") });
const emails = [process.env.SANDBOX_TEST_EMAIL_A, process.env.SANDBOX_TEST_EMAIL_B];
if (emails.some(email => !email)) throw new Error("Set SANDBOX_TEST_EMAIL_A and SANDBOX_TEST_EMAIL_B");
const users = await queryPublic<{ id: string; email: string; workspace_schema: string }>(
  "SELECT id::text,email,workspace_schema FROM public.staff_users WHERE email=ANY($1::text[]) ORDER BY email", [emails]);
assert.equal(users.length, 2);
const [a, b] = users;
assert(a && b && a.workspace_schema !== b.workspace_schema);
const run = <T>(user: typeof a, fn: () => Promise<T>) => withWorkspace(user.workspace_schema, user.id, randomUUID(), fn);
const now = new Date();
const quarter = `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`;
delete process.env.GEMINI_API_KEY; // Exercise the conservative fallback without spending API calls.

try {
  const beforeA = await run(a, () => getBacklog({ region: "Hannover" }));
  const beforeB = await run(b, () => getBacklog({ region: "Hannover" }));
  assert.equal(beforeA.openWorkOrderCount, 1, "Seeded approved job missing");
  assert.equal(beforeB.openWorkOrderCount, 1, "Second workspace seeded job missing");
  const beforeActual = await run(a, () => getMarginDashboard({ region: "Hannover", quarter }));
  const asset = (await run(a, listAssets)).find(item => item.assetCode === "VC-HAN-001");
  assert(asset);
  const created = await run(a, () => createIncident({ assetId: asset.id,
    description: "Connector locking failures recur after maintenance. Investigate the event history and arrange qualified field service.", reportedBy: "QA reviewer" }));
  assert.equal(await run(b, () => getIncidentDetail(created.id)), null, "Workspace B can read workspace A incident");
  assert.equal(await run({ ...a, workspace_schema: "public" }, () => getIncidentDetail(created.id)), null, "Main workspace can read sandbox incident");
  const analyzed = await run(a, () => analyzeIncident(created.id, "QA reviewer"));
  assert.equal(analyzed.finding?.generationMode, "source_review");
  const proposal = await run(a, () => proposeDispatch(created.id, "QA reviewer"));
  assert(proposal.proposal && !proposal.workOrder, "Approval boundary failed");
  const approved = await run(a, () => approveProposal({ incidentId: created.id, proposalId: proposal.proposal!.id, actor: "QA reviewer" }));
  assert(approved.workOrder);
  await assert.rejects(run(a, () => approveProposal({ incidentId: created.id, proposalId: proposal.proposal!.id, actor: "QA reviewer" })));
  const afterA = await run(a, () => getBacklog({ region: "Hannover" }));
  const afterB = await run(b, () => getBacklog({ region: "Hannover" }));
  assert.equal(afterA.openWorkOrderCount, 2);
  assert.equal(afterB.openWorkOrderCount, 1);
  assert.equal((await run(a, () => getMarginDashboard({ region: "Hannover", quarter }))).current.marginCents,
    beforeActual.current.marginCents, "Forecast changed actual margin");
  await run(a, () => completeWorkOrder({ workOrderId: approved.workOrder!.id, actor: "QA reviewer", actualCostCents: 13_500,
    completionNote: "Qualified technician inspected the connector and restored service." }));
  const afterActual = await run(a, () => getMarginDashboard({ region: "Hannover", quarter }));
  assert.equal(afterActual.current.actualCostCents, beforeActual.current.actualCostCents + 13_500);
  await run(a, resetReviewerWorkspace);
  assert.equal(await run(a, () => getIncidentDetail(created.id)), null, "Reset retained QA incident");
  assert.equal((await run(a, () => getBacklog({ region: "Hannover" }))).openWorkOrderCount, 1);
  assert.equal((await run(b, () => getBacklog({ region: "Hannover" }))).openWorkOrderCount, 1);
  process.stdout.write("PASS sandbox isolation, seeded work, approval, forecast/actual, duplicate denial, reset\n");
} finally { await closePools(); }
