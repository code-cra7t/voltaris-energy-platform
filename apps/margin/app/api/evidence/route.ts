import { NextRequest, NextResponse } from "next/server";
import { getMarginEvidence } from "@voltaris/core";
import { badRequest, failed, parseQuarter, parseRegion, staff, unauthorized } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await staff()) return unauthorized();
  let region, quarter;
  try { region = parseRegion(request.nextUrl.searchParams.get("region")); quarter = parseQuarter(request.nextUrl.searchParams.get("quarter")); } catch { return badRequest("Invalid region or quarter."); }
  const kindParam = request.nextUrl.searchParams.get("kind");
  const kind = kindParam === "recognized_revenue" || kindParam === "actual_cost" ? kindParam : undefined;
  if (kindParam && kindParam !== "all" && !kind) return badRequest("Invalid event type.");
  const category = request.nextUrl.searchParams.get("category")?.trim() || undefined;
  if (category && category.length > 120) return badRequest("Invalid category.");
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") || "30");
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) return badRequest("Limit must be between 1 and 100.");
  try {
    const result = await getMarginEvidence({ region, quarter, kind, category, limit: requestedLimit, cursor: request.nextUrl.searchParams.get("cursor") || undefined });
    return NextResponse.json({
      records: result.items.filter(e => e.kind === "recognized_revenue" || e.kind === "actual_cost").map(e => ({ id: e.id, occurredAt: e.occurredOn, kind: e.kind, amount: e.amountCents / 100, category: e.category, description: e.description, region: e.site.region, siteName: e.site.name, siteId: e.site.id, workOrderId: e.workOrderId, sourceReference: e.sourceReference })),
      nextCursor: result.nextCursor,
    });
  } catch (error) { return failed(error); }
}
