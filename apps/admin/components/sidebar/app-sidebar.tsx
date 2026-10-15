"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    BookOpenIcon,
    LayoutDashboardIcon,
    LogOutIcon,
    RepeatIcon,
    ShieldIcon,
    TagsIcon,
    TicketPercentIcon,
    UsersIcon,
    WalletIcon,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "../ui/sidebar"
import { useLogoutMutation } from "../../query-hooks/auth.api"
import type { AdminMe } from "../../schema/auth.types"

const NAV = [
    {
        title: "Overview",
        items: [
            { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
            { title: "Clients", url: "/clients", icon: UsersIcon },
        ],
    },
    {
        title: "Money",
        items: [
            { title: "Transactions", url: "/transactions", icon: WalletIcon },
            { title: "Subscriptions", url: "/subscriptions", icon: RepeatIcon },
            { title: "Categories", url: "/categories", icon: TagsIcon },
        ],
    },
    {
        title: "Product",
        items: [
            { title: "Pricing catalog", url: "/catalog", icon: BookOpenIcon },
            { title: "Coupons", url: "/coupons", icon: TicketPercentIcon },
        ],
    },
]

export function AppSidebar({ me, ...props }: React.ComponentProps<typeof Sidebar> & { me: AdminMe }) {
    const pathname = usePathname()
    const logout = useLogoutMutation()

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="pointer-events-none">
                            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                                <ShieldIcon className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">IdentityCard Admin</span>
                                <span className="truncate text-xs text-muted-foreground">{me.username}</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {
                    NAV.map((group) => <SidebarGroup key={group.title}>
                        <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                        <SidebarMenu>
                            {
                                group.items.map((item) => <SidebarMenuItem key={item.url}>
                                    <SidebarMenuButton
                                        tooltip={item.title}
                                        isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
                                        render={<Link href={item.url} />}
                                    >
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>)
                            }
                        </SidebarMenu>
                    </SidebarGroup>)
                }
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Log out" disabled={logout.isPending} onClick={() => logout.mutate()}>
                            <LogOutIcon />
                            <span>Log out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
