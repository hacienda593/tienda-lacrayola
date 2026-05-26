import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="hidden md:block bg-gray-900 text-gray-400 mt-16">
      <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🖍️</span>
            <span className="text-white font-bold text-lg">La Crayola</span>
          </div>
          <p className="text-sm leading-relaxed">Librería y papelería con más de 17,000 productos en stock. Útiles escolares, arte, oficina y tecnología.</p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Categorías</h4>
          <div className="space-y-1.5">
            {['Escolar','Arte','Oficina','Tecnologia','Juguetes','Manualidades'].map(c => (
              <Link key={c} href={`/productos?cat=${encodeURIComponent(c)}`}
                className="block text-sm hover:text-green-400 transition">{c}</Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Contacto</h4>
          <div className="space-y-2 text-sm">
            <p>📍 Quito, Ecuador</p>
            <p>📞 WhatsApp: <a href="https://wa.me/593999999999" className="text-green-400 hover:underline">+593 99 999 9999</a></p>
            <p>📧 <a href="mailto:librerialacrayola.ec@gmail.com" className="text-green-400 hover:underline">librerialacrayola.ec@gmail.com</a></p>
            <p className="text-xs text-gray-600 mt-4">Lun–Sáb: 8:00 – 18:00</p>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800 text-center py-4 text-xs text-gray-600">
        © 2026 La Crayola. Todos los derechos reservados.
      </div>
    </footer>
  )
}
