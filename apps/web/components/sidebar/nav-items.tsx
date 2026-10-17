"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "../ui/collapsible";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "../ui/sidebar";
import { useNavLayout } from "../../lib/nav";

export function NavItems() {
    const pathname = usePathname();
    const nav = useNavLayout(pathname);

    if (!nav || nav.length === 0) {
        return null;
    }

    return (
        nav.map((n, i) => {
            switch (n.type) {
                case "back":
                    return (
                        <SidebarGroup key={`back-${i}`} className="pb-0">
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        tooltip={n.title}
                                        className="text-muted-foreground hover:text-foreground font-medium"
                                        render={<Link href={n.url} />}
                                    >
                                        <n.icon className="-mt-1" />
                                        <span>{n.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                    );
                case "group":
                    return (
                        <SidebarGroup key={`group-${i}`}>
                            <SidebarGroupLabel>{n.title}</SidebarGroupLabel>
                            <SidebarMenu>
                                {
                                    n.items.map((item) => {
                                        return item.items && item.items.length > 0 ? <Collapsible
                                            key={item.title}
                                            className="group/collapsible"
                                            render={
                                                <SidebarMenuItem />
                                            }>
                                            <CollapsibleTrigger render={
                                                <SidebarMenuButton tooltip={item.title} />
                                            }>
                                                {item.icon && <item.icon />}
                                                <span>{item.title}</span>
                                                <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub>
                                                    {
                                                        item.items.map((subItem) => {
                                                            return <SidebarMenuSubItem key={subItem.title}>
                                                                <SidebarMenuSubButton
                                                                    isActive={pathname === subItem.url}
                                                                    render={<Link href={subItem.url} />}
                                                                >
                                                                    <span>{subItem.title}</span>
                                                                </SidebarMenuSubButton>
                                                            </SidebarMenuSubItem>
                                                        })
                                                    }
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </Collapsible> : <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton tooltip={item.title} isActive={pathname === item.url} render={
                                                <Link href={item.url} />
                                            }>
                                                <item.icon className="-mt-1" />
                                                <span>{item.title}</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    })
                                }
                            </SidebarMenu>
                        </SidebarGroup>
                    );
            }
        })
    );
}
