import { getIncidentDetail } from "@voltaris/core";
import { getStaff, inWorkspace, unauthorized, errorResponse } from "@/lib/auth";
import { presentDetail } from "@/lib/presenter";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaff(); if (!staff) return unauthorized();
  try { return await inWorkspace(staff, "incidents/[id]", async () => {
    const incident = await getIncidentDetail((await context.params).id);
    return incident ? Response.json(presentDetail(incident)) : Response.json({ error: "Incident not found." }, { status: 404 });
  }); } catch (error) { return errorResponse(error); }
}
