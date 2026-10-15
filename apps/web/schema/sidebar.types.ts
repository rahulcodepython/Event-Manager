import { LucideIcon } from "lucide-react";
import type * as React from "react";

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

// Sidebar user profile information
export interface SidebarUser {
    id: string;
    name: string;
    email: string;
    avatar: string;
}

// Props for NavUser component
export interface NavUserProps {
    user: SidebarUser;
}

// Team or organization item in the switcher
export interface SidebarTeam {
    name: string;
    logo: React.ElementType;
    plan: string;
}

// Props for TeamSwitcher component
export interface TeamSwitcherProps {
    teams: SidebarTeam[];
}

// Complete sidebar data model
export interface SidebarData {
    user: SidebarUser;
    teams: SidebarTeam[];
}
