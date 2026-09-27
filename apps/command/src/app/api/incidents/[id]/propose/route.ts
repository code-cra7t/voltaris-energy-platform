import { proposeDispatch } from "@voltaris/core";
import { canDispatch, errorResponse, forbidden, getStaff, inWorkspace, unauthorized } from "@/lib/auth";
import { presentDetail } from "@/lib/presenter";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff) return unauthorized();
  if (!canDispatch(staff)) return forbidden();
  try { return await inWorkspace(staff, "incidents.propose", async () => Response.json(presentDetail(await proposeDispatch((await context.params).id, staff.displayName)))); }
  catch (error) { return errorResponse(error); }
}
