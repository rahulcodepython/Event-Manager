import Link from "next/link"
import { ArrowRightIcon, CheckIcon } from "lucide-react"

import { ContactForm } from "../components/site/contact-form"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { loginUrl } from "../lib/api"
import { faqs, features, steps } from "../lib/content"
import { site } from "../lib/site"

export default function HomePage() {
    return (
        <>
            <section className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
                <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">Forms · ID cards · Check-in</span>
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">{site.tagline}</h1>
                <p className="max-w-2xl text-lg text-muted-foreground">{site.description}</p>
                <div className="flex flex-wrap justify-center gap-3">
                    <Button size="lg" className="gap-2" nativeButton={false} render={<a href={loginUrl} />}>
                        Start with a free trial
                        <ArrowRightIcon className="size-4" />
                    </Button>
                    <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/pricing" />}>
                        See pricing
                    </Button>
                </div>
                <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    {
                        ["No credit card for the trial", "Sign in with Google", "Pay per event"].map((t) => <li key={t} className="flex items-center gap-1.5">
                            <CheckIcon className="size-4 text-primary" />
                            {t}
                        </li>)
                    }
                </ul>
            </section>

            <section className="border-y bg-muted/30">
                <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-3">
                    {
                        steps.map((s, i) => <div key={s.title} className="flex flex-col gap-2">
                            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                                {i + 1}
                            </span>
                            <h3 className="font-semibold">{s.title}</h3>
                            <p className="text-sm text-muted-foreground">{s.text}</p>
                        </div>)
                    }
                </div>
            </section>

            <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
                <div className="mb-10 flex flex-col gap-2 text-center">
                    <h2 className="text-3xl font-bold tracking-tight">Everything for event entry</h2>
                    <p className="text-muted-foreground">From the first registration to the last scan.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {
                        features.map((f) => <Card key={f.title}>
                            <CardHeader className="flex flex-row items-center gap-3">
                                <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                                    <f.icon className="size-4" />
                                </span>
                                <CardTitle className="text-base">{f.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">{f.text}</CardContent>
                        </Card>)
                    }
                </div>
            </section>

            <section className="border-y bg-muted/30">
                <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-16 text-center">
                    <h2 className="text-3xl font-bold tracking-tight">Pay only for what each event needs</h2>
                    <p className="max-w-2xl text-muted-foreground">
                        Choose the number of applicants, duration and extras. See the exact price, tax included, before you pay.
                    </p>
                    <Button size="lg" nativeButton={false} render={<Link href="/pricing" />}>
                        Calculate your price
                    </Button>
                </div>
            </section>

            <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20">
                <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">Frequently asked questions</h2>
                <div className="flex flex-col divide-y rounded-xl border">
                    {
                        faqs.map((f) => <details key={f.q} className="group p-4 [&_summary::-webkit-details-marker]:hidden">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                                {f.q}
                                <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                            </summary>
                            <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
                        </details>)
                    }
                </div>
            </section>

            <section id="contact" className="border-t bg-muted/30">
                <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2">
                    <div className="flex flex-col gap-3">
                        <h2 className="text-3xl font-bold tracking-tight">Talk to us</h2>
                        <p className="text-muted-foreground">
                            Questions about a large event, pricing or a custom need? Send a message and we will reply by email.
                        </p>
                    </div>
                    <ContactForm />
                </div>
            </section>
        </>
    )
}
