"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  return (
    <div className="container mx-auto flex h-screen w-full items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Authentication Error</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {error === "Configuration" && "There is a problem with the server configuration. Check if your options are correct."}
            {error === "AccessDenied" && "You do not have permission to sign in."}
            {error === "Verification" && "The sign in link is no longer valid. It may have been used already or it may have expired."}
            {!["Configuration", "AccessDenied", "Verification"].includes(error || "") && (error || "An unknown error occurred")}
          </p>
          <Button asChild>
            <Link href="/signin">Try Again</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  )
}
