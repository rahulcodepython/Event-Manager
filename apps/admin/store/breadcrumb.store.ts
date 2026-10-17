"use client";

import { create } from "zustand";

import type { Breadcrumb } from "../schema/breadcrumb.types";

export interface BreadcrumbState {
    breadcrumbs: Breadcrumb[];
    setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
    breadcrumbs: [],
    setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
}));
