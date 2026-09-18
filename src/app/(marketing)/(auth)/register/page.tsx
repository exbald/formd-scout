import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { SignUpForm } from "@/components/auth/sign-up-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { auth } from "@/lib/auth"

export default async function RegisterPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session) {
    redirect("/dashboard")
  }

  return (
    <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl italic">Create an account</CardTitle>
          <CardDescription>Start watching Form D filings for your markets</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <SignUpForm />
        </CardContent>
    </Card>
  )
}
