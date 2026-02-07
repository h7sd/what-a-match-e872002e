import { Metadata } from "next";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export const metadata: Metadata = {
  title: "Dashboard | UserVault",
  description: "Manage your UserVault profile, badges, and settings.",
};

export default function Dashboard() {
  return <DashboardPage />;
}
