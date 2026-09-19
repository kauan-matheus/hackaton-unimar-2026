import type { Metadata } from "next"
import { Geist_Mono, IBM_Plex_Sans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-br"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, plex.variable)}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  title: "Dashboard | Sisfrete",
  description: "Comparativos de frete por cliente e transportadora.",
}
