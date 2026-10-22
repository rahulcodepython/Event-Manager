"use client";

import * as React from "react";
import {
    type ColumnDef,
    type Row,
    type RowData,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuTrigger,
} from "./context-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./table";

declare module "@tanstack/react-table" {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        headerClassName?: string;
        cellClassName?: string;
        style?: React.CSSProperties;
    }
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    isLoading?: boolean;
    loadingMessage?: string;
    emptyMessage?: string;
    renderRowContextMenu?: (row: Row<TData>) => React.ReactNode;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    isLoading = false,
    loadingMessage = "Loading records...",
    emptyMessage = "No records found.",
    renderRowContextMenu,
}: DataTableProps<TData, TValue>) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="w-full max-w-full min-w-0 rounded-xl border bg-card shadow-xs overflow-hidden">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                const meta = header.column.columnDef.meta;
                                return (
                                    <TableHead
                                        key={header.id}
                                        className={meta?.headerClassName}
                                        style={meta?.style}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef.header,
                                                  header.getContext()
                                              )}
                                    </TableHead>
                                );
                            })}
                            {
                                renderRowContextMenu && <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                            }
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {isLoading && data.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length + (renderRowContextMenu ? 1 : 0)}
                                className="h-24 text-center text-muted-foreground"
                            >
                                {loadingMessage}
                            </TableCell>
                        </TableRow>
                    ) : table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => {
                            const rowContent = (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => {
                                        const meta = cell.column.columnDef.meta;
                                        return (
                                            <TableCell
                                                key={cell.id}
                                                className={meta?.cellClassName}
                                                style={meta?.style}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                    {
                                        renderRowContextMenu && <TableCell className="w-10 text-right">
                                            <RowActionsButton />
                                        </TableCell>
                                    }
                                </TableRow>
                            );

                            if (renderRowContextMenu) {
                                const menuContent = renderRowContextMenu(row);
                                if (menuContent) {
                                    return (
                                        <ContextMenu key={row.id}>
                                            <ContextMenuTrigger render={rowContent} />
                                            <ContextMenuContent>
                                                {menuContent}
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    );
                                }
                            }

                            return rowContent;
                        })
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length + (renderRowContextMenu ? 1 : 0)}
                                className="h-24 text-center text-muted-foreground"
                            >
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

/** Opens the row's context menu, for people who do not right-click. */
export function RowActionsButton() {
    return (
        <button
            type="button"
            aria-label="Row actions"
            title="Actions"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                e.currentTarget.dispatchEvent(new MouseEvent("contextmenu", {
                    bubbles: true,
                    cancelable: true,
                    clientX: rect.left,
                    clientY: rect.bottom,
                }));
            }}
        >
            <MoreHorizontal className="size-4" />
        </button>
    );
}
