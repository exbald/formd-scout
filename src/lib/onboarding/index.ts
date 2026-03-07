import "server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamProfiles } from "@/lib/schema";

export async function hasTeamProfile(): Promise<boolean> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return false;
  }

  try {
    const profiles = await db
      .select()
      .from(teamProfiles)
      .where(eq(teamProfiles.userId, session.user.id))
      .limit(1);

    return profiles.length > 0;
  } catch (error) {
    console.error("Error checking team profile:", error);
    return false;
  }
}
