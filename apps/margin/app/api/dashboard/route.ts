import { NextRequest, NextResponse } from "next/server";
import { getMarginDashboard } from "@voltaris/core";
import { badRequest, failed, parseQuarter, parseRegion, priorQuarters, quarterPeriod, staff, unauthorized } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await staff()) return unauthorized();
  let region, quarter;
  try { region = parseRegion(request.nextUrl.searchParams.get("region")); quarter = parseQuarter(request.nextUrl.searchParams.get("quarter")); } catch { return badRequest("Invalid region or quarter."); }
  try {
    const data = await getMarginDashboard({ region, quarter });
    const allRegions = region ? (await getMarginDashboard({ quarter })).regionBreakdown.map(r => r.region) : data.regionBreakdown.map(r => r.region);
    const currentPeriod = quarterPeriod(data.quarter);
    const priorPeriod = quarterPeriod(priorQuarters(data.quarter, 2)[1].key);
    const cents = (n: number) => n / 100;
    return NextResponse.json({
      current: { ...currentPeriod, start: data.periodStart, end: data.periodEnd, revenue: cents(data.current.recognizedRevenueCents), cost: cents(data.current.actualCostCents), margin: cents(data.current.marginCents), marginPct: data.current.marginPct },
      prior: { ...priorPeriod, start: data.priorPeriodStart, end: data.priorPeriodEnd, revenue: cents(data.prior.recognizedRevenueCents), cost: cents(data.prior.actualCostCents), margin: cents(data.prior.marginCents), marginPct: data.prior.marginPct },
      regions: allRegions,
      selectedRegion: region || "all",
      availableQuarters: priorQuarters(data.quarter),
      monthly: data.monthlySeries.map(m => ({ label: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${m.month}-01T00:00:00Z`)), revenue: cents(m.revenueCents), cost: cents(m.costCents), margin: cents(m.marginCents) })),
      drivers: data.drivers.map(d => ({ label: d.category, category: d.kind, current: cents(d.currentCents), prior: cents(d.priorCents), delta: cents(d.deltaCents) })),
      regionRows: data.regionBreakdown.map(r => ({ region: r.region, revenue: cents(r.current.recognizedRevenueCents), cost: cents(r.current.actualCostCents), margin: cents(r.current.marginCents), marginPct: r.current.marginPct, delta: cents(r.current.marginCents - r.prior.marginCents) })),
      eventCount: data.eventCount,
      updatedAt: new Date().toISOString(),
      synthetic: true,
    });
  } catch (error) { return failed(error); }
}
