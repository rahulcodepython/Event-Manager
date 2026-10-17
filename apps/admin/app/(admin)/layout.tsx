"use client"

import * as React from "react"

import { FullPageLoader } from "../../components/auth/full-page-loader"
import { AppSidebar } from "../../components/sidebar/app-sidebar"
import BreadcrumbBar from "../../components/sidebar/breadcrumb"
import { Separator } from "../../components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "../../components/ui/sidebar"
import { useMeQuery } from "../../query-hooks/auth.api"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    // A 401 from /auth/me is handled globally (redirect to /login).
    const { data: me } = useMeQuery()

    if (!me) {
        return <FullPageLoader label="Loading admin..." />
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
                <div className="flex w-full min-w-0 max-w-full flex-1 flex-col gap-4 p-4 pt-0">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
