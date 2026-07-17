'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Camera, Zap } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

interface BarcodeScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (code: string) => void
}

export default function BarcodeScannerModal({ isOpen, onClose, onScanSuccess }: BarcodeScannerModalProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const [torchActive, setTorchActive] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)

  // Sonido de pitido sintético sin dependencias de audio externas
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.type = 'sine'
      oscillator.frequency.value = 1200 // Pitido alto de 1.2kHz
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime)
      oscillator.start()
      setTimeout(() => oscillator.stop(), 100) // Duración 100ms
    } catch (err) {
      console.warn("AudioContext beep failed:", err)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true

    // Retrasar ligeramente el inicio del escáner para permitir que el DOM se monte
    const timer = setTimeout(() => {
      const elementId = "barcode-scanner-reader"
      const container = document.getElementById(elementId)
      if (!container || !isMounted) return

      const scanner = new Html5Qrcode(elementId)
      html5QrCodeRef.current = scanner

      const config = {
        fps: 15,
        // Dimensiones rectangulares ideales para códigos de barras de productos (1D)
        qrbox: (width: number, height: number) => {
          const scanWidth = Math.min(width * 0.85, 320)
          const scanHeight = Math.min(height * 0.35, 160)
          return { width: scanWidth, height: scanHeight }
        },
        aspectRatio: 1.0
      }

      scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          playBeep()
          if (navigator.vibrate) {
            navigator.vibrate(80)
          }
          onScanSuccess(decodedText)
        },
        () => {
          // Ignorar errores repetitivos de escaneo (cuadros fallidos)
        }
      )
      .then(() => {
        if (!isMounted) return
        setHasCameraPermission(true)
        
        // Verificar si la linterna (torch) está disponible
        try {
          const track = (scanner as any).getRunningTrack()
          if (track && typeof track.getCapabilities === 'function') {
            const capabilities = track.getCapabilities() as any
            if (capabilities && capabilities.torch) {
              setHasTorch(true)
            }
          }
        } catch (e) {
          console.warn("Error checking camera capabilities:", e)
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.error("Camera access error:", err)
        setHasCameraPermission(false)
        setErrorMsg("No se pudo acceder a la cámara. Por favor verifica los permisos de cámara de tu navegador.")
      })
    }, 350)

    return () => {
      isMounted = false
      clearTimeout(timer)
      const scanner = html5QrCodeRef.current
      if (scanner && scanner.isScanning) {
        scanner.stop()
          .then(() => {
            html5QrCodeRef.current = null
          })
          .catch(err => console.error("Error stopping scanner:", err))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const toggleTorch = async () => {
    const scanner = html5QrCodeRef.current
    if (scanner && scanner.isScanning && hasTorch) {
      try {
        const nextState = !torchActive
        const track = (scanner as any).getRunningTrack()
        if (track) {
          await track.applyConstraints({
            advanced: [{ torch: nextState }] as any
          })
          setTorchActive(nextState)
        }
      } catch (err) {
        console.error("Error toggling flash:", err)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col justify-between select-none animate-fade-in font-sans">
      
      {/* Cabecera superior */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/60 to-transparent shrink-0 z-10">
        <div className="flex items-center gap-2 text-white">
          <Camera size={18} className="text-green-400 animate-pulse" />
          <span className="text-sm font-bold tracking-wide">Escanear Producto</span>
        </div>
        <button 
          onClick={onClose} 
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition border-none cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Contenedor del visor de cámara */}
      <div className="flex-1 w-full flex items-center justify-center relative bg-black overflow-hidden">
        
        {/* Lector de html5-qrcode */}
        <div id="barcode-scanner-reader" className="w-full h-full object-cover"></div>

        {/* Zona guía visual */}
        {hasCameraPermission && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            {/* Máscara de escaneo */}
            <div className="w-[280px] h-[140px] border-2 border-dashed border-white/60 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden">
              {/* Esquinas decorativas */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500 rounded-tl-md"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500 rounded-tr-md"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500 rounded-bl-md"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500 rounded-br-md"></div>
              
              {/* Línea láser de animación */}
              <div className="absolute inset-x-0 h-[2px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-laser-scan"></div>
            </div>

            <p className="text-white/80 text-xs font-semibold mt-4 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-center max-w-xs">
              Apunta al código de barras del producto
            </p>
          </div>
        )}

        {/* Estado de carga / errores */}
        {hasCameraPermission === null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black z-20">
            <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-xs">Inicializando cámara...</p>
          </div>
        )}

        {hasCameraPermission === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4 bg-black z-20">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 text-2xl">⚠️</div>
            <p className="text-gray-300 text-xs leading-relaxed max-w-xs">{errorMsg}</p>
            <button 
              onClick={onClose} 
              className="px-6 py-2.5 bg-white text-black text-xs font-bold rounded-xl active:scale-95 transition cursor-pointer border-none"
            >
              Cerrar visor
            </button>
          </div>
        )}
      </div>

      {/* Pie inferior con linterna */}
      <div className="px-6 py-8 bg-gradient-to-t from-black/80 to-transparent shrink-0 flex flex-col items-center gap-2 z-10">
        {hasTorch && (
          <button
            onClick={toggleTorch}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition border-none cursor-pointer ${
              torchActive 
                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' 
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Encender Linterna"
          >
            <Zap size={20} className={torchActive ? 'fill-black' : ''} />
          </button>
        )}
        <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mt-1">
          Tienlo · Lector de barras
        </p>
      </div>

      <style jsx global>{`
        @keyframes laser-scan {
          0% { transform: translateY(-70px); }
          50% { transform: translateY(70px); }
          100% { transform: translateY(-70px); }
        }
        .animate-laser-scan {
          animation: laser-scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
