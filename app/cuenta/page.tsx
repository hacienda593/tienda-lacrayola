'use client'
import Link from 'next/link'
import { User, ShoppingBag } from 'lucide-react'

export default function CuentaPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-4">
      <User size={48} className="text-gray-700 mx-auto" />
      <h1 className="text-lg font-bold">Mi cuenta</h1>
      <p className="text-gray-500 text-sm">Próximamente podrás crear cuenta para ver el historial de tus pedidos.</p>
      <Link href="/productos"
        className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-xl transition">
        <ShoppingBag size={16} /> Ver productos
      </Link>
    </div>
  )
}
