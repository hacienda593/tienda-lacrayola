'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Smartphone, Wifi, CheckCircle, Phone, ArrowRight, ArrowLeft, 
  History, DollarSign, AlertCircle, Trash2, ShieldCheck 
} from 'lucide-react'

// Definiciones de operadores
interface Paquete {
  id: string
  precio: number
  vigencia: string
  descripcion: string
}

interface Operador {
  id: string
  nombre: string
  color: string
  bg: string
  gradient: string
  emoji: string
  paquetes: Paquete[]
}

const OPERADORES: Operador[] = [
  {
    id: 'claro',
    nombre: 'Claro',
    emoji: '🔴',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    gradient: 'from-red-500 to-red-700',
    paquetes: [
      { id: 'c1', precio: 1.05, vigencia: '1 día', descripcion: '512 MB + 1 GB en redes (WhatsApp, Facebook, X) + Llamadas ilimitadas a Claro + 100 SMS a Claro' },
      { id: 'c2', precio: 1.50, vigencia: '1 día', descripcion: '1 GB + 1 GB en apps + Redes ilimitadas + Llamadas ilim. a Claro + 10 min a todos + 100 SMS a Claro' },
      { id: 'c3', precio: 2.05, vigencia: '2 días', descripcion: '1 GB + 1 GB en video + 1 GB en redes + Llamadas ilim. a Claro + 20 min a otras + 200 SMS a Claro' },
      { id: 'c4', precio: 2.50, vigencia: '3 días', descripcion: '2 GB + 3 GB en video + 1 GB en redes + Llamadas ilim. a Claro + 20 min a otras + 200 SMS a Claro' },
      { id: 'c5', precio: 3.10, vigencia: '3 días', descripcion: '4 GB + 3 GB en video + 2 GB en redes + Llamadas ilim. a Claro + 30 min a todos + 300 SMS a Claro' },
      { id: 'c6', precio: 3.50, vigencia: '7 días', descripcion: '4 GB + 5 GB en video + 2 GB en redes + Llamadas ilim. a Claro + 30 min a todos + 300 SMS a Claro' },
      { id: 'c7', precio: 4.00, vigencia: '10 días', descripcion: '5 GB + 5 GB en video + 1 GB en redes + Llamadas ilim. a Claro + 40 min a todos' },
      { id: 'c8', precio: 5.15, vigencia: '15 días', descripcion: '3 GB + 5 GB en video + 4 GB en redes + Llamadas ilim. a Claro + 50 min a todos + Suscripción Claro Video' },
      { id: 'c9', precio: 5.50, vigencia: '15 días', descripcion: '5 GB + 5 GB en video + 4 GB en redes + Llamadas ilim. a Claro + 50 min a todos + Suscripción Claro Video' },
      { id: 'c10', precio: 6.00, vigencia: '30 días', descripcion: '4 GB + 2 GB en video + Llamadas ilim. a Claro + 50 min a todos + 300 SMS + 2 GB gratis + Claro Video' },
      { id: 'c11', precio: 8.00, vigencia: '25 días', descripcion: '7 GB + 5 GB en video + 4 GB gratis + Llamadas ilim. a Claro + 80 min a todos + Claro Video' },
      { id: 'c12', precio: 10.50, vigencia: '30 días', descripcion: '10 GB + 6 GB en video + 5 GB gratis + Llamadas ilim. a Claro + 100 min a todos + Claro Video' },
      { id: 'c13', precio: 12.50, vigencia: '30 días', descripcion: '13 GB + 6 GB en video + 5 GB gratis + Llamadas ilim. a Claro + 120 min a todos + Claro Video' },
      { id: 'c14', precio: 15.50, vigencia: '30 días', descripcion: '15 GB + 5 GB en video + 2 GB en redes + 5 GB gratis + Llamadas ilim. a Claro + 150 min a todos + Claro Video' },
      { id: 'c15', precio: 20.50, vigencia: '30 días', descripcion: '20 GB + 5 GB en video + 2 GB en redes + 5 GB gratis + Llamadas ilim. a Claro + 150 min a todos + Claro Video' },
      { id: 'c16', precio: 2.05, vigencia: '4 horas', descripcion: 'Paquete de Gigas: Horas Ilimitadas' }
    ]
  },
  {
    id: 'movistar',
    nombre: 'Movistar',
    emoji: '🟢',
    color: 'text-blue-500',
    bg: 'bg-sky-50 border-sky-200',
    gradient: 'from-sky-400 to-blue-600',
    paquetes: [
      { id: 'm1', precio: 1.05, vigencia: '1 día', descripcion: '1 GB total (512 MB libres) + WhatsApp gratis + 10 min a otras operadoras + 10 SMS' },
      { id: 'm2', precio: 3.00, vigencia: '2 días', descripcion: 'Bono de llamadas y minutos ilimitados' },
      { id: 'm3', precio: 3.00, vigencia: '7 días', descripcion: '5 GB total (2 GB libres) + WhatsApp gratis + 5 GB Spotify + 30 min a otras + 10 SMS' },
      { id: 'm4', precio: 5.00, vigencia: '15 días', descripcion: '6 GB total (3 GB libres) + WhatsApp gratis + 5 GB Spotify + 70 min a otras + 10 SMS' },
      { id: 'm5', precio: 7.00, vigencia: '20 días', descripcion: '8 GB total (4 GB libres) + WhatsApp gratis + 5 GB Spotify + 80 min a otras + 10 SMS' },
      { id: 'm6', precio: 8.00, vigencia: '30 días', descripcion: '8 GB total (4 GB libres) + WhatsApp gratis + 10 GB Spotify + 70 min a otras + 10 SMS' },
      { id: 'm7', precio: 9.00, vigencia: '30 días', descripcion: '10 GB total (4 GB libres) + WhatsApp gratis + 10 GB Spotify + 100 min a otras + 10 SMS' },
      { id: 'm8', precio: 10.25, vigencia: '30 días', descripcion: '14 GB total (10 GB libres) + WhatsApp gratis + 120 min a otras + 10 min LDI + 50 SMS' },
      { id: 'm9', precio: 15.50, vigencia: '30 días', descripcion: '19 GB total (15 GB libres) + WhatsApp gratis + 10 GB Spotify + 150 min a otras + 20 min LDI + 50 SMS' }
    ]
  },
  {
    id: 'tuenti',
    nombre: 'Tuenti',
    emoji: '💖',
    color: 'text-pink-600',
    bg: 'bg-pink-50 border-pink-200',
    gradient: 'from-pink-500 to-rose-600',
    paquetes: [
      { id: 't1', precio: 1.00, vigencia: '1 día', descripcion: '1 GB + 10 min + Llamadas ilimitadas entre Tuentis + 50 SMS + Gratis Spotify/WhatsApp' },
      { id: 't2', precio: 3.00, vigencia: '7 días', descripcion: '5 GB + 30 min + Llamadas ilimitadas entre Tuentis + 50 SMS + Gratis Spotify/WhatsApp' },
      { id: 't3', precio: 5.00, vigencia: '15 días', descripcion: '6 GB + 70 min + Llamadas ilimitadas entre Tuentis + 50 SMS + Gratis Spotify/WhatsApp' },
      { id: 't4', precio: 8.00, vigencia: '30 días', descripcion: '8 GB + 80 min + Llamadas ilim. Tuentis + 50 SMS + Gratis Spotify/WA + 15 min LDI + 2 GB TikTok' },
      { id: 't5', precio: 10.00, vigencia: '30 días', descripcion: '12 GB + 100 min + Llamadas ilim. Tuentis + 50 SMS + Gratis Spotify/WA + 25 min LDI + 2 GB TikTok' },
      { id: 't6', precio: 15.00, vigencia: '30 días', descripcion: '17 GB + 150 min + Llamadas ilim. Tuentis + 50 SMS + Gratis Spotify/WA + 40 min LDI + 2 GB TikTok' },
      { id: 't7', precio: 25.00, vigencia: '30 días', descripcion: '25 GB + Minutos ilimitados + Llamadas ilim. Tuentis + 50 SMS + Gratis Spotify/WA + 60 min LDI + 2 GB TikTok' }
    ]
  },
  {
    id: 'cnt',
    nombre: 'CNT',
    emoji: '🔵',
    color: 'text-sky-600',
    bg: 'bg-sky-50 border-sky-100',
    gradient: 'from-sky-400 to-sky-600',
    paquetes: [
      { id: 'cn1', precio: 1.00, vigencia: '1 día', descripcion: '1 GB en total + 15 min a otras operadoras + Minutos ilimitados a CNT + 50 SMS' },
      { id: 'cn2', precio: 1.00, vigencia: '1 día', descripcion: '1 GB específico para una app (a elegir entre: Instagram, Spotify, TikTok, Waze, Netflix o YouTube)' },
      { id: 'cn3', precio: 2.00, vigencia: '3 días', descripcion: '2 GB en total + 25 min a otras operadoras + Minutos ilimitados a CNT + 50 SMS' },
      { id: 'cn4', precio: 3.00, vigencia: '7 días', descripcion: '4 GB en total + 35 min a todas las operadoras + Minutos ilimitados a CNT + 50 SMS + CNT Play' },
      { id: 'cn5', precio: 5.00, vigencia: '5 días', descripcion: '5 GB específicos para Apps de teletrabajo (Zoom, Teams, Webex)' },
      { id: 'cn6', precio: 5.00, vigencia: '30 días', descripcion: '5 GB en total + 50 min a otras + Min. ilim. CNT + 30 min internacionales + 50 SMS + CNT Play' },
      { id: 'cn7', precio: 6.00, vigencia: '30 días', descripcion: '7 GB en total + 100 min a otras + Min. ilim. CNT + 30 min internacionales + 50 SMS + CNT Play' },
      { id: 'cn8', precio: 10.00, vigencia: '30 días', descripcion: '15 GB en total + 200 min a otras + Min. ilim. CNT + 30 min internacionales + 50 SMS + CNT Play' },
      { id: 'cn9', precio: 10.00, vigencia: 'N/A', descripcion: 'Combos de Datos: 25 GB' },
      { id: 'cn10', precio: 15.00, vigencia: '30 días', descripcion: '20 GB en total + 300 min a otras + Min. ilim. CNT + 30 min internacionales + 50 SMS + CNT Play' },
      { id: 'cn11', precio: 20.00, vigencia: '30 días', descripcion: '25 GB en total + Minutos ilim. a otras + Min. ilim. CNT + 30 min internacionales + 50 SMS + CNT Play' },
      { id: 'cn12', precio: 20.00, vigencia: 'N/A', descripcion: 'Combos de Datos: 45 GB' }
    ]
  }
]

