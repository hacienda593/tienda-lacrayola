'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  X, User, ShoppingBag, Tag, Settings, HelpCircle,
  ChevronRight, Search, Home, Package,
  Palette, BookOpen, Cpu, Gamepad2, Scissors, Pencil, Brush,
  MessageCircle
} from 'lucide-react'

const CATEGORIAS = [
  { label: 'Escolar',      emoji: '📚', slug: 'Escolar' },
  { label: 'Arte',         emoji: '🎨', slug: 'Arte' },
  { label: 'Oficina',      emoji: '🖊️', slug: 'Oficina' },
  { label: 'Tecnología',   emoji: '💻', slug: 'Tecnologia' },
  { label: 'Juguetes',     emoji: '🧸', slug: 'Juguetes' },
  { label: 'Manualidades', emoji: '✂️', slug: 'Manualidades' },
  { label: 'Libros',       emoji: '📖', slug: 'Libros' },
  { label: 'Pintura',      emoji: '🖌️', slug: 'Pintura' },
]

type Tab = 'cuenta' | 'explorar'

interface Props {
  open: boolean
  onClose: () => void
}

export default function MenuDrawer({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('cuenta')
  const [q, setQ] = useState('')
  const router = useRouter()

  function buscar(e: React.FormEvent) {
    e.preventDefault()
    if (q.trim()) {
      router.push(`/productos?q=${encodeURIComponent(q.trim())}`)
      onClose()
    }
  }

  function navegar(href: string) {
    router.push(href)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-[300px] max-w-[85vw] bg-white z-[70] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header del drawer */}
        <div className="bg-green-700 text-white px-4 pt-10 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                🖍️
              </div>
              <div>
                <div className="font-bold text-base leading-tight">La Crayola</div>
                <div className="text-green-200 text-xs">Librería & Papelería</div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-green-800/40 rounded-xl p-1">
            <button
              onClick={() => setTab('cuenta')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'cuenta' ? 'bg-white text-green-700' : 'text-white/80 hover:text-white'}`}
            >
              Mi Cuenta
            </button>
            <button
              onClick={() => setTab('explorar')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'explorar' ? 'bg-white text-green-700' : 'text-white/80 hover:text-white'}`}
            >
              Explorar
            </button>
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* ── PESTAÑA CUENTA ── */}
          {tab === 'cuenta' && (
            <div className="py-2">
              {/* ID de usuario anónimo */}
              <div className="mx-4 my-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <User size={18} className="text-green-700" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Cliente</div>
                    <div className="text-xs text-gray-400">Sin sesión activa</div>
                  </div>
                </div>
              </div>

              <ItemMenu icon={<ShoppingBag size={18} />} label="Mis pedidos" sub="Ver historial de órdenes" onClick={() => navegar('/pedidos')} />
              <ItemMenu icon={<Tag size={18} />} label="Cupones y códigos" sub="Descuentos disponibles" onClick={() => navegar('/cupones')} badge="Próx." />
              <Divider />
              <ItemMenu icon={<Settings size={18} />} label="Configuración" sub="Preferencias de la app" onClick={() => navegar('/configuracion')} badge="Próx." />
              <ItemMenu icon={<HelpCircle size={18} />} label="Ayuda y soporte" sub="WhatsApp · Preguntas frecuentes" onClick={() => navegar('/ayuda')} />
              <ItemMenu
                icon={<MessageCircle size={18} className="text-green-600" />}
                label="Contactar por WhatsApp"
                sub="+593 999 999 999"
                onClick={() => { window.open('https://wa.me/593999999999', '_blank'); onClose() }}
              />
            </div>
          )}

          {/* ── PESTAÑA EXPLORAR ── */}
          {tab === 'explorar' && (
            <div className="py-3 px-4 space-y-4">
              {/* Buscador */}
              <form onSubmit={buscar}>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={q} onChange={e => setQ(e.target.value)}
                    placeholder="Buscar productos..."
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition"
                    autoFocus
                  />
                </div>
              </form>

              {/* Accesos rápidos */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Acceso rápido</p>
                <div className="grid grid-cols-2 gap-2">
                  <QuickBtn emoji="🏠" label="Inicio" onClick={() => navegar('/')} />
                  <QuickBtn emoji="🛍️" label="Todo" onClick={() => navegar('/productos')} />
                  <QuickBtn emoji="⭐" label="Destacados" onClick={() => navegar('/productos?destacado=true')} />
                  <QuickBtn emoji="🏷️" label="Ofertas" onClick={() => navegar('/productos?oferta=true')} />
                </div>
              </div>

              {/* Categorías */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Categorías</p>
                <div className="space-y-1">
                  {CATEGORIAS.map(({ label, emoji, slug }) => (
                    <button
                      key={slug}
                      onClick={() => navegar(`/productos?cat=${encodeURIComponent(slug)}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-green-50 transition text-left group"
                    >
                      <span className="text-xl w-7 text-center">{emoji}</span>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 flex-1">{label}</span>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-green-500" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer del drawer */}
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-[10px] text-gray-400 text-center">La Crayola · V 1.0 · Librería & Papelería</p>
        </div>
      </aside>
    </>
  )
}

function ItemMenu({ icon, label, sub, onClick, badge }: {
  icon: React.ReactNode
  label: string
  sub?: string
  onClick: () => void
  badge?: string
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left">
      <span className="text-green-600 w-5 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800">{label}</div>
        {sub && <div className="text-xs text-gray-400 truncate">{sub}</div>}
      </div>
      {badge
        ? <span className="text-[10px] bg-orange-100 text-orange-600 font-semibold px-2 py-0.5 rounded-full">{badge}</span>
        : <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
      }
    </button>
  )
}

function QuickBtn({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-200 rounded-xl transition text-left w-full group"
    >
      <span className="text-lg">{emoji}</span>
      <span className="text-xs font-medium text-gray-700 group-hover:text-green-700">{label}</span>
    </button>
  )
}

function Divider() {
  return <div className="mx-4 my-1 border-t border-gray-100" />
}
