import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'La Crayola — Librería',
  description: 'Útiles escolares, arte, papelería y más',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        <NavBar />
        <main className="min-h-screen pb-20">
          {children}
        </main>
      </body>
    </html>
  )
}
