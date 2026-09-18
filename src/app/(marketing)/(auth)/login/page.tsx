import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/auth/sign-in-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect("/dashboard");
  }

  const { reset } = await searchParams;

  return (
    <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl italic">Welcome back</CardTitle>
          <CardDescription>Sign in to your private desk</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {reset === "success" && (
            <p className="text-success mb-4 text-sm">
              Password reset successfully. Please sign in with your new password.
            </p>
          )}
          <SignInButton />
        </CardContent>
    </Card>
  );
}
