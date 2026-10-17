import Link from "next/link"
import { IdCardIcon } from "lucide-react"

import { Button } from "../ui/button"
import { loginUrl } from "../../lib/api"
import { nav, site } from "../../lib/site"

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <IdCardIcon className="size-4" />
                    </span>
                    {site.name}
                </Link>
                <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
                    {
                        nav.map((item) => <Link key={item.href} href={item.href} className="hover:text-foreground">
                            {item.title}
                        </Link>)
                    }
                </nav>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" nativeButton={false} render={<a href={loginUrl} />}>
                        Log in
                    </Button>
                    <Button nativeButton={false} render={<a href={loginUrl} />}>
                        Start free
                    </Button>
                </div>
            </div>
        </header>
    )
}
