import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import { Toaster } from "sonner"

import "./globals.css"
import { QueryProvider } from "../components/providers/query-provider"
import { ThemeProvider } from "../components/providers/theme-provider"
import { SiteFooter } from "../components/site/site-footer"
import { SiteHeader } from "../components/site/site-header"
import { site } from "../lib/site"
import { cn } from "../lib/utils"

const montserrat = Montserrat({
    subsets: ["latin"],
    variable: "--font-montserrat",
})

export const metadata: Metadata = {
    title: {
        default: `${site.name}: ${site.tagline}`,
        template: `%s · ${site.name}`,
    },
    description: site.description,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning className={cn("antialiased", montserrat.variable)}>
            <body className="flex min-h-screen flex-col">
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                    <QueryProvider>
                        <SiteHeader />
                        <main className="flex-1">{children}</main>
                        <SiteFooter />
                        <Toaster position="bottom-right" richColors />
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
