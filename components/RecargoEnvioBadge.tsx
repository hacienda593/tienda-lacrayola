'use client'
import { Info, Truck } from 'lucide-react'

interface Props {
  nTiendas: number
  costoTotalEnvio: number
}

function fmt(n: number) { return '$' + n.toFixed(2) }

export default function RecargoEnvioBadge({ nTiendas, costoTotalEnvio }: Props) {
  if (nTiendas <= 1) {
    return (
      <div className="flex items-center justify-between text-xs font-bold text-gray-500 px-1">
        <span className="flex items-center gap-1.5"><Truck size={14} className="text-green-600" /> Envío estándar</span>
        <span>{fmt(1.50)}</span>
      </div>
    )
  }

  const recargo = (nTiendas - 1) * 0.75

  return (
    <div className="bg-green-50/70 border border-green-200 rounded-xl p-3.5 space-y-2.5">
      <div className="flex items-center justify-between text-xs font-black">
        <span className="flex items-center gap-1.5 text-green-800">
          <Truck size={15} /> Envío consolidado
        </span>
        <span className="text-green-700 font-extrabold">{fmt(costoTotalEnvio)}</span>
      </div>
      <div className="border-t border-green-200/50 pt-2 space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Envío base (1 tienda)</span>
          <span className="font-semibold text-gray-700">{fmt(1.50)}</span>
        </div>
        <div className="flex justify-between">
          <span>Recargo por paradas ({nTiendas - 1} locales)</span>
          <span className="text-orange-600 font-bold">+{fmt(recargo)}</span>
        </div>
      </div>
      <div className="flex items-start gap-1.5 text-xs text-gray-500 leading-normal border-t border-green-200/50 pt-2">
        <Info size={13} className="shrink-0 text-gray-400 mt-0.5" />
        <span>
          ¡Ventaja local! Un solo repartidor retira de tus {nTiendas} comercios y entrega todo junto en tu casa.
        </span>
      </div>
    </div>
  )
}
