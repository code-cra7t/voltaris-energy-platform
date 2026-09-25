import { completeWorkOrder, getIncidentDetail } from "@voltaris/core";
import { canDispatch, errorResponse, forbidden, getStaff, unauthorized } from "@/lib/auth";
import { presentDetail } from "@/lib/presenter";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff) return unauthorized();
  if (!canDispatch(staff)) return forbidden();
  try {
    const body = await request.json();
    const workOrderId = String(body.workOrderId ?? "");
    const actualCostCents = Number(body.actualCostCents);
    const completionNote = String(body.completionNote ?? "").trim();
    if (!workOrderId || !Number.isSafeInteger(actualCostCents) || actualCostCents < 0 || completionNote.length < 10 || completionNote.length > 1000) return Response.json({ error: "Provide a valid work order, actual cost, and completion note of at least 10 characters." }, { status: 400 });
    const incident = await getIncidentDetail((await context.params).id);
    if (!incident?.workOrder || incident.workOrder.id !== workOrderId) return Response.json({ error: "Work order does not belong to this incident." }, { status: 409 });
    const detail = await completeWorkOrder({ workOrderId, actor: staff.displayName, actualCostCents, completionNote });
    return Response.json(presentDetail(detail));
  } catch (error) { return errorResponse(error); }
}
