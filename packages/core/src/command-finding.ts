import type { EvidenceRef, IncidentFinding } from "./types.js";

type ModelClaim = { kind?: unknown; text?: unknown; evidenceIds?: unknown };
type ModelFinding = { overview?: unknown; claims?: unknown; urgency?: unknown; limitations?: unknown } | null;

export const INCIDENT_FINDING_SCHEMA = {
  type: "object",
  properties: {
    overview: { type: "string" },
    claims: { type: "array", items: { type: "object", properties: {
      kind: { type: "string", enum: ["cause", "check"] },
      text: { type: "string" },
      evidenceIds: { type: "array", items: { type: "string" } },
    }, required: ["kind", "text", "evidenceIds"] } },
    urgency: { type: "string", enum: ["routine", "priority", "urgent"] },
    limitations: { type: "array", items: { type: "string" } },
  },
  required: ["overview", "claims", "urgency", "limitations"],
} as const;

export function buildIncidentFinding(
  response: ModelFinding,
  evidence: EvidenceRef[],
  generatedAt = new Date().toISOString(),
): IncidentFinding {
  const allowedIds = new Set(evidence.map((item) => item.id));
  const claims = Array.isArray(response?.claims) ? response.claims.slice(0, 8).flatMap((candidate: ModelClaim) => {
    if (!candidate || !["cause", "check"].includes(String(candidate.kind)) ||
      typeof candidate.text !== "string" || candidate.text.trim().length < 10 || candidate.text.length > 300 ||
      !Array.isArray(candidate.evidenceIds) || candidate.evidenceIds.length === 0) return [];
    const ids = candidate.evidenceIds.map(id => typeof id === "string" ? id.trim().replace(/^\[|\]$/g, "") : "");
    // Reject the whole claim if any citation is absent from the retrieved set.
    if (ids.some(id => !allowedIds.has(id))) return [];
    return [{ kind: candidate.kind as "cause" | "check", text: candidate.text.trim(), evidenceIds: [...new Set(ids)] }];
  }) : [];
  const evidenceIds = [...new Set(claims.flatMap(claim => claim.evidenceIds))];

  if (!response || claims.length === 0) {
    return {
      overview: "The available records were reviewed, but they do not establish a reliable cause for this incident.",
      likelyCauses: [],
      recommendedChecks: ["A qualified technician should assess the fault using the cited service records."],
      urgency: "priority",
      limitations: ["The AI assessment was unavailable or could not be tied to the retrieved sources. No specific cause is asserted."],
      evidenceIds: evidence.map((item) => item.id),
      claims: [],
      generatedAt,
      generationMode: "source_review",
    };
  }

  return {
    overview: "Assessment of retrieved records. Inspect the source linked to each finding below.",
    likelyCauses: claims.filter(claim => claim.kind === "cause").map(claim => claim.text),
    recommendedChecks: claims.filter(claim => claim.kind === "check").map(claim => claim.text),
    urgency: ["routine", "priority", "urgent"].includes(String(response.urgency))
      ? response.urgency as IncidentFinding["urgency"] : "priority",
    limitations: Array.isArray(response.limitations) ? response.limitations.filter((item): item is string => typeof item === "string").slice(0, 5) : [],
    evidenceIds,
    claims,
    generatedAt,
    generationMode: "ai_grounded",
  };
}
