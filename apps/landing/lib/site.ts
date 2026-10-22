/** Brand copy, and the company details from the root .env (NEXT_PUBLIC_COMPANY_*). */
export const site = {
    name: "IdentityCard",
    tagline: "Registration, ID cards and check-in for events",
    description:
        "Publish a registration form, email every attendee a signed QR ID card, and check people in at the gate with any phone.",
    company: process.env.NEXT_PUBLIC_COMPANY_NAME || "[Your company name]",
    email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "[contact@yourdomain.com]",
    address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "[Registered address]",
}

export const nav = [
    { title: "Features", href: "/#features" },
    { title: "Pricing", href: "/pricing" },
    { title: "FAQ", href: "/#faq" },
    { title: "Contact", href: "/contact" },
]
