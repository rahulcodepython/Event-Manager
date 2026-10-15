import {
    BarChart3Icon,
    FileTextIcon,
    GlobeIcon,
    IdCardIcon,
    LayersIcon,
    MailIcon,
    ScanLineIcon,
    ShieldCheckIcon,
    UsersIcon,
} from "lucide-react"

/** Placeholder marketing copy: replace before launch. */

export const steps = [
    { title: "Build your form", text: "Pick a template or start from scratch, set a closing date and share one link." },
    { title: "Send ID cards", text: "When applications close, every applicant gets a PDF ID card with a signed QR code." },
    { title: "Check people in", text: "Pair any phone as a scanner and record entry and exit at the gate, day by day." },
]

export const features = [
    { icon: FileTextIcon, title: "Registration forms", text: "Custom fields, capacity limits and a public link or QR to share." },
    { icon: UsersIcon, title: "Applicant management", text: "Add people by hand or upload a spreadsheet; search and filter everyone." },
    { icon: IdCardIcon, title: "ID cards by email", text: "One-page PDF cards sent automatically on the date you choose." },
    { icon: ShieldCheckIcon, title: "Signed QR codes", text: "Every QR is signed by the server, so cards cannot be forged or edited." },
    { icon: ScanLineIcon, title: "Phone scanners", text: "Pair devices with a PIN; scan entry and exit without extra hardware." },
    { icon: LayersIcon, title: "Sub-events", text: "Workshops and sessions with their own days, capacity and attendance." },
    { icon: BarChart3Icon, title: "Attendance analysis", text: "Turnout by day, punctuality, and who attended or missed." },
    { icon: GlobeIcon, title: "Event website", text: "Upload your own site at a custom subdomain with a built-in register link." },
    { icon: MailIcon, title: "Reminders", text: "Email reminders before your event goes read-only and before data deletion." },
]

export const faqs = [
    {
        q: "How does pricing work?",
        a: "You buy a credit for each event and choose only what it needs: number of applicants, how long the credit lasts, branding, sub-events, data backup and an event website. The pricing page shows the exact total before you pay.",
    },
    {
        q: "Is there a free trial?",
        a: "Yes. After you sign up you can claim one free trial credit to test everything with a small event. Trial events are for testing only.",
    },
    {
        q: "Do attendees need an account?",
        a: "No. Attendees fill in your public form and receive their ID card by email.",
    },
    {
        q: "What do I need to scan QR codes?",
        a: "Any phone or tablet with a camera and a browser. Pair it once with a PIN and assign it to your event.",
    },
    {
        q: "What happens to my data after the event?",
        a: "Your event becomes read-only when its credit ends and its data is deleted after the backup period you chose. We email you before both.",
    },
    {
        q: "Which payment methods are accepted?",
        a: "Payments go through Razorpay: UPI, cards, net banking and wallets.",
    },
]
