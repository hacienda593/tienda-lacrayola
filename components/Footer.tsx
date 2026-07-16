import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="hidden md:block bg-gray-900 text-gray-400 mt-16">
      <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-extrabold text-xl">Tienlo</span>
            <span className="text-[10px] text-green-400 font-bold bg-green-950/50 border border-green-800 px-2 py-0.5 rounded-md">
              por La Crayola
            </span>
          </div>
          <p className="text-xs leading-relaxed text-gray-400 mt-2">
            La Crayola evoluciona para darte un mejor servicio. Compra útiles, arte, y además abarrotes, farmacia y más tiendas locales en un solo envío consolidado.
          </p>
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
        © 2026 Tienlo por La Crayola. Todos los derechos reservados.
      </div>
    </footer>
  )
}
