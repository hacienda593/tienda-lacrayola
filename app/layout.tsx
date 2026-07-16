import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import NavBarMobile from '@/components/NavBarMobile'
import Footer from '@/components/Footer'
import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Tienlo — Lo quieres, Tenlo (por La Crayola)',
  description: 'Compra útiles escolares, tecnología, abarrotes, farmacia y más en tus tiendas favoritas de Los Bancos. ¡Pagas un solo envío consolidado!',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="bg-[#f8f7f4] text-gray-900 antialiased">
        <AuthProvider>
          <Header />
          <main className="min-h-screen pb-20 md:pb-6 w-full max-w-full overflow-x-hidden">
            {children}
          </main>
          <Footer />
          <NavBarMobile />
        </AuthProvider>
      </body>
    </html>
  )
}
