'use client'
import { X, ShieldCheck, Truck, RotateCcw } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function PromoDrawer({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center p-0 md:p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer" 
      />

      {/* Sheet Container */}
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl border border-line overflow-hidden animate-in slide-in-from-bottom duration-250 z-10 flex flex-col max-h-[85vh] md:max-h-[90vh]">
        
        {/* Drag handle on Mobile */}
        <div className="flex md:hidden justify-center py-2.5 shrink-0">
          <div className="w-12 h-1.5 bg-gray-250 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-5 pb-4 pt-2 md:pt-4 border-b border-line shrink-0 text-left">
          <div>
            <h3 className="font-display font-bold text-ink text-base">Garantías y Envíos La Crayola</h3>
            <p className="text-xs text-ink-soft">Cómo cuidamos tus compras y entregas</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-ink-soft hover:text-ink active:scale-90 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-left">
          
          {/* Item 1: Envíos */}
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
              <Truck size={20} className="stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-ink">🚚 Envíos a todo San Miguel de los Bancos</h4>
              <p className="text-xs text-ink-soft leading-relaxed">
                Tus pedidos se despachan mediante nuestro pool de repartidores verificados de <strong>Reparto La Crayola</strong>.
              </p>
              <ul className="text-[11px] text-ink-soft space-y-1 list-disc pl-4 pt-1">
                <li>Tarifa general super económica de solo $1.50.</li>
                <li>Monitoreo y geolocalización GPS en tiempo real.</li>
                <li>Entregas rápidas directas a tu domicilio o local comercial.</li>
              </ul>
            </div>
          </div>

          {/* Item 2: Respaldo */}
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-2xl bg-pine/10 flex items-center justify-center text-pine shrink-0">
              <ShieldCheck size={20} className="stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-ink">🛡️ Garantía de Compra La Crayola</h4>
              <p className="text-xs text-ink-soft leading-relaxed">
                Cada pedido cuenta con el respaldo directo de nuestro local físico. Si algún producto no coincide con lo ordenado, lo solucionamos de inmediato.
              </p>
              <ul className="text-[11px] text-ink-soft space-y-1 list-disc pl-4 pt-1">
                <li>Garantía de stock verificado por el administrador.</li>
                <li>Atención personalizada directa por WhatsApp.</li>
                <li>Sin cargos ocultos ni sorpresas en tu entrega.</li>
              </ul>
            </div>
          </div>

          {/* Item 3: Reembolsos */}
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
              <RotateCcw size={20} className="stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-ink">🔄 Reembolsos y Cambios Sin Complicaciones</h4>
              <p className="text-xs text-ink-soft leading-relaxed">
                ¿El artículo no era lo que esperabas o vino con fallas? Tienes soporte directo para solicitar un cambio o la devolución de tu dinero.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-line p-4 bg-surface-2/40 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-pine hover:bg-pine-deep text-white font-bold text-sm py-2.5 rounded-xl transition cursor-pointer active:scale-[0.98]"
          >
            Entendido, gracias
          </button>
        </div>

      </div>
    </div>
  )
}
