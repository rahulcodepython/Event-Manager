import type { Metadata } from "next"

import { LegalPage } from "../../components/site/legal-page"

export const metadata: Metadata = { title: "Privacy policy" }

export default function PrivacyPage() {
    return (
        <LegalPage
            title="Privacy policy"
            sections={[
                { heading: "What we collect", body: "[Organizer account data from Google sign-in; applicant data entered on forms; attendance records; payment references.]" },
                { heading: "How we use it", body: "[Running events, sending ID cards and reminders, billing.]" },
                { heading: "Who we share it with", body: "[Processors such as the email, payment and hosting providers.]" },
                { heading: "Retention", body: "[Event data is deleted after the credit's backup period; billing records kept as required by law.]" },
                { heading: "Your rights", body: "[Access, correction and deletion requests; how to make them.]" },
                { heading: "Cookies", body: "[Session cookies for signed-in organizers only.]" },
            ]}
        />
    )
}
