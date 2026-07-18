'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Zap, ZapOff } from 'lucide-react'

interface BarcodeScannerProps {
  onDetected: (code: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [flashOn, setFlashOn] = useState(false)
  const detectedRef = useRef(false)

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const handleDetected = useCallback((code: string) => {
    if (detectedRef.current) return
    detectedRef.current = true
    if (navigator.vibrate) navigator.vibrate([60, 30, 60])
    stopCamera()
    onDetected(code)
  }, [onDetected, stopCamera])

  useEffect(() => {
    let cancelled = false

    async function startScanner() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setScanning(true)

        if ('BarcodeDetector' in window) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'itf', 'data_matrix']
          })
          const detect = async () => {
            if (cancelled || !videoRef.current || detectedRef.current) return
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) { handleDetected(barcodes[0].rawValue); return }
            } catch { /* continuar */ }
            animFrameRef.current = requestAnimationFrame(detect)
          }
          animFrameRef.current = requestAnimationFrame(detect)
        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          if (cancelled || !videoRef.current) return
          const codeReader = new BrowserMultiFormatReader()
          codeReader.decodeFromVideoElement(videoRef.current, (result) => {
            if (result && !detectedRef.current) handleDetected(result.getText())
          })
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const name = (e as { name?: string }).name
          setError(
            name === 'NotAllowedError'
              ? 'Permiso de cámara denegado. Habilítalo en la configuración del navegador.'
              : 'No se pudo acceder a la cámara del dispositivo.'
          )
        }
      }
    }

    startScanner()
    return () => { cancelled = true; stopCamera() }
  }, [handleDetected, stopCamera])

  async function toggleFlash() {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !flashOn } as MediaTrackConstraintSet] })
      setFlashOn(f => !f)
    } catch { /* linterna no soportada en este dispositivo */ }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/90 shrink-0">
        <button
          onClick={() => { stopCamera(); onClose() }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white border-none cursor-pointer active:scale-90 transition"
        >
          <X size={20} />
        </button>
        <span className="text-white text-[13px] font-extrabold tracking-wide">Escanear código de barras</span>
        <button
          onClick={toggleFlash}
          className={`w-10 h-10 flex items-center justify-center rounded-full border-none cursor-pointer active:scale-90 transition ${flashOn ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white'}`}
        >
          {flashOn ? <ZapOff size={18} /> : <Zap size={18} />}
        </button>
      </div>

      {/* Visor */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline muted autoPlay
        />

        {scanning && (
          <>
            {/* Overlay oscuro alrededor del marco */}
            <div className="absolute inset-0 bg-black/55 [mask-image:radial-gradient(ellipse_260px_180px_at_50%_45%,transparent_95%,black)]" />

            {/* Marco de escaneo */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: '10%' }}>
              <div className="relative w-[260px] h-[160px]">
                {/* Línea animada de escaneo */}
                <div className="absolute left-3 right-3 h-[2px] bg-green-400 shadow-[0_0_10px_3px_rgba(74,222,128,0.8)] scanner-line" />
                {/* Esquinas */}
                {[
                  'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg',
                  'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg',
                  'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg',
                  'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg',
                ].map((cls, i) => (
                  <span key={i} className={`absolute w-7 h-7 border-green-400 ${cls}`} />
                ))}
              </div>
            </div>

            <p className="absolute bottom-20 left-0 right-0 text-center text-white/70 text-[12px] font-medium px-8">
              Apunta la cámara al código de barras del producto
            </p>
          </>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center gap-4">
            <div className="text-4xl">📷</div>
            <p className="text-white text-sm font-medium leading-relaxed">{error}</p>
            <button
              onClick={() => { stopCamera(); onClose() }}
              className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold border-none cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 pb-8 pt-3 text-center bg-black/90">
        <p className="text-white/40 text-[11px]">Detección automática · EAN-13 · UPC · QR · Code128</p>
      </div>

      <style jsx>{`
        @keyframes scanLine {
          0%   { top: 6px; }
          50%  { top: calc(100% - 6px); }
          100% { top: 6px; }
        }
        .scanner-line { animation: scanLine 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

