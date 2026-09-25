import { createIncident, listIncidents } from "@voltaris/core";
import { canDispatch, errorResponse, forbidden, getStaff, unauthorized } from "@/lib/auth";
import { presentIncident } from "@/lib/presenter";

export async function GET() {
  if (!await getStaff()) return unauthorized();
  try { return Response.json((await listIncidents()).map(presentIncident)); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  const staff = await getStaff();
  if (!staff) return unauthorized();
  if (!canDispatch(staff)) return forbidden();
  try {
    const body = await request.json();
    const assetId = String(body.assetId ?? "").trim();
    const description = String(body.description ?? "").trim();
    if (!assetId || description.length < 15 || description.length > 1000) return Response.json({ error: "Select an asset and provide a description of at least 15 characters." }, { status: 400 });
    return Response.json(await createIncident({ assetId, description, reportedBy: staff.displayName }), { status: 201 });
  } catch (error) { return errorResponse(error); }
}
