"use client"

import * as React from "react"
import { CheckCircle2Icon, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "../ui/button"
import { Card, CardContent } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { sendContact } from "../../lib/api"

export function ContactForm() {
    const [form, setForm] = React.useState({ name: "", email: "", message: "", website: "" })
    const [pending, setPending] = React.useState(false)
    const [sent, setSent] = React.useState(false)

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value }))

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setPending(true)
        try {
            await sendContact(form)
            setSent(true)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not send the message")
        } finally {
            setPending(false)
        }
    }

    if (sent) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                    <CheckCircle2Icon className="size-8 text-primary" />
                    <p className="font-semibold">Message sent</p>
                    <p className="text-sm text-muted-foreground">We will reply to {form.email}.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent>
                <form onSubmit={submit} className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="contact-name">Name</Label>
                            <Input id="contact-name" required maxLength={200} value={form.name} onChange={set("name")} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="contact-email">Email</Label>
                            <Input id="contact-email" type="email" required value={form.email} onChange={set("email")} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="contact-message">Message</Label>
                        <Textarea id="contact-message" required maxLength={5000} rows={5} value={form.message} onChange={set("message")} />
                    </div>
                    {/* Honeypot: hidden from people, filled by bots. */}
                    <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        className="hidden"
                        value={form.website}
                        onChange={set("website")}
                    />
                    <Button type="submit" disabled={pending} className="gap-2 self-start">
                        {
                            pending && <Loader2 className="size-4 animate-spin" />
                        }
                        Send message
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
