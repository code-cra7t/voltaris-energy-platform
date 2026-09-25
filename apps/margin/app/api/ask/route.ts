import { NextRequest, NextResponse } from "next/server";
import { getMarginAnalysis } from "@voltaris/core";
import type { MarginAnalysisKind } from "@voltaris/core";
import { badRequest, failed, parseQuarter, parseRegion, staff, unauthorized } from "@/lib/server";

const allowed: MarginAnalysisKind[] = ["margin_change", "revenue_drivers", "cost_drivers", "backlog"];

function classify(question: string): MarginAnalysisKind | null {
  const q = question.toLowerCase();
  if (/backlog|pipeline|open work|forecast/.test(q)) return "backlog";
  if (/cost|expense|spend/.test(q)) return "cost_drivers";
  if (/revenue|sales|income/.test(q)) return "revenue_drivers";
  if (/margin|profit|performance|quarter|change/.test(q)) return "margin_change";
  return null;
}

export async function POST(request: NextRequest) {
  if (!await staff()) return unauthorized();
  let body: { question?: unknown; analysis?: unknown; region?: unknown; quarter?: unknown };
  try { body = await request.json(); } catch { return badRequest("Enter a question about the business."); }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 300) return badRequest("Enter a question of 1 to 300 characters.");
  let region, quarter;
  try { region = parseRegion(typeof body.region === "string" ? body.region : null); quarter = parseQuarter(typeof body.quarter === "string" ? body.quarter : null); } catch { return badRequest("Invalid region or quarter."); }
  const analysis = typeof body.analysis === "string" && allowed.includes(body.analysis as MarginAnalysisKind) ? body.analysis as MarginAnalysisKind : classify(question);
  if (!analysis) return NextResponse.json({ error: "I can answer questions about margin changes, revenue drivers, direct costs, and the open service backlog. Try one of the suggested questions." }, { status: 422 });
  try {
    const result = await getMarginAnalysis({ region, quarter, analysis });
    const evidence = analysis === "backlog" ? [{ label: "Open backlog", value: result.headline }] : [
      { label: "Recognized revenue", value: new Intl.NumberFormat("en-DE", { style: "currency", currency: "EUR" }).format(result.metrics.recognizedRevenueCents / 100) },
      { label: "Actual direct cost", value: new Intl.NumberFormat("en-DE", { style: "currency", currency: "EUR" }).format(result.metrics.actualCostCents / 100) },
      { label: "Actual service margin", value: new Intl.NumberFormat("en-DE", { style: "currency", currency: "EUR" }).format(result.metrics.marginCents / 100) },
    ];
    return NextResponse.json({ question, analysis, answer: result.explanation, evidence, caveat: result.limitations.join(" "), sourceEventIds: result.evidence.map(e => e.id), generatedBy: result.generatedBy });
  } catch (error) { return failed(error); }
}
