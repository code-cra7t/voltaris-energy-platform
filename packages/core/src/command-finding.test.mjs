import test from "node:test";
import assert from "node:assert/strict";
import { buildIncidentFinding } from "./command-finding.ts";

const evidence = [
  { id: "source-1", title: "Maintenance log", excerpt: "Prior reset", sourceType: "maintenance_log", sourceId: "log-1" },
  { id: "source-2", title: "Runbook", excerpt: "Qualified inspection", sourceType: "runbook", sourceId: "runbook-1" },
];

test("keeps model findings only with valid cited source IDs", () => {
  const finding = buildIncidentFinding({
    overview: "A connector fault is plausible.",
    likelyCauses: ["Connector fault"],
    recommendedChecks: ["Inspect the connector"],
    urgency: "priority",
    limitations: [],
    evidenceIds: ["[source-1]", "invented", "source-1"],
  }, evidence);
  assert.equal(finding.generationMode, "ai_grounded");
  assert.deepEqual(finding.evidenceIds, ["source-1"]);
});

test("discards unsupported AI claims while allowing a conservative source review", () => {
  const finding = buildIncidentFinding({
    overview: "Replace the charger immediately.",
    likelyCauses: ["Invented component failure"],
    evidenceIds: ["invented"],
  }, evidence);
  assert.equal(finding.generationMode, "source_review");
  assert.deepEqual(finding.likelyCauses, []);
  assert.deepEqual(finding.evidenceIds, ["source-1", "source-2"]);
  assert.doesNotMatch(JSON.stringify(finding), /Replace the charger|Invented component/);
});

test("uses the same labeled fallback when the model is unavailable", () => {
  assert.equal(buildIncidentFinding(null, evidence).generationMode, "source_review");
});
