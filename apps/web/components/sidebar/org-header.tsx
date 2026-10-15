"use client"

import { Building2Icon } from "lucide-react"

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar"
import type { Me } from "../../schema/auth.types"

export function OrgHeader({ me }: { me: Me }) {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton size="lg" className="pointer-events-none">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                        <Building2Icon className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{me.organization?.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{me.user.email}</span>
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
