import { Suspense } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { auth } from "@/lib/auth"

export default async function ResetPasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session) {
    redirect("/dashboard")
  }

  return (
    <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl italic">Reset password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
    </Card>
  )
}
