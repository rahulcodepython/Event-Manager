"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ShieldIcon } from "lucide-react"
import { useForm } from "react-hook-form"

import { FullPageLoader } from "../../components/auth/full-page-loader"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form"
import { Input } from "../../components/ui/input"
import { useLoginMutation, useMeQuery } from "../../query-hooks/auth.api"
import { LoginSchema, type LoginValues } from "../../schema/auth.types"

export default function LoginPage() {
    const router = useRouter()
    const { data: me, isLoading } = useMeQuery()
    const login = useLoginMutation()

    const form = useForm<LoginValues>({
        resolver: zodResolver(LoginSchema),
        defaultValues: { username: "", password: "" },
    })

    React.useEffect(() => {
        if (me) router.replace("/dashboard")
    }, [me, router])

    if (isLoading || me) {
        return <FullPageLoader label="Checking session..." />
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="items-center text-center">
                    <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <ShieldIcon className="size-5" />
                    </div>
                    <CardTitle className="text-xl">IdentityCard Admin</CardTitle>
                    <CardDescription>Sign in with the admin account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit((v) => login.mutate(v))} className="flex flex-col gap-4">
                            <FormField
                                control={form.control}
                                name="username"
                                render={
                                    ({ field }) => <FormItem>
                                        <FormLabel>Username</FormLabel>
                                        <FormControl>
                                            <Input autoComplete="username" autoFocus {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                }
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={
                                    ({ field }) => <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" autoComplete="current-password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                }
                            />
                            <Button type="submit" className="w-full gap-2" disabled={login.isPending}>
                                {
                                    login.isPending && <Loader2 className="size-4 animate-spin" />
                                }
                                Sign in
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
