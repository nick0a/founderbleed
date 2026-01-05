"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Sign In</h1>
      <Button onClick={() => signIn("google", { callbackUrl: "/" })}>
        Sign in with Google
      </Button>
    </div>
  )
}
