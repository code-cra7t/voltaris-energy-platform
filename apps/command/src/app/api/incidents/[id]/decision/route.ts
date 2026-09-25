import { approveProposal, rejectProposal } from "@voltaris/core";
import { canDispatch, errorResponse, forbidden, getStaff, unauthorized } from "@/lib/auth";
import { presentDetail } from "@/lib/presenter";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff) return unauthorized();
  if (!canDispatch(staff)) return forbidden();
  try {
    const body = await request.json();
    const incidentId = (await context.params).id;
    const proposalId = String(body.proposalId ?? "");
    if (!proposalId) return Response.json({ error: "A proposal is required." }, { status: 400 });
    if (body.decision === "approve") return Response.json(presentDetail(await approveProposal({ incidentId, proposalId, actor: staff.displayName })));
    if (body.decision === "reject") return Response.json(presentDetail(await rejectProposal({ incidentId, proposalId, actor: staff.displayName, reason: String(body.note ?? "").slice(0, 500) })));
    return Response.json({ error: "Choose approve or reject." }, { status: 400 });
  } catch (error) { return errorResponse(error); }
}
