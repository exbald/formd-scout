import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamProfiles } from "@/lib/schema";
import { DashboardNav } from "./nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;
  const pathname = headersList.get("x-pathname") || "";

  if (!pathname.includes("/onboarding")) {
    try {
      const profile = await db
        .select()
        .from(teamProfiles)
        .where(eq(teamProfiles.userId, userId))
        .limit(1);

      if (profile.length === 0) {
        redirect("/dashboard/onboarding");
      }
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }
      console.error("Error checking team profile:", error);
      redirect("/login");
    }
  }

  return <DashboardNav>{children}</DashboardNav>;
}
