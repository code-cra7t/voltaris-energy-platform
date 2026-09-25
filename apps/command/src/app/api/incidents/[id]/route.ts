import { getIncidentDetail } from "@voltaris/core";
import { getStaff, unauthorized, errorResponse } from "@/lib/auth";
import { presentDetail } from "@/lib/presenter";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await getStaff()) return unauthorized();
  try {
    const incident = await getIncidentDetail((await context.params).id);
    return incident ? Response.json(presentDetail(incident)) : Response.json({ error: "Incident not found." }, { status: 404 });
  } catch (error) { return errorResponse(error); }
}
