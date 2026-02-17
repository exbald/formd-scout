import { requireAuth } from "@/lib/session";
import { DashboardNav } from "./nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check - redirects to /login if not authenticated
  await requireAuth();

  return <DashboardNav>{children}</DashboardNav>;
}
