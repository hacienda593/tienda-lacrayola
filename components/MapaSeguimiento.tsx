'use client'
import { useEffect, useRef } from 'react'

export default function MapaSeguimiento({
  riderLat,
  riderLng,
  clienteLat,
  clienteLng
}: {
  riderLat: number
  riderLng: number
  clienteLat: number | null
  clienteLng: number | null
}) {
  const mapRef = useRef<any>(null)
  const LRef = useRef<any>(null)
  const riderMarkerRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    let L: any
    let isMounted = true

    async function init() {
      const leaflet = await import('leaflet')
      L = leaflet.default
      LRef.current = L

      if (!isMounted) return

      if (mapRef.current) {
        mapRef.current.remove()
      }

      // Inicializar mapa centrado en el repartidor
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([riderLat, riderLng], 15)

      mapRef.current = map

      // Mosaico de mapa gratuito estilo voyager de Carto
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map)

      // Iconos personalizados con estilos en línea herméticos
      const motoIcon = L.divIcon({
        className: 'rider-icon',
        html: `<div style="background-color: #10b981; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">🏍️</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      })

      const casaIcon = L.divIcon({
        className: 'home-icon',
        html: `<div style="background-color: #ef4444; width: 30px; height: 30px; border-radius: 50%; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 3px 8px rgba(0,0,0,0.25);">🏠</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })

      // Marcador del repartidor
      riderMarkerRef.current = L.marker([riderLat, riderLng], { icon: motoIcon }).addTo(map)

      // Marcador de la casa del cliente
      if (clienteLat && clienteLng) {
        L.marker([clienteLat, clienteLng], { icon: casaIcon }).addTo(map)
        
        // Ajustar el zoom automático para encuadrar ambos puntos
        const group = new L.LatLngBounds([
          [riderLat, riderLng],
          [clienteLat, clienteLng]
        ])
        map.fitBounds(group, { padding: [50, 50] })
      }
    }

    init()

    return () => {
      isMounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Mover el marcador de la moto suavemente cuando cambian las coordenadas en tiempo real
  useEffect(() => {
    if (riderMarkerRef.current && mapRef.current && LRef.current) {
      const L = LRef.current
      const newPos = new L.LatLng(riderLat, riderLng)
      riderMarkerRef.current.setLatLng(newPos)
      
      // Recentrar el mapa suavemente en la moto si se sale de los límites visibles
      if (!mapRef.current.getBounds().contains(newPos)) {
        mapRef.current.panTo(newPos)
      }
    }
  }, [riderLat, riderLng])

  return (
    <div className="relative w-full h-[350px] rounded-2xl overflow-hidden border border-line shadow-sm z-10">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapContainerRef} className="w-full h-full bg-surface-2" />
    </div>
  )
}
