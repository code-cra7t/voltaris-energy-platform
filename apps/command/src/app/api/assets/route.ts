import { listAssets } from "@voltaris/core";
import { getStaff, unauthorized, errorResponse } from "@/lib/auth";
import { presentAsset } from "@/lib/presenter";

export async function GET() {
  if (!await getStaff()) return unauthorized();
  try { return Response.json((await listAssets()).map(presentAsset)); }
  catch (error) { return errorResponse(error); }
}
