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
      { id: 'c1', precio: 1.05, vigencia: '1 Día', descripcion: '512 MB + 1GB Redes + 100 SMS a Claro' },
      { id: 'c2', precio: 1.50, vigencia: '1 Día', descripcion: '1 GB + 1GB Redes + llamadas ilimitadas a Claro + 10 MIN todos + 100 SMS' },
      { id: 'c3', precio: 2.05, vigencia: '2 Días', descripcion: '1 GB + 1GB Redes + llamadas ilimitadas a Claro + 20 MIN todos + 200 SMS' },
      { id: 'c4', precio: 2.50, vigencia: '3 Días', descripcion: '2 GB + 1GB Redes + llamadas ilimitadas a Claro + 20 MIN todos + 200 SMS' },
      { id: 'c5', precio: 3.10, vigencia: '3 Días', descripcion: '4 GB + 2GB Redes + llamadas ilimitadas a Claro + 30 MIN todos + 300 SMS' },
      { id: 'c6', precio: 3.50, vigencia: '7 Días', descripcion: '4 GB + 2GB Redes + llamadas ilimitadas a Claro + 30 MIN todos + 300 SMS' },
      { id: 'c7', precio: 4.00, vigencia: '10 Días', descripcion: '5 GB + 1GB Redes + llamadas ilimitadas a Claro + 40 MIN todos' },
      { id: 'c8', precio: 5.15, vigencia: '15 Días', descripcion: '3 GB + 4GB Redes + llamadas ilimitadas a Claro + 10 GB Suscripción' },
      { id: 'c9', precio: 5.50, vigencia: '15 Días', descripcion: '5 GB + 4GB Redes + llamadas ilimitadas a Claro + 10 GB Suscripción' },
      { id: 'c10', precio: 6.00, vigencia: '3 Días', descripcion: '4 GB + llamadas ilim Claro + 30 MIN todos + 2GB Gratis' },
      { id: 'c11', precio: 8.00, vigencia: '25 Días', descripcion: '7 GB + 5GB Redes + llamadas ilimitadas a Claro + 15 GB Suscripción' },
      { id: 'c12', precio: 10.50, vigencia: '30 Días', descripcion: '10 GB + 5GB Redes + llamadas ilimitadas a Claro + 15 GB Suscripción' },
      { id: 'c13', precio: 12.50, vigencia: '30 Días', descripcion: '13 GB + 6GB Redes + llamadas ilimitadas a Claro + 15 GB Suscripción' },
      { id: 'c14', precio: 15.50, vigencia: '30 Días', descripcion: '15 GB + 2GB Redes + llamadas ilimitadas a Claro + 150 MIN todos + 5GB Gratis' },
      { id: 'c15', precio: 20.50, vigencia: '30 Días', descripcion: '20 GB + 2GB Redes + llamadas ilimitadas a Claro + 150 MIN todos + 5GB Gratis' },
      { id: 'c16', precio: 2.05, vigencia: '4 Horas', descripcion: 'Paquete de Horas Ilimitadas de Internet' }
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
      { id: 'm1', precio: 1.00, vigencia: '1 Día', descripcion: 'Combo Ahorro: 500 MB + llamadas ilimitadas a Movistar' },
      { id: 'm2', precio: 1.50, vigencia: '1 Día', descripcion: '1.5 GB + Redes sociales ilimitadas + llamadas ilim Movistar + 10 MIN todos' },
      { id: 'm3', precio: 2.50, vigencia: '3 Días', descripcion: '3 GB + Redes sociales ilimitadas + llamadas ilim Movistar + 20 MIN todos' },
      { id: 'm4', precio: 3.50, vigencia: '5 Días', descripcion: '5 GB + Redes sociales ilimitadas + llamadas ilim Movistar + 30 MIN todos' },
      { id: 'm5', precio: 5.00, vigencia: '10 Días', descripcion: '8 GB + Redes sociales ilimitadas + llamadas ilim Movistar + 60 MIN todos' },
      { id: 'm6', precio: 10.00, vigencia: '30 Días', descripcion: '20 GB + Redes sociales ilimitadas + llamadas ilim Movistar + 150 MIN todos' }
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
      { id: 't1', precio: 2.00, vigencia: '3 Días', descripcion: 'Combo $2: 1.5 GB + 1 GB Spotify + llamadas ilimitadas a Tuenti + 15 MIN' },
      { id: 't2', precio: 7.00, vigencia: '30 Días', descripcion: 'Combo $7: 7 GB + 2 GB Spotify + llamadas ilimitadas a Tuenti + 100 MIN + WhatsApp Gratis' },
      { id: 't3', precio: 10.00, vigencia: '30 Días', descripcion: 'Combo $10: 15 GB + 2 GB Spotify + llamadas ilimitadas a Tuenti + 200 MIN + WhatsApp Gratis' },
      { id: 't4', precio: 15.00, vigencia: '30 Días', descripcion: 'Combo $15: 25 GB + 2 GB Spotify + llamadas ilimitadas a Tuenti + llamadas ilim a todos' },
      { id: 't5', precio: 25.00, vigencia: '30 Días', descripcion: 'Combo $25: 45 GB + 2 GB Spotify + llamadas ilimitadas a Tuenti + llamadas ilim a todos' }
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
      { id: 'cn1', precio: 1.00, vigencia: '1 Día', descripcion: 'Paquete Mixto $1: 500 MB + redes + 10 MIN' },
      { id: 'cn2', precio: 3.00, vigencia: '5 Días', descripcion: 'Paquete Mixto $3: 2 GB + redes + 30 MIN' },
      { id: 'cn3', precio: 5.00, vigencia: '10 Días', descripcion: 'Paquete Mixto $5: 5 GB + redes + 50 MIN' },
      { id: 'cn4', precio: 10.00, vigencia: '30 Días', descripcion: 'Paquete Mixto $10: 12 GB + redes + 100 MIN' }
    ]
  },
  {
    id: 'maxiplus',
    nombre: 'Maxiplus',
    emoji: '🟣',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200',
    gradient: 'from-indigo-500 to-purple-700',
    paquetes: [
      { id: 'mx1', precio: 1.00, vigencia: '1 Día', descripcion: 'Combo Ahorro: 1 GB + Redes Sociales' },
      { id: 'mx2', precio: 3.00, vigencia: '7 Días', descripcion: 'Combo Super: 4 GB + Redes Sociales + Llamadas' },
      { id: 'mx3', precio: 5.00, vigencia: '15 Días', descripcion: 'Combo Ultra: 8 GB + Redes Sociales + Llamadas' }
    ]
  },
  {
    id: 'akimovil',
    nombre: 'Akí Móvil',
    emoji: '🟡',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 border-yellow-200',
    gradient: 'from-amber-400 to-orange-500',
    paquetes: [
      { id: 'ak1', precio: 1.00, vigencia: '1 Día', descripcion: 'Combo Akí $1: 500 MB + redes + llamadas ilimitadas a Akí' },
      { id: 'ak2', precio: 3.00, vigencia: '5 Días', descripcion: 'Combo Akí $3: 2 GB + redes + llamadas ilimitadas a Akí + 20 MIN todos' },
      { id: 'ak3', precio: 5.00, vigencia: '15 Días', descripcion: 'Combo Akí $5: 5 GB + redes + llamadas ilimitadas a Akí + 50 MIN todos' }
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
  const [recargaType, setRecargaType] = useState<'saldo' | 'combo'>('saldo')
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
          if (!m || m <= 0) {
            setAlerta('Ingresa un monto de recarga válido.')
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
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 5, 10].map(val => (
                        <button
                          key={val}
                          onClick={() => setCustomMonto(val.toString())}
                          className={`py-2.5 rounded-xl border-2 font-black text-xs transition cursor-pointer ${
                            customMonto === val.toString() 
                              ? 'bg-green-600 border-green-600 text-white shadow-sm' 
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          ${val}.00
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-base">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="1.00"
                        value={customMonto}
                        onChange={e => setCustomMonto(e.target.value)}
                        placeholder="Ingresa otro valor (Ej: 1.50, 4.50, etc.)"
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

                {/* Instrucciones de Pago */}
                <div className="bg-green-50/70 border border-green-100 rounded-2xl p-4 space-y-2 text-xs text-green-800">
                  <div className="font-extrabold text-green-950 flex items-center gap-1.5">
                    <ShieldCheck size={15} /> Instrucciones de Pago:
                  </div>
                  <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed font-medium">
                    <li>Realiza una transferencia bancaria a tu cuenta habitual de <b>La Crayola</b> por el total neto de <b>${getCalculos().total.toFixed(2)}</b>.</li>
                    <li>Toma una captura de pantalla del comprobante de transferencia exitosa.</li>
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
