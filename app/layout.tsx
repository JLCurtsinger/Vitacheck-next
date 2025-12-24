import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { BackToTop } from "@/components/BackToTop"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Vitacheck - Drug & Supplement Interaction Checker",
  description: "See if medications and supplements mix safely",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main className="flex min-h-[calc(100vh-3.5rem)] flex-col">
          {children}
        </main>
        <Footer />
        <BackToTop />
      </body>
    </html>
  )
}

