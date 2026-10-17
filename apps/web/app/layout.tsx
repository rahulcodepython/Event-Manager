import { Montserrat } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"
import { QueryProvider } from "../components/providers/query-provider"
import { ThemeProvider } from "../components/providers/theme-provider"
import { cn } from "../lib/utils"

const montserrat = Montserrat({
    subsets: ["latin"],
    variable: "--font-montserrat",
})

export default function RootLayout({ children }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning className={cn(
            "antialiased",
            montserrat.variable
        )}>
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <QueryProvider>
                        {children}
                        <Toaster position="bottom-right" richColors />
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
