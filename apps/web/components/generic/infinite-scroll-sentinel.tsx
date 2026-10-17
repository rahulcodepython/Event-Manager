"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

export interface InfiniteScrollSentinelProps {
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;
    itemCount?: number;
    itemLabel?: string;
    rootMargin?: string;
}

export function InfiniteScrollSentinel({
    hasNextPage = false,
    isFetchingNextPage = false,
    fetchNextPage,
    itemCount = 0,
    itemLabel = "items",
    rootMargin = "200px",
}: InfiniteScrollSentinelProps) {
    const observerTarget = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const target = observerTarget.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            {
                root: null,
                rootMargin,
                threshold: 0,
            }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [fetchNextPage, hasNextPage, isFetchingNextPage, rootMargin]);

    return (
        <div ref={observerTarget} className="flex items-center justify-center py-4 text-xs text-muted-foreground">
            {
                isFetchingNextPage ? <div className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span>Loading more {itemLabel}...</span>
                </div> : hasNextPage ? <span className="text-muted-foreground/60">
                    Scroll down to load more
                </span> : itemCount > 0 ? <span>
                    All {itemLabel} loaded
                </span> : null
            }
        </div>
    );
}
