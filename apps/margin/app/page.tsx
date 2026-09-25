import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyStaffSession } from "@voltaris/core";
import DashboardClient from "@/components/DashboardClient";

export default async function Page() {
  const token = (await cookies()).get("voltaris_session")?.value;
  if (!token || !verifyStaffSession(token)) redirect("/login");
  return <DashboardClient />;
}
