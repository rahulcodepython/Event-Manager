import type { Metadata } from "next"

import { ContactForm } from "../../components/site/contact-form"
import { site } from "../../lib/site"

export const metadata: Metadata = { title: "Contact" }

export default function ContactPage() {
    return (
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 md:grid-cols-2">
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Contact</h1>
                <p className="text-muted-foreground">Send us a message and we will reply by email.</p>
                <div className="mt-4 flex flex-col gap-1 text-sm text-muted-foreground">
                    <span>{site.company}</span>
                    <span>{site.email}</span>
                    <span>{site.address}</span>
                </div>
            </div>
            <ContactForm />
        </div>
    )
}
