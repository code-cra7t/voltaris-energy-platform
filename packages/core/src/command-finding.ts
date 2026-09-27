import type { EvidenceRef, IncidentFinding } from "./types.js";

type ModelFinding = Partial<IncidentFinding> | null;

export function buildIncidentFinding(
  response: ModelFinding,
  evidence: EvidenceRef[],
  generatedAt = new Date().toISOString(),
): IncidentFinding {
  const allowedIds = new Set(evidence.map((item) => item.id));
  const evidenceIds = Array.isArray(response?.evidenceIds)
    ? [...new Set(response.evidenceIds
      .filter((id): id is string => typeof id === "string")
      .map((id) => id.trim().replace(/^\[|\]$/g, ""))
      .filter((id) => allowedIds.has(id)))]
    : [];

  if (!response || evidenceIds.length === 0) {
    return {
      overview: "The available records were reviewed, but they do not establish a reliable cause for this incident.",
      likelyCauses: [],
      recommendedChecks: ["A qualified technician should assess the fault using the cited service records."],
      urgency: "priority",
      limitations: ["The AI assessment was unavailable or could not be tied to the retrieved sources. No specific cause is asserted."],
      evidenceIds: evidence.map((item) => item.id),
      generatedAt,
      generationMode: "source_review",
    };
  }

  return {
    overview: String(response.overview || "Evidence review completed"),
    likelyCauses: Array.isArray(response.likelyCauses) ? response.likelyCauses.map(String).slice(0, 5) : [],
    recommendedChecks: Array.isArray(response.recommendedChecks) ? response.recommendedChecks.map(String).slice(0, 5) : [],
    urgency: ["routine", "priority", "urgent"].includes(String(response.urgency))
      ? response.urgency as IncidentFinding["urgency"] : "priority",
    limitations: Array.isArray(response.limitations) ? response.limitations.map(String).slice(0, 5) : [],
    evidenceIds,
    generatedAt,
    generationMode: "ai_grounded",
  };
}
