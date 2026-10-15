"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"

import { FullPageLoader } from "../../components/auth/full-page-loader"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form"
import { Input } from "../../components/ui/input"
import { PhoneInput } from "../../components/ui/phone-input"
import { useMeQuery, useOnboardingMutation } from "../../query-hooks/auth.api"
import { OnboardingSchema, type OnboardingValues } from "../../schema/auth.types"

export default function OnboardingPage() {
    const router = useRouter()
    const { data: me, isLoading } = useMeQuery()
    const onboarding = useOnboardingMutation()

    const form = useForm<OnboardingValues>({
        resolver: zodResolver(OnboardingSchema),
        defaultValues: { name: "", phone: "" },
    })

    React.useEffect(() => {
        if (me?.organization) router.replace("/dashboard")
    }, [me, router])

    const onSubmit = async (values: OnboardingValues) => {
        try {
            await onboarding.mutateAsync(values)
            router.replace("/dashboard")
        } catch {
            // Handled by mutation toast
        }
    }

    if (isLoading || !me || me.organization) {
        return <FullPageLoader label="Loading..." />
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-xl">Set up your organization</CardTitle>
                    <CardDescription>
                        Signed in as {me.user.email}. This name appears on your events and forms.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={
                                    ({ field }) => <FormItem>
                                        <FormLabel>Organization name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Acme Events" autoFocus {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                }
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={
                                    ({ field }) => <FormItem>
                                        <FormLabel>Phone (optional)</FormLabel>
                                        <FormControl>
                                            <PhoneInput value={field.value} onChange={field.onChange} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                }
                            />
                            <Button type="submit" disabled={onboarding.isPending} className="gap-2">
                                {
                                    onboarding.isPending && <Loader2 className="size-4 animate-spin" />
                                }
                                <span>Continue</span>
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
