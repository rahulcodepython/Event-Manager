"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogBody,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "../ui/alert-dialog"
import { Input } from "../ui/input"

/** A button that asks for confirmation, runs onConfirm and closes on success. */
export function ConfirmButton({
    trigger,
    title,
    description,
    confirmLabel,
    destructive = false,
    confirmText,
    onConfirm,
}: {
    trigger: React.ReactElement
    title: string
    description: React.ReactNode
    confirmLabel: string
    destructive?: boolean
    /** When set, the action is enabled only after this text is typed. */
    confirmText?: string
    onConfirm: () => Promise<unknown>
}) {
    const [open, setOpen] = React.useState(false)
    const [pending, setPending] = React.useState(false)
    const [typed, setTyped] = React.useState("")
    const blocked = confirmText !== undefined && typed.trim() !== confirmText.trim()

    const confirm = async () => {
        setPending(true)
        try {
            await onConfirm()
            setOpen(false)
        } catch {
            // Mutations toast their own errors
        } finally {
            setPending(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={(next) => { setOpen(next); setTyped("") }}>
            <AlertDialogTrigger render={trigger} />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogBody>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                    {
                        confirmText !== undefined && <div className="mt-3 flex flex-col gap-1.5">
                            <label htmlFor="confirm-text" className="text-xs text-muted-foreground">
                                Type <span className="font-semibold text-foreground">{confirmText}</span> to confirm
                            </label>
                            <Input id="confirm-text" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
                        </div>
                    }
                </AlertDialogBody>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant={destructive ? "destructive" : "default"} disabled={pending || blocked} onClick={confirm} className="gap-2">
                        {
                            pending && <Loader2 className="size-4 animate-spin" />
                        }
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
