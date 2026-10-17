import { Loader2 } from "lucide-react"

export function PageLoader() {
    return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
        </div>
    )
}
