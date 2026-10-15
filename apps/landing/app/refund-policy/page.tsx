import type { Metadata } from "next"

import { LegalPage } from "../../components/site/legal-page"

export const metadata: Metadata = { title: "Refund policy" }

export default function RefundPolicyPage() {
    return (
        <LegalPage
            title="Refund and cancellation policy"
            sections={[
                { heading: "Eligibility", body: "[When a credit can be refunded, e.g. unused within N days.]" },
                { heading: "How to request", body: "[Where to send requests and what to include.]" },
                { heading: "Processing", body: "[Refunds go back to the original payment method via Razorpay within N working days. A refunded credit ends immediately.]" },
                { heading: "Non-refundable", body: "[Cases that are not refunded.]" },
            ]}
        />
    )
}
