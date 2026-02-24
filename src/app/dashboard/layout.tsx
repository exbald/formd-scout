import { DashboardNav } from "./nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardNav>{children}</DashboardNav>;
}
