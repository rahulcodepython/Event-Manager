"use client"

import * as React from "react"
import { PencilIcon } from "lucide-react"

import { Button } from "../ui/button"
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { Input } from "../ui/input"
import { useRenameCreditMutation } from "../../query-hooks/credits.api"
import type { Credit } from "../../schema/credits.types"

export function RenameCreditDialog({ credit }: { credit: Credit }) {
    const [open, setOpen] = React.useState(false)
    const [name, setName] = React.useState(credit.name)
    const rename = useRenameCreditMutation()

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) setName(credit.name)
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await rename.mutateAsync({ id: credit.id, name })
            setOpen(false)
        } catch {
            // Handled by mutation toast
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={
                <Button variant="ghost" size="icon" aria-label="Rename credit">
                    <PencilIcon className="size-3.5" />
                </Button>
            } />
            <DialogContent className="sm:max-w-sm">
                <form onSubmit={submit} className="flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Rename credit</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={rename.isPending || !name.trim()}>
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
