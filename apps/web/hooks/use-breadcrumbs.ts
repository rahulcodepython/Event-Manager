"use client";

import * as React from "react";

import type { Breadcrumb } from "../schema/breadcrumb.types";
import { useBreadcrumbStore } from "../store/breadcrumb.store";

/**
 * Custom hook to set page breadcrumbs without boilerplate.
 * Safely compares breadcrumbs by serialized value so inline array literals do not trigger re-render loops.
 *
 * @example
 * useBreadcrumbs([
 *     { title: "Dashboard", url: "/dashboard" },
 *     { title: "Events" },
 * ]);
 */
export function useBreadcrumbs(breadcrumbs: Breadcrumb[]): void {
    const setBreadcrumbs = useBreadcrumbStore((state) => state.setBreadcrumbs);

    const serialized = React.useMemo(
        () => JSON.stringify(breadcrumbs),
        [breadcrumbs]
    );

    React.useEffect(() => {
        setBreadcrumbs(breadcrumbs);
    }, [setBreadcrumbs, serialized]);
}
