import { listAssets } from "@voltaris/core";
import { getStaff, inWorkspace, unauthorized, errorResponse } from "@/lib/auth";
import { presentAsset } from "@/lib/presenter";

export async function GET() {
  const staff = await getStaff(); if (!staff) return unauthorized();
  try { return await inWorkspace(staff, "assets", async () => Response.json((await listAssets()).map(presentAsset))); }
  catch (error) { return errorResponse(error); }
}
