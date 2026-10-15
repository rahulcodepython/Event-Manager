import { Loader2 } from "lucide-react"

export function FullPageLoader({ label }: { label: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">{label}</span>
            </div>
        </div>
    )
}
