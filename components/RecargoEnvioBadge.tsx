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
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1"><Truck size={13} /> Envío estándar</span>
        <span>{fmt(1.50)}</span>
      </div>
    )
  }

  const recargo = (nTiendas - 1) * 0.75

  return (
    <div className="bg-green-950/20 border border-green-900/30 rounded-xl p-3 space-y-2.5">
      <div className="flex items-center justify-between text-xs font-semibold text-white">
        <span className="flex items-center gap-1.5 text-green-400">
          <Truck size={14} /> Envío consolidado
        </span>
        <span className="text-green-400">{fmt(costoTotalEnvio)}</span>
      </div>
      <div className="border-t border-gray-800/60 pt-2 space-y-1 text-[10px] text-gray-400">
        <div className="flex justify-between">
          <span>Envío base (1 tienda)</span>
          <span>{fmt(1.50)}</span>
        </div>
        <div className="flex justify-between">
          <span>Recargo por paradas extras ({nTiendas - 1} locales)</span>
          <span className="text-yellow-500">+{fmt(recargo)}</span>
        </div>
      </div>
      <div className="flex items-start gap-1.5 text-[9px] text-gray-500 leading-normal border-t border-gray-800/40 pt-1.5">
        <Info size={11} className="shrink-0 text-gray-400 mt-0.5" />
        <span>
          ¡Ventaja local! Un solo repartidor retira de tus {nTiendas} comercios (a menos de 500m de distancia) y entrega todo junto en casa.
        </span>
      </div>
    </div>
  )
}
