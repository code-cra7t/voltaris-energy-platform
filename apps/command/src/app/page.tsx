import { CommandApp } from "@/components/CommandApp";
import { getStaff } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page() {
  const staff = await getStaff();
  if (!staff) redirect("/login");
  return <CommandApp staffName={staff.displayName} canDispatch={staff.role !== "manager"}
    reviewerWorkspace={staff.workspaceSchema !== "public"}
    marginUrl={process.env.NEXT_PUBLIC_MARGIN_URL || "https://voltaris-energy-platform-margin.vercel.app/"} />;
}
