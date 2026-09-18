import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { auth } from "@/lib/auth"

export default async function ForgotPasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session) {
    redirect("/dashboard")
  }

  return (
    <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl italic">Forgot password</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a reset link
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <ForgotPasswordForm />
        </CardContent>
    </Card>
  )
}
