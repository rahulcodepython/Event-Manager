"use client"

import * as React from "react"
import { Loader2, UploadIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { useUploadSiteMutation } from "../../query-hooks/sites.api"

const MAX_BYTES = 10 * 1024 * 1024

/** Upload a zip that replaces the whole site. */
export function SiteUpload({ eventId, disabled }: { eventId: string, disabled: boolean }) {
    const input = React.useRef<HTMLInputElement>(null)
    const [error, setError] = React.useState<string | null>(null)
    const upload = useUploadSiteMutation(eventId)

    const onFile = (file: File | undefined) => {
        if (!file) return
        setError(null)
        if (!file.name.toLowerCase().endsWith(".zip")) {
            setError("Choose a .zip file.")
            return
        }
        if (file.size > MAX_BYTES) {
            setError("The zip must be 10 MB or smaller.")
            return
        }
        upload.mutate(file)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Upload site</CardTitle>
                <CardDescription>
                    A zip with <code>index.html</code> at the top (or inside one folder). HTML, CSS, JavaScript, images, fonts and JSON; up to 10 MB and 300 files.
                    Each upload replaces the whole site.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <input
                    ref={input}
                    type="file"
                    accept=".zip,application/zip"
                    className="hidden"
                    onChange={(e) => {
                        onFile(e.target.files?.[0])
                        e.target.value = ""
                    }}
                />
                <button
                    type="button"
                    disabled={disabled || upload.isPending}
                    onClick={() => input.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault()
                        if (!disabled) onFile(e.dataTransfer.files?.[0])
                    }}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {
                        upload.isPending ? <Loader2 className="size-6 animate-spin text-primary" /> : <UploadIcon className="size-6" />
                    }
                    <span>{upload.isPending ? "Uploading..." : disabled ? "Claim a subdomain first" : "Drop a zip here or click to choose"}</span>
                </button>
                {
                    error && <p className="text-xs text-destructive">{error}</p>
                }
                <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                    Link to <code className="font-mono">/register</code> for the registration form, or
                    {" "}<code className="font-mono">/register/&lt;sub-event id&gt;</code> for a sub-event&apos;s link.
                    A <code className="font-mono">404.html</code> in the zip is shown for missing pages.
                </div>
            </CardContent>
        </Card>
    )
}