interface ServicioEmpresa {
  id: string
  nombre: string
  compania: string
  emoji: string
  ayuda: string
}

const SERVICIOS_BASICOS: ServicioEmpresa[] = [
  { id: 'cnel', nombre: 'Planilla de Luz', compania: 'CNEL (Empresa Eléctrica)', emoji: '💡', ayuda: 'Código único nacional de 10 dígitos o número de cédula del propietario' },
  { id: 'agua', nombre: 'Planilla de Agua', compania: 'Interagua / Emapa / Agua Local', emoji: '💧', ayuda: 'Número de contrato o código de suministro del predio' },
  { id: 'cnt_tel', nombre: 'CNT Teléfono/Internet', compania: 'CNT EP', emoji: '📞', ayuda: 'Número telefónico fijo (incluyendo código de provincia) o cuenta de internet' },
  { id: 'netlife', nombre: 'Netlife Internet', compania: 'Netlife', emoji: '🌐', ayuda: 'Código de cliente (formato net-XXXXXX) o CI del titular' },
  { id: 'claro_hogar', nombre: 'Claro Hogar', compania: 'Claro Internet/TV', emoji: '📺', ayuda: 'Número de cuenta o cédula de identidad del titular' },
  { id: 'ant', nombre: 'Multas y Matrícula', compania: 'ANT (Tránsito)', emoji: '🚗', ayuda: 'Número de placa del vehículo o número de cédula del propietario' },
  { id: 'iess', nombre: 'IESS Glosas/Planillas', compania: 'IESS Seguro Social', emoji: '🏢', ayuda: 'Cédula de identidad del afiliado o RUC del empleador' }
]

