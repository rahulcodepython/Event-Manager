import { site } from "../../lib/site"

/**
 * Layout for legal pages. The text is a placeholder outline, not legal
 * advice: have it written or reviewed before launch.
 */
export function LegalPage({ title, sections }: { title: string, sections: { heading: string, body: string }[] }) {
    return (
        <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                Placeholder text. Replace it with your own reviewed policy before launch.
            </p>
            {
                sections.map((s) => <section key={s.heading} className="flex flex-col gap-2">
                    <h2 className="text-lg font-semibold">{s.heading}</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </section>)
            }
            <p className="text-sm text-muted-foreground">
                Questions: {site.email} · {site.company}, {site.address}
            </p>
        </article>
    )
}
