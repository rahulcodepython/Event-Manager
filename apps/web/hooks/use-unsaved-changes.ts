"use client";

import * as React from "react";

const DEFAULT_MESSAGE = "You have unsaved changes. Leave without saving?";

/**
 * Warns before leaving a page with unsaved changes: on reload or tab close,
 * and on clicks on in-app links.
 */
export function useUnsavedChangesGuard(dirty: boolean, message: string = DEFAULT_MESSAGE) {
    React.useEffect(() => {
        if (!dirty) return;

        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        const onClick = (e: MouseEvent) => {
            const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (!link || link.target === "_blank" || e.defaultPrevented) return;
            const url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
            if (!window.confirm(message)) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        window.addEventListener("beforeunload", onBeforeUnload);
        document.addEventListener("click", onClick, true);
        return () => {
            window.removeEventListener("beforeunload", onBeforeUnload);
            document.removeEventListener("click", onClick, true);
        };
    }, [dirty, message]);
}