const NUMERO_WHATSAPP = '593984341953'

interface ItemHistorial {
  id: string
  type: 'recarga' | 'servicio'
  operatorOrServiceId: string
  name: string
  numberOrCode: string
  amount?: number
  packageName?: string
  date: string
}

export default function RecargasPage() {
  const router = useRouter()
  
  // Estados principales
  const [activeTab, setActiveTab] = useState<'recargas' | 'servicios'>('recargas')
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  
  // Estados para Recargas
  const [selectedOp, setSelectedOp] = useState<Operador | null>(null)
  const [recargaType, setRecargaType] = useState<'saldo' | 'combo'>('combo')
  const [selectedPaquete, setSelectedPaquete] = useState<Paquete | null>(null)
  const [customMonto, setCustomMonto] = useState<string>('')
  const [telefono, setTelefono] = useState<string>('')
  
  // Estados para Servicios
  const [selectedServicio, setSelectedServicio] = useState<ServicioEmpresa | null>(null)
  const [codigoServicio, setCodigoServicio] = useState<string>('')
  
  // Historial local
  const [historial, setHistorial] = useState<ItemHistorial[]>([])
  const [alerta, setAlerta] = useState<string | null>(null)

  // Cargar historial al iniciar
  useEffect(() => {
    const saved = localStorage.getItem('lc_recargas_frecuentes')
    if (saved) {
      try {
        setHistorial(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  // Guardar en historial
  const guardarEnHistorial = (item: Omit<ItemHistorial, 'id' | 'date'>) => {
    const nuevoItem: ItemHistorial = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
    }
    const actual = [nuevoItem, ...historial.filter(h => h.numberOrCode !== item.numberOrCode)].slice(0, 10)
    setHistorial(actual)
    localStorage.setItem('lc_recargas_frecuentes', JSON.stringify(actual))
  }

  // Eliminar de historial
  const eliminarDeHistorial = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const filtrado = historial.filter(h => h.id !== id)
    setHistorial(filtrado)
    localStorage.setItem('lc_recargas_frecuentes', JSON.stringify(filtrado))
  }

  // Usar item del historial
  const cargarDesdeHistorial = (item: ItemHistorial) => {
    if (item.type === 'recarga') {
      setActiveTab('recargas')
      const op = OPERADORES.find(o => o.id === item.operatorOrServiceId)
      if (op) {
        setSelectedOp(op)
        if (item.packageName) {
          setRecargaType('combo')
          const pack = op.paquetes.find(p => p.descripcion === item.packageName || p.id === item.packageName)
          setSelectedPaquete(pack || null)
        } else {
          setRecargaType('saldo')
          setCustomMonto(item.amount?.toString() || '')
        }
        setTelefono(item.numberOrCode)
        setCurrentStep(2)
      }
    } else {
      setActiveTab('servicios')
      const serv = SERVICIOS_BASICOS.find(s => s.id === item.operatorOrServiceId)
      if (serv) {
        setSelectedServicio(serv)
        setCodigoServicio(item.numberOrCode)
        setCurrentStep(2)
      }
    }
  }

  // Calcular comisiones y totales
  const getCalculos = () => {
    let base = 0
    let recargo = 0.10 // Recarga normal por defecto
    
    if (activeTab === 'recargas' && selectedOp) {
      if (recargaType === 'combo' && selectedPaquete) {
        base = selectedPaquete.precio
        recargo = 0.15 // Combos llevan recargo de $0.15
      } else {
        base = parseFloat(customMonto) || 0
        recargo = 0.10 // Recarga de saldo normal
      }
    }
    
    return {
      subtotal: base,
      recargo: recargo,
      total: base + recargo
    }
  }

  const handleNextStep = () => {
    setAlerta(null)
    
    if (activeTab === 'recargas') {
      if (currentStep === 1) {
        if (!selectedOp) {
          setAlerta('Por favor selecciona una operadora.')
          return
        }
        setCurrentStep(2)
      } else if (currentStep === 2) {
        // Validar número primero
        const numRegex = /^09\d{8}$|^0\d{9}$/ // 10 dígitos
        if (!numRegex.test(telefono)) {
          setAlerta('Ingresa un número de celular correcto (10 dígitos, empieza con 0).')
          return
        }

        // Validar selección de monto/paquete
        if (recargaType === 'saldo') {
          const m = parseFloat(customMonto)
          if (isNaN(m) || m <= 0) {
            setAlerta('Ingresa un monto de recarga válido.')
            return
          }
          if (!selectedOp) {
            setAlerta('Por favor selecciona una operadora.')
            return
          }
          const isClaro = selectedOp.id === 'claro'
          const minVal = isClaro ? 1.05 : 0.25
          const maxVal = isClaro ? 6.00 : 20.00
          if (m < minVal || m > maxVal) {
            setAlerta(`Para ${selectedOp.nombre}, las recargas de saldo deben ser entre $${minVal.toFixed(2)} y $${maxVal.toFixed(2)}.`)
            return
          }
        } else {
          if (!selectedPaquete) {
            setAlerta('Selecciona un paquete o combo de la lista.')
            return
          }
        }
        
        setCurrentStep(3)
      }
    } else {
      // Flujo de Servicios
      if (currentStep === 1) {
        if (!selectedServicio) {
          setAlerta('Selecciona un servicio básico a pagar.')
          return
        }
        setCurrentStep(2)
      } else if (currentStep === 2) {
        if (!codigoServicio.trim()) {
          setAlerta('Ingresa el código o número de suministro.')
          return
        }
        setCurrentStep(3)
      }
    }
  }

  const handleSendWhatsApp = () => {
    let msg = ''
    const calc = getCalculos()
    
    if (activeTab === 'recargas' && selectedOp) {
      const opName = selectedOp.nombre
      let detail = recargaType === 'combo' 
        ? `Combo/Paquete: ${selectedPaquete?.descripcion || ''} (${selectedPaquete?.vigencia || ''})` 
        : 'Recarga de Saldo Libre'

      msg = `Hola Tienda La Crayola, solicito una recarga con los siguientes datos:
📱 Número a Recargar: *${telefono}*
🏢 Operadora: *${opName}*
📄 Detalle: *${detail}*
💵 Valor Recarga: *$${calc.subtotal.toFixed(2)}*
⚙️ Comisión Trámite: *$${calc.recargo.toFixed(2)}*
💰 *TOTAL A TRANSFERIR: $${calc.total.toFixed(2)}*

(A continuación adjunto la captura del comprobante de transferencia bancaria)`

      // Guardar en historial
      guardarEnHistorial({
        type: 'recarga',
        operatorOrServiceId: selectedOp.id,
        name: opName,
        numberOrCode: telefono,
        amount: calc.subtotal,
        packageName: selectedPaquete?.id || undefined
      })
      
    } else if (activeTab === 'servicios' && selectedServicio) {
      msg = `Hola Tienda La Crayola, deseo consultar y pagar el siguiente servicio:
🛠️ Servicio: *${selectedServicio.nombre}*
🏢 Empresa: *${selectedServicio.compania}*
🔑 Código/Suministro: *${codigoServicio}*
⚙️ Recargo Trámite: *+$0.25*

Por favor, ayúdenme consultando el valor pendiente de esta planilla para realizarles la transferencia bancaria.`

      // Guardar en historial
      guardarEnHistorial({
        type: 'servicio',
        operatorOrServiceId: selectedServicio.id,
        name: selectedServicio.nombre,
        numberOrCode: codigoServicio
      })
    }

    const encoded = encodeURIComponent(msg)
    window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${encoded}`, '_blank')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      
      {/* Botón Volver */}
      <button 
        onClick={() => router.push('/tiendas')}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-600 font-bold transition cursor-pointer"
      >
        <ArrowLeft size={14} /> Volver a Tiendas
      </button>

      {/* Banner de Bienvenida */}
      <div className="bg-gradient-to-br from-green-700 to-emerald-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 pointer-events-none">
          <Smartphone size={160} />
        </div>
        <div className="max-w-md space-y-1">
          <h1 className="text-xl font-extrabold flex items-center gap-2">
            <span>📱</span> Recargas y Servicios de Pago
          </h1>
          <p className="text-xs text-green-100">
            Ingresa los datos del número o planilla, genera la orden y envíala por WhatsApp con tu transferencia bancaria. ¡Rápido, cómodo y sin filas!
          </p>
        </div>
      </div>

      {/* Selector de Pestañas (Tabs) */}
      <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
        <button
          onClick={() => {
            setActiveTab('recargas')
            setCurrentStep(1)
            setSelectedServicio(null)
            setAlerta(null)
          }}
          className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'recargas' 
              ? 'bg-green-600 text-white shadow-sm' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Smartphone size={16} /> Recargas & Combos
        </button>
        <button
          onClick={() => {
            setActiveTab('servicios')
            setCurrentStep(1)
            setSelectedOp(null)
            setAlerta(null)
          }}
          className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'servicios' 
              ? 'bg-green-600 text-white shadow-sm' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <DollarSign size={16} /> Pago de Planillas
        </button>
      </div>

      {/* Stepper Visual (Pasos) */}
      <div className="flex items-center justify-between px-6 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm text-xs font-bold text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
            currentStep >= 1 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'
          }`}>1</span>
          <span className={currentStep === 1 ? 'text-gray-800 font-extrabold' : ''}>
            {activeTab === 'recargas' ? 'Operadora' : 'Servicio'}
          </span>
        </div>
        <div className="w-10 h-[2px] bg-gray-100 flex-1 mx-4" />
        <div className="flex items-center gap-1.5">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
            currentStep >= 2 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'
          }`}>2</span>
          <span className={currentStep === 2 ? 'text-gray-800 font-extrabold' : ''}>Datos</span>
        </div>
        <div className="w-10 h-[2px] bg-gray-100 flex-1 mx-4" />
        <div className="flex items-center gap-1.5">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
            currentStep >= 3 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'
          }`}>3</span>
          <span className={currentStep === 3 ? 'text-gray-800 font-extrabold' : ''}>Pago</span>
        </div>
      </div>

      {/* Alertas */}
      {alerta && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start gap-2.5 text-xs animate-fade-in">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <div>{alerta}</div>
        </div>
      )}

      {/* ================= PÁGINA CONTENIDO ================= */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6 min-h-[300px]">
        
        {/* =============== TAB RECARGAS =============== */}
        {activeTab === 'recargas' && (
          <>
            {/* PASO 1: Seleccionar Operador */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="text-sm font-extrabold text-gray-800">1. Selecciona tu operadora móvil:</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {OPERADORES.map(op => {
                    const isSelected = selectedOp?.id === op.id
                    return (
                      <button
                        key={op.id}
                        onClick={() => {
                          setSelectedOp(op)
                          setSelectedPaquete(null)
                          setAlerta(null)
                        }}
                        className={`p-4 rounded-2xl border text-left flex flex-col items-center justify-center gap-3 transition-all relative group cursor-pointer ${
                          isSelected 
                            ? 'bg-green-50 border-green-500 text-green-700 shadow-sm scale-102 font-black' 
                            : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
                        }`}
                      >
                        <span className="text-3xl select-none group-hover:scale-105 transition-transform">{op.emoji}</span>
                        <span className="text-xs font-black">{op.nombre}</span>
                        {isSelected && (
                          <span className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-0.5">
                            <CheckCircle size={10} className="fill-white text-green-500" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* PASO 2: Datos de Recarga */}
            {currentStep === 2 && selectedOp && (
              <div className="space-y-6">
                
                {/* Cabecera Operador Seleccionado */}
                <div className={`flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r ${selectedOp.gradient} text-white shadow-sm`}>
                  <span className="text-2xl">{selectedOp.emoji}</span>
                  <div>
                    <h3 className="font-extrabold text-sm">{selectedOp.nombre}</h3>
                    <p className="text-[10px] text-white/80 font-bold">Configurando recarga</p>
                  </div>
                  <button 
                    onClick={() => { setCurrentStep(1); setSelectedPaquete(null); }} 
                    className="ml-auto text-xs underline font-bold bg-white/20 hover:bg-white/35 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    Cambiar
                  </button>
                </div>

                {/* 1. NÚMERO DE TELÉFONO (AL INICIO - UX MEJORADO) */}
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-black text-gray-800 uppercase tracking-wide">
                    <Phone size={13} className="text-green-600" />
                    <span>Número de Celular a Recargar</span>
                  </div>
                  
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-base select-none">📱</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={telefono}
                      onChange={e => setTelefono(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ej: 0980937186 (10 dígitos)"
                      className="w-full pl-10 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base font-extrabold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition shadow-sm"
                    />
                  </div>
                  
                  {telefono.length > 0 && telefono.length < 10 && (
                    <p className="text-[10px] text-orange-500 font-bold flex items-center gap-1">
                      <AlertCircle size={10} /> Faltan {10 - telefono.length} dígitos
                    </p>
                  )}
                  {telefono.length === 10 && !telefono.startsWith('0') && (
                    <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                      <AlertCircle size={10} /> El número debe iniciar con 0 (Ej: 09...)
                    </p>
                  )}
                  {telefono.length === 10 && telefono.startsWith('0') && (
                    <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                      <CheckCircle size={10} className="fill-green-600 text-white" /> ¡Número listo! Por favor verifica que esté correcto.
                    </p>
                  )}
                </div>

                {/* 2. SWITCH TIPO DE RECARGA (MÁS VISIBLE Y ACCESIBLE) */}
                <div className="space-y-2">
                  <div className="text-xs font-black text-gray-800 uppercase tracking-wide">¿Qué deseas recargar?</div>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
                    <button
                      onClick={() => { setRecargaType('saldo'); setSelectedPaquete(null); }}
                      className={`py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        recargaType === 'saldo' 
                          ? 'bg-green-600 text-white shadow-md' 
                          : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                      }`}
                    >
                      <Smartphone size={14} /> Recargar Saldo
                    </button>
                    <button
                      onClick={() => setRecargaType('combo')}
                      className={`py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        recargaType === 'combo' 
                          ? 'bg-green-600 text-white shadow-md' 
                          : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                      }`}
                    >
                      <Wifi size={14} /> Paquetes y Combos
                    </button>
                  </div>
                </div>

                {/* 3. DETALLE: SALDO LIBRE O COMBOS (SIN SCROLL ANIDADO) */}
                {recargaType === 'saldo' ? (
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-black text-gray-800 uppercase tracking-wide block">¿Cuánto deseas recargar? (USD):</label>
                    <p className="text-[11px] text-gray-500 font-bold mb-1">
                      Rango de montos permitido: <span className="text-green-600 font-extrabold">${selectedOp.id === 'claro' ? '1.05' : '0.25'} - ${selectedOp.id === 'claro' ? '6.00' : '20.00'}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedOp.id === 'claro'
                        ? [1.05, 2.05, 3.10, 4.10, 5.15, 6.00]
                        : [0.25, 0.50, 1.00, 2.00, 3.00, 6.00, 10.00, 20.00]
                      ).map(val => (
                        <button
                          key={val}
                          onClick={() => setCustomMonto(val.toString())}
                          className={`py-2 px-3.5 rounded-xl border-2 font-black text-xs transition cursor-pointer ${
                            customMonto === val.toString() 
                              ? 'bg-green-600 border-green-600 text-white shadow-sm' 
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          ${val.toFixed(2)}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-base">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min={selectedOp.id === 'claro' ? '1.05' : '0.25'}
                        max={selectedOp.id === 'claro' ? '6.00' : '20.00'}
                        value={customMonto}
                        onChange={e => {
                          const val = e.target.value;
                          setCustomMonto(val);
                          const m = parseFloat(val);
                          if (!isNaN(m)) {
                            const minVal = selectedOp.id === 'claro' ? 1.05 : 0.25;
                            const maxVal = selectedOp.id === 'claro' ? 6.00 : 20.00;
                            if (m < minVal || m > maxVal) {
                              setAlerta(`Monto fuera de rango (${selectedOp.nombre}: $${minVal.toFixed(2)} - $${maxVal.toFixed(2)})`);
                            } else {
                              setAlerta(null);
                            }
                          } else {
                            setAlerta(null);
                          }
                        }}
                        onBlur={e => {
                          const val = e.target.value;
                          const m = parseFloat(val);
                          if (!isNaN(m)) {
                            const minVal = selectedOp.id === 'claro' ? 1.05 : 0.25;
                            const maxVal = selectedOp.id === 'claro' ? 6.00 : 20.00;
                            if (m < minVal) {
                              setCustomMonto(minVal.toString());
                              setAlerta(null);
                            } else if (m > maxVal) {
                              setCustomMonto(maxVal.toString());
                              setAlerta(null);
                            }
                          }
                        }}
                        placeholder={`Ingresa otro valor (Ej: ${selectedOp.id === 'claro' ? '1.50, 4.50' : '1.50, 15.00'})`}
                        className="w-full pl-8 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-extrabold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-black text-gray-800 uppercase tracking-wide block">Selecciona tu combo o paquete:</label>
                    
                    {/* Renderizado directo en la página, sin scroll anidado para facilitar el scroll móvil */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedOp.paquetes.map(pack => {
                        const isSelected = selectedPaquete?.id === pack.id
                        return (
                          <div
                            key={pack.id}
                            onClick={() => setSelectedPaquete(pack)}
                            className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between relative hover:border-green-400 select-none shadow-sm ${
                              isSelected 
                                ? 'bg-green-50/50 border-green-500 shadow-md scale-[1.01]' 
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <span className="text-base font-black text-gray-900">${pack.precio.toFixed(2)}</span>
                              <span className="text-[10px] font-black bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full shrink-0">
                                📅 {pack.vigencia}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed font-semibold">{pack.descripcion}</p>
                            {isSelected && (
                              <span className="absolute top-2.5 right-2.5 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                                <CheckCircle size={10} className="fill-white text-green-500" />
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* PASO 3: Factura y Botón Enviar */}
            {currentStep === 3 && selectedOp && (
              <div className="space-y-6">
                <div className="text-sm font-extrabold text-gray-800">3. Confirma tu pedido y realiza el pago:</div>
                
                {/* Tabla de Facturación */}
                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <span className="text-2xl">{selectedOp.emoji}</span>
                    <div>
                      <h4 className="font-extrabold text-sm">{selectedOp.nombre}</h4>
                      <p className="text-xs text-gray-500 font-extrabold">Celular: {telefono}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-semibold">
                    <div className="flex justify-between text-gray-600">
                      <span>Valor de recarga/paquete:</span>
                      <span className="font-bold">${getCalculos().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Recargo por trámite ({recargaType === 'combo' ? 'Combo' : 'Saldo'}):</span>
                      <span className="font-bold text-green-700">+${getCalculos().recargo.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2.5 flex justify-between font-black text-sm text-gray-900">
                      <span>Total Neto a Transferir:</span>
                      <span className="text-green-600 font-extrabold text-base">${getCalculos().total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Botón Deuna */}
                <a
                  href="https://pagar.deuna.app/H92p/merchant?id=828c98695b77537a52da2f2dd281b2746c019154"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 bg-[#702082] hover:bg-[#5a166a] active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2.5 cursor-pointer hover:shadow-lg border border-purple-800 text-center"
                >
                  <span className="text-base">🟣</span> Pagar con Deuna
                </a>

                {/* Instrucciones de Pago */}
                <div className="bg-green-50/70 border border-green-100 rounded-2xl p-4 space-y-2 text-xs text-green-800">
                  <div className="font-extrabold text-green-950 flex items-center gap-1.5">
                    <ShieldCheck size={15} /> Instrucciones de Pago:
                  </div>
                  <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed font-medium">
                    <li>Paga el total de <b>${getCalculos().total.toFixed(2)}</b> usando el botón de <b>Deuna</b> de arriba, o mediante transferencia bancaria habitual.</li>
                    <li>Toma una captura de pantalla del comprobante de pago o transferencia exitosa.</li>
                    <li>Haz clic en el botón de abajo, el cual abrirá tu WhatsApp y rellenará el mensaje con tus datos confirmados de recarga.</li>
                    <li>Envía el mensaje en WhatsApp y **adjunta la captura del comprobante**. ¡Tu recarga se aplicará en minutos!</li>
                  </ol>
                </div>
              </div>
            )}
          </>
        )}

        {/* =============== TAB SERVICIOS =============== */}
        {activeTab === 'servicios' && (
          <>
            {/* PASO 1: Seleccionar Servicio */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="text-sm font-extrabold text-gray-800">1. Selecciona el servicio básico que deseas pagar:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SERVICIOS_BASICOS.map(serv => {
                    const isSelected = selectedServicio?.id === serv.id
                    return (
                      <button
                        key={serv.id}
                        onClick={() => {
                          setSelectedServicio(serv)
                          setAlerta(null)
                        }}
                        className={`p-4 rounded-2xl border text-left flex items-center gap-4 transition-all relative cursor-pointer ${
                          isSelected 
                            ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' 
                            : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
                        }`}
                      >
                        <span className="text-3xl select-none">{serv.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-black text-gray-800">{serv.nombre}</div>
                          <div className="text-[10px] text-gray-400 truncate font-semibold">{serv.compania}</div>
                        </div>
                        {isSelected && (
                          <span className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-0.5">
                            <CheckCircle size={10} className="fill-white text-green-500" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* PASO 2: Ingresar Suministro */}
            {currentStep === 2 && selectedServicio && (
              <div className="space-y-5">
                
                {/* Cabecera Servicio */}
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-800">
                  <span className="text-2xl">{selectedServicio.emoji}</span>
                  <div>
                    <h3 className="font-extrabold text-sm">{selectedServicio.nombre}</h3>
                    <p className="text-[10px] text-gray-400 font-semibold">{selectedServicio.compania}</p>
                  </div>
                  <button 
                    onClick={() => setCurrentStep(1)} 
                    className="ml-auto text-xs underline font-bold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-2.5 py-1 rounded-lg transition"
                  >
                    Cambiar
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 block">Código o Número de Suministro / Cuenta *</label>
                  <input
                    type="text"
                    value={codigoServicio}
                    onChange={e => setCodigoServicio(e.target.value)}
                    placeholder="Ej: 1002837461, etc."
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:bg-white transition"
                  />
                  <p className="text-[10px] text-gray-400 flex items-start gap-1 font-semibold leading-relaxed">
                    <AlertCircle size={11} className="shrink-0 mt-0.5 text-orange-500" />
                    <span><b>Ayuda:</b> {selectedServicio.ayuda}.</span>
                  </p>
                </div>

                {/* Cuadro de aviso comisiones */}
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs space-y-1">
                  <div className="font-extrabold text-amber-950 flex items-center gap-1.5">
                    ⚙️ Comisión de Trámite: +$0.25 cts
                  </div>
                  <p className="leading-relaxed font-medium">
                    A los pagos de servicios básicos se les adiciona una comisión de <b>$0.25</b> centavos por el trámite de recaudación.
                  </p>
                </div>

              </div>
            )}

            {/* PASO 3: Envío de Datos de Servicio */}
            {currentStep === 3 && selectedServicio && (
              <div className="space-y-6">
                <div className="text-sm font-extrabold text-gray-800">3. Proceso para consulta de saldo y pago:</div>

                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <span className="text-2xl">{selectedServicio.emoji}</span>
                    <div>
                      <h4 className="font-extrabold text-sm">{selectedServicio.nombre}</h4>
                      <p className="text-[10px] text-gray-500">{selectedServicio.compania}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-medium">
                    <div className="flex justify-between text-gray-600">
                      <span>Código/Cuenta de Suministro:</span>
                      <span className="font-black text-gray-800">{codigoServicio}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Monto Factura:</span>
                      <span className="font-bold text-gray-400 italic">Por consultar en sistema</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Recargo de trámite:</span>
                      <span className="font-black text-green-700">+$0.25</span>
                    </div>
                  </div>
                </div>

                {/* Instrucciones de Consulta */}
                <div className="bg-green-50/70 border border-green-100 rounded-2xl p-4 space-y-2 text-xs text-green-800">
                  <div className="font-extrabold text-green-950 flex items-center gap-1.5">
                    <ShieldCheck size={15} /> ¿Cómo funciona este pago?
                  </div>
                  <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed font-medium">
                    <li>Haz clic en el botón de abajo para enviar los datos del servicio al WhatsApp del cajero.</li>
                    <li>El cajero consultará de forma inmediata en el sistema el valor exacto adeudado de tu planilla.</li>
                    <li>El cajero te responderá por WhatsApp indicándote: <i>"Monto Planilla + $0.25 de trámite = Total a Pagar"</i>.</li>
                    <li>Realizas la transferencia del total indicado, le envías la captura del comprobante por el chat, y el cajero procesará tu pago al instante.</li>
                  </ol>
                </div>
              </div>
            )}
          </>
        )}

        {/* =============== FOOTER BOTONES PASOS =============== */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {currentStep > 1 ? (
            <button
              onClick={() => {
                setAlerta(null)
                setCurrentStep((s) => (s - 1) as 1 | 2 | 3)
              }}
              className="py-3.5 px-5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} /> Anterior
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <button
              onClick={handleNextStep}
              className="py-3.5 px-6 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              Siguiente <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSendWhatsApp}
              className="py-3.5 px-6 bg-[#25D366] hover:bg-[#20c05a] text-white text-xs font-black rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer animate-pulse"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white inline">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Enviar a WhatsApp
            </button>
          )}
        </div>

      </div>

      {/* ================= SECCIÓN HISTORIAL / FAVORITOS ================= */}
      {historial.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-extrabold text-sm text-gray-800 flex items-center gap-1.5">
            <History size={16} className="text-gray-400" /> Números y Cuentas Frecuentes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {historial.map(item => {
              const op = OPERADORES.find(o => o.id === item.operatorOrServiceId)
              const serv = SERVICIOS_BASICOS.find(s => s.id === item.operatorOrServiceId)
              const icon = item.type === 'recarga' ? (op?.emoji || '📱') : (serv?.emoji || '🏢')
              
              return (
                <div
                  key={item.id}
                  onClick={() => cargarDesdeHistorial(item)}
                  className="p-3 bg-gray-50 border border-gray-100 hover:border-green-200 rounded-2xl flex items-center justify-between gap-3 cursor-pointer group transition-all select-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xl shrink-0">{icon}</span>
                    <div className="min-w-0 text-left">
                      <div className="text-xs font-black text-gray-800 truncate">{item.name}</div>
                      <div className="text-[10px] text-gray-500 font-semibold truncate">
                        {item.numberOrCode} {item.amount ? `· $${item.amount.toFixed(2)}` : ''}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] text-gray-400 bg-gray-100 group-hover:bg-green-50 px-2 py-0.5 rounded-full font-bold">
                      {item.date}
                    </span>
                    <button
                      onClick={(e) => eliminarDeHistorial(e, item.id)}
                      className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar de favoritos"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Estilos locales para transiciones suaves */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
