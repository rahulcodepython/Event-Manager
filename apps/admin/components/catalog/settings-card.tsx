"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { toPaise, toRupees } from "../../lib/money"
import { useUpdateSettingsMutation } from "../../query-hooks/catalog.api"
import type { Settings } from "../../schema/catalog.types"

function toForm(s: Settings) {
    return {
        base_fee: String(toRupees(s.base_fee)),
        tax_name: s.tax_name,
        tax_rate: String(s.tax_rate_bp / 100),
        trial_max_event_days: String(s.trial_max_event_days),
    }
}

export function SettingsCard({ settings }: { settings: Settings }) {
    const [form, setForm] = React.useState(() => toForm(settings))
    const save = useUpdateSettingsMutation()

    const set = (key: keyof ReturnType<typeof toForm>) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value }))

    const submit = () => {
        save.mutate({
            base_fee: toPaise(Number(form.base_fee)),
            tax_name: form.tax_name,
            tax_rate_bp: Math.round(Number(form.tax_rate) * 100),
            trial_max_event_days: Number(form.trial_max_event_days),
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Pricing settings</CardTitle>
                <CardDescription>Apply to new purchases. Credits already bought keep their prices.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="base-fee">Base fee (₹)</Label>
                    <Input id="base-fee" type="number" min="0" step="0.01" value={form.base_fee} onChange={set("base_fee")} />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="tax-name">Tax name</Label>
                    <Input id="tax-name" value={form.tax_name} onChange={set("tax_name")} />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="tax-rate">Tax rate (%)</Label>
                    <Input id="tax-rate" type="number" min="0" max="100" step="0.01" value={form.tax_rate} onChange={set("tax_rate")} />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="trial-days">Trial event max length (days)</Label>
                    <Input id="trial-days" type="number" min="1" value={form.trial_max_event_days} onChange={set("trial_max_event_days")} />
                </div>
            </CardContent>
            <CardFooter className="justify-end">
                <Button onClick={submit} disabled={save.isPending} className="gap-2">
                    {
                        save.isPending && <Loader2 className="size-4 animate-spin" />
                    }
                    Save settings
                </Button>
            </CardFooter>
        </Card>
    )
}
