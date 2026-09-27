import { resetReviewerWorkspace } from "@voltaris/core";
import { errorResponse, getStaff, inWorkspace, unauthorized } from "@/lib/auth";

export async function POST() {
  const staff = await getStaff();
  if (!staff) return unauthorized();
  if (staff.workspaceSchema === "public") return Response.json({ error: "Reset is available only in invited workspaces." }, { status: 403 });
  try { await inWorkspace(staff, "workspace.reset", resetReviewerWorkspace); return Response.json({ ok: true }); }
  catch (error) { return errorResponse(error); }
}
