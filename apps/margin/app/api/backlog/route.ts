import { NextRequest, NextResponse } from "next/server";
import { getBacklog } from "@voltaris/core";
import { badRequest, failed, parseRegion, staff, unauthorized } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await staff()) return unauthorized();
  let region;
  try { region = parseRegion(request.nextUrl.searchParams.get("region")); } catch { return badRequest("Invalid region."); }
  try {
    const data = await getBacklog({ region });
    return NextResponse.json({
      items: data.items.map(item => ({ id: item.workOrder.id, status: item.workOrder.status, title: `Service ${item.assetCode}`, siteName: item.site.name, region: item.site.region, scheduledFor: item.workOrder.startsAt, forecastRevenue: item.forecastRevenueCents / 100, forecastCost: item.forecastCostCents / 100, source: "approved_work_order" })),
      forecastRevenue: data.forecastRevenueCents / 100,
      forecastCost: data.forecastCostCents / 100,
      openCount: data.openWorkOrderCount,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) { return failed(error); }
}
