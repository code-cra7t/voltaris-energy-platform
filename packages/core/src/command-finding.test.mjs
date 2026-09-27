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
    claims: [
      { kind: "cause", text: "Connector wear may explain repeat lock faults.", evidenceIds: ["[source-1]"] },
      { kind: "check", text: "A trained technician should inspect the connector.", evidenceIds: ["source-2"] },
    ],
    urgency: "priority",
    limitations: [],
  }, evidence);
  assert.equal(finding.generationMode, "ai_grounded");
  assert.deepEqual(finding.evidenceIds, ["source-1", "source-2"]);
  assert.deepEqual(finding.claims?.map(claim => claim.evidenceIds), [["source-1"], ["source-2"]]);
});

test("discards unsupported AI claims while allowing a conservative source review", () => {
  const finding = buildIncidentFinding({
    overview: "Replace the charger immediately.",
    claims: [{ kind: "cause", text: "Invented component failure is certain.", evidenceIds: ["invented"] }],
  }, evidence);
  assert.equal(finding.generationMode, "source_review");
  assert.deepEqual(finding.likelyCauses, []);
  assert.deepEqual(finding.evidenceIds, ["source-1", "source-2"]);
  assert.doesNotMatch(JSON.stringify(finding), /Replace the charger|Invented component/);
});

test("uses the same labeled fallback when the model is unavailable", () => {
  assert.equal(buildIncidentFinding(null, evidence).generationMode, "source_review");
});

test("rejects a whole claim when one citation is invented", () => {
  const finding = buildIncidentFinding({ claims: [
    { kind: "cause", text: "A connector fault is certain from these records.", evidenceIds: ["source-1", "made-up"] },
    { kind: "check", text: "Review the prior service visit with a qualified technician.", evidenceIds: ["source-1"] },
  ] }, evidence);
  assert.equal(finding.generationMode, "ai_grounded");
  assert.equal(finding.claims?.length, 1);
  assert.doesNotMatch(JSON.stringify(finding), /connector fault is certain/i);
});

test("insufficient evidence remains an uncertain source review", () => {
  const finding = buildIncidentFinding({ claims: [] }, evidence);
  assert.equal(finding.generationMode, "source_review");
  assert.deepEqual(finding.claims, []);
});
