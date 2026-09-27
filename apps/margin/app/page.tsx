import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyStaffSession } from "@voltaris/core";
import DashboardClient from "@/components/DashboardClient";

export default async function Page() {
  const token = (await cookies()).get("voltaris_session")?.value;
  const staff = token ? verifyStaffSession(token) : null;
  if (!staff) redirect("/login");
  return <DashboardClient reviewerWorkspace={staff.workspaceSchema !== "public"}
    commandUrl={process.env.NEXT_PUBLIC_COMMAND_URL || "https://voltaris-energy-platform-command.vercel.app/"} />;
}
