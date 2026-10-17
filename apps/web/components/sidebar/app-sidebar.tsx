"use client"

import * as React from "react"

import { NavItems } from "./nav-items"
import { NavUser } from "./nav-user"
import { OrgHeader } from "./org-header"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "../ui/sidebar"
import type { Me } from "../../schema/auth.types"

export function AppSidebar({ me, ...props }: React.ComponentProps<typeof Sidebar> & { me: Me }) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <OrgHeader me={me} />
            </SidebarHeader>
            <SidebarContent>
                <NavItems />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={me.user} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
