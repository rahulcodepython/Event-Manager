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

/** A button that asks for confirmation, runs onConfirm and closes on success. */
export function ConfirmButton({
    trigger,
    title,
    description,
    confirmLabel,
    destructive = false,
    onConfirm,
}: {
    trigger: React.ReactElement
    title: string
    description: React.ReactNode
    confirmLabel: string
    destructive?: boolean
    onConfirm: () => Promise<unknown>
}) {
    const [open, setOpen] = React.useState(false)
    const [pending, setPending] = React.useState(false)

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
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger render={trigger} />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogBody>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogBody>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant={destructive ? "destructive" : "default"} disabled={pending} onClick={confirm} className="gap-2">
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
