"use client";

import * as React from "react";
import Link from "next/link";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { useBreadcrumbStore } from "../../store/breadcrumb.store";

const BreadcrumbBar = () => {
    const breadcrumbs = useBreadcrumbStore((state) => state.breadcrumbs);

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {breadcrumbs.map((breadcrumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;

                    return (
                        <React.Fragment key={index}>
                            <BreadcrumbItem>
                                {breadcrumb.url && !isLast ? (
                                    <Link href={breadcrumb.url}>
                                        {breadcrumb.title}
                                    </Link>
                                ) : (
                                    <BreadcrumbPage>
                                        {breadcrumb.title}
                                    </BreadcrumbPage>
                                )}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator />}
                        </React.Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
};

export default BreadcrumbBar;