"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { FullPageLoader } from "../../components/auth/full-page-loader"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { googleLoginUrl, useMeQuery } from "../../query-hooks/auth.api"

const ERROR_MESSAGES: Record<string, string> = {
    google_not_configured: "Google login is not configured yet.",
    google_denied: "Google sign-in was cancelled.",
    invalid_state: "Your sign-in attempt expired. Please try again.",
    email_not_verified: "Your Google account email is not verified.",
    login_failed: "Sign-in failed. Please try again.",
}

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
        </svg>
    )
}

function LoginContent() {
    const router = useRouter()
    const error = useSearchParams().get("error")
    const { data: me, isLoading } = useMeQuery()

    React.useEffect(() => {
        if (me) router.replace(me.organization ? "/dashboard" : "/onboarding")
    }, [me, router])

    if (isLoading || me) {
        return <FullPageLoader label="Checking session..." />
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Sign in to IdentityCard</CardTitle>
                    <CardDescription>New here? Signing in creates your account.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    {
                        error && <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                            {ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again."}
                        </p>
                    }
                    <Button
                        variant="outline"
                        className="w-full gap-2"
                        nativeButton={false}
                        render={<a href={googleLoginUrl} />}
                    >
                        <GoogleIcon />
                        <span>Continue with Google</span>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

export default function LoginPage() {
    return (
        <React.Suspense fallback={<FullPageLoader label="Loading..." />}>
            <LoginContent />
        </React.Suspense>
    )
}
