import type { Metadata } from "next"

import { LegalPage } from "../../components/site/legal-page"
import { site } from "../../lib/site"

export const metadata: Metadata = { title: "Terms of service" }

export default function TermsPage() {
    return (
        <LegalPage
            title="Terms of service"
            sections={[
                { heading: "The service", body: `${site.name} provides event registration, ID cards and attendance tools to organizers who buy a credit per event.` },
                { heading: "Accounts", body: "[Who can sign up, account responsibilities, acceptable use.]" },
                { heading: "Credits and payment", body: "[What a credit includes, validity period, how payment works.]" },
                { heading: "Event websites", body: "[Rules for uploaded sites and subdomains; content you may not host.]" },
                { heading: "Data and deletion", body: "[Read-only after the credit ends; deletion after the chosen backup period.]" },
                { heading: "Liability", body: "[Limitations of liability and warranties.]" },
                { heading: "Contact and governing law", body: "[Jurisdiction and how to reach you.]" },
            ]}
        />
    )
}
