import { LucideIcon } from "lucide-react";

// Project navigation item
export interface NavItem {
    title: string;
    url: string;
    icon: LucideIcon;
    description?: string;
}

export type NavItems = NavItem & {
    items?: NavItem[]
}

export type NavBack = NavItem & {
    type: "back"
}

export type NavGroup = {
    type: "group"
    title: string;
    items: NavItems[]
}

export type NavNode = NavBack | NavGroup
