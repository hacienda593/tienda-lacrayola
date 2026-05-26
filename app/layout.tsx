import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import NavBarMobile from '@/components/NavBarMobile'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'La Crayola — Librería & Papelería',
  description: 'Útiles escolares, arte, papelería y tecnología. Envíos a domicilio en Quito.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="bg-[#f8f7f4] text-gray-900 antialiased">
        <Header />
        <main className="min-h-screen pb-20 md:pb-6">
          {children}
        </main>
        <Footer />
        <NavBarMobile />
      </body>
    </html>
  )
}
