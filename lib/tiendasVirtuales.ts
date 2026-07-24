import { OlTienda } from './types'

// Servicios propios que se muestran junto a las tiendas aliadas reales (misma
// tarjeta, mismo lenguaje visual) para que el cliente los descubra en el
// mismo lugar donde ya está buscando "qué tiendas hay". Un solo lugar para
// esta lista -- se usa en /tiendas y en el menú (Explorar) para que no se
// desincronicen dos copias.
export const TIENDAS_VIRTUALES: OlTienda[] = [
  {
    id: 'frecuentes-servicios',
    nombre: 'Productos Frecuentes',
    descripcion: 'Tus productos más comprados y favoritos para agregarlos al carrito al instante.',
    categoria: 'otros',
    logo_url: null,
    activa: true,
    orden: 97,
    direccion: 'Tu Historial'
  },
  {
    id: 'impresion-servicios',
    nombre: 'Centro de Impresiones',
    descripcion: 'Sube tus documentos, PDF y tareas escolares para entrega a domicilio express.',
    categoria: 'libreria',
    logo_url: null,
    activa: true,
    orden: 98,
    direccion: 'Servicio Express'
  },
  {
    id: 'recargas-servicios',
    nombre: 'Recargas y Servicios Básicos',
    descripcion: 'Recarga combos Claro/Movistar/Tuenti y paga tus planillas de Luz, Agua e Internet.',
    categoria: 'tecnologia',
    logo_url: null,
    activa: true,
    orden: 99,
    direccion: 'Servicio en Línea (WhatsApp)'
  }
]

// Ruta a la que navega cada servicio virtual (no son tiendas reales con
// catálogo propio, así que no siguen el patrón /tiendas/[id]).
export function hrefServicioVirtual(id: string): string | null {
  if (id === 'recargas-servicios') return '/recargas'
  if (id === 'impresion-servicios') return '/impresion'
  if (id === 'frecuentes-servicios') return '/productos?frecuentes=true'
  return null
}
