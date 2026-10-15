"use client"

import * as React from "react"
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"

import { ConfirmButton } from "../generic/confirm-button"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import {
    useCreateCategoryMutation,
    useDeleteCategoryMutation,
    useRenameCategoryMutation,
} from "../../query-hooks/ledger.api"
import type { Category, CategoryKind } from "../../schema/ledger.types"

function CategoryRow({ category }: { category: Category }) {
    const [editing, setEditing] = React.useState(false)
    const [name, setName] = React.useState(category.name)
    const rename = useRenameCategoryMutation()
    const remove = useDeleteCategoryMutation()

    const save = async () => {
        if (!name.trim() || name.trim() === category.name) {
            setEditing(false)
            return
        }
        try {
            await rename.mutateAsync({ id: category.id, data: { name: name.trim(), kind: category.kind } })
            setEditing(false)
        } catch {
            // Mutation toasts its own error
        }
    }

    return (
        <div className="flex items-center justify-between gap-2 rounded-md border p-2">
            {
                editing ? <div className="flex flex-1 items-center gap-1">
                    <Input
                        value={name}
                        autoFocus
                        className="h-8"
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && save()}
                    />
                    <Button size="icon-sm" variant="ghost" onClick={save} disabled={rename.isPending} aria-label="Save">
                        <CheckIcon />
                    </Button>
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Cancel"
                        onClick={() => {
                            setName(category.name)
                            setEditing(false)
                        }}
                    >
                        <XIcon />
                    </Button>
                </div> : <>
                    <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">{category.name}</span>
                        <span className="text-xs text-muted-foreground">{category.in_use} uses</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Rename">
                            <PencilIcon />
                        </Button>
                        <ConfirmButton
                            trigger={
                                <Button size="icon-sm" variant="ghost" aria-label="Delete">
                                    <Trash2Icon />
                                </Button>
                            }
                            title={`Delete "${category.name}"?`}
                            description="Entries and subscriptions in this category become uncategorized. Nothing else is deleted."
                            confirmLabel="Delete"
                            destructive
                            onConfirm={() => remove.mutateAsync(category.id)}
                        />
                    </div>
                </>
            }
        </div>
    )
}

export function CategoryColumn({ kind, categories }: { kind: CategoryKind, categories: Category[] }) {
    const [name, setName] = React.useState("")
    const create = useCreateCategoryMutation()

    const add = async () => {
        if (!name.trim()) return
        try {
            await create.mutateAsync({ name: name.trim(), kind })
            setName("")
        } catch {
            // Mutation toasts its own error
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base capitalize">{kind}</CardTitle>
                <CardDescription>
                    {kind === "income" ? "For manual income entries." : "For manual expenses and subscriptions."}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <Input
                        placeholder="New category"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && add()}
                    />
                    <Button onClick={add} disabled={create.isPending || !name.trim()} className="gap-1.5">
                        <PlusIcon className="size-4" />
                        Add
                    </Button>
                </div>
                {
                    categories.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No categories yet.</p>
                }
                {
                    categories.map((c) => <CategoryRow key={c.id} category={c} />)
                }
            </CardContent>
        </Card>
    )
}
