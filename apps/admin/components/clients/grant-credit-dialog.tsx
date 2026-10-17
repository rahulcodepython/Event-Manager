"use client"

import * as React from "react"
import { GiftIcon, Loader2 } from "lucide-react"

import { Button } from "../ui/button"
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useCatalogQuery } from "../../query-hooks/catalog.api"
import { useGrantCreditMutation } from "../../query-hooks/clients.api"

/** Gives the client a free credit built from the active catalog options. */
export function GrantCreditDialog({ clientId }: { clientId: string }) {
    const [open, setOpen] = React.useState(false)
    const [name, setName] = React.useState("")
    const [values, setValues] = React.useState<Record<string, number>>({})
    const { data: catalog } = useCatalogQuery()
    const grant = useGrantCreditMutation(clientId)

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (!next) {
            setName("")
            setValues({})
        }
    }

    const submit = async () => {
        if (!catalog || !name.trim()) return
        try {
            await grant.mutateAsync({
                name: name.trim(),
                selections: catalog.features.map((f) => ({ key: f.key, value: values[f.key] ?? f.default_value })),
            })
            handleOpenChange(false)
        } catch {
            // Mutation toasts its own error
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={
                <Button variant="outline" className="gap-2">
                    <GiftIcon className="size-4" />
                    Grant credit
                </Button>
            } />
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Grant a free credit</DialogTitle>
                    <DialogDescription>Valid from now for the chosen duration. No payment is recorded.</DialogDescription>
                </DialogHeader>
                <DialogBody className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="grant-name">Credit name *</Label>
                        <Input id="grant-name" placeholder="e.g. Partner event" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    {
                        catalog?.features.map((f) => {
                            const items = f.options.filter((o) => o.is_active).map((o) => ({ value: String(o.value), label: o.label }))
                            return <div key={f.key} className="flex flex-col gap-2">
                                <Label>{f.name}</Label>
                                <Select
                                    value={String(values[f.key] ?? f.default_value)}
                                    items={items}
                                    onValueChange={(v) => v !== null && setValues((prev) => ({ ...prev, [f.key]: Number(v) }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {
                                            items.map((item) => <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>)
                                        }
                                    </SelectContent>
                                </Select>
                            </div>
                        })
                    }
                </DialogBody>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={grant.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={grant.isPending || !name.trim() || !catalog} className="gap-2">
                        {
                            grant.isPending && <Loader2 className="size-4 animate-spin" />
                        }
                        Grant credit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
