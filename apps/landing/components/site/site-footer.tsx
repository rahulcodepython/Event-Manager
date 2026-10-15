import Link from "next/link"

import { site } from "../../lib/site"

const legal = [
    { title: "Terms", href: "/terms" },
    { title: "Privacy", href: "/privacy" },
    { title: "Refund policy", href: "/refund-policy" },
    { title: "Contact", href: "/contact" },
]

export function SiteFooter() {
    return (
        <footer className="border-t">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>© {new Date().getFullYear()} {site.company}</span>
                <nav className="flex flex-wrap gap-4">
                    {
                        legal.map((item) => <Link key={item.href} href={item.href} className="hover:text-foreground">
                            {item.title}
                        </Link>)
                    }
                </nav>
            </div>
        </footer>
    )
}
