"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FullPageLoader } from "../../components/auth/full-page-loader"
import { AppSidebar } from "../../components/sidebar/app-sidebar"
import BreadcrumbBar from "../../components/sidebar/breadcrumb"
import { Separator } from "../../components/ui/separator"
import { useMeQuery } from "../../query-hooks/auth.api"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "../../components/ui/sidebar"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const { data: me } = useMeQuery()
    const needsOnboarding = Boolean(me && !me.organization)

    // A 401 from /auth/me is handled globally (redirect to /login).
    React.useEffect(() => {
        if (needsOnboarding) router.replace("/onboarding")
    }, [needsOnboarding, router])

    if (!me || needsOnboarding) {
        return <FullPageLoader label="Loading your workspace..." />
    }

    return (
        <SidebarProvider>
            <AppSidebar me={me} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
                        />
                        <BreadcrumbBar />
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0 w-full max-w-full min-w-0">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
