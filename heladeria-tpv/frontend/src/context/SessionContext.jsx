import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getCurrentCashRegister } from '../api/cashRegisters'
import { getInsights } from '../api/insights'
import { getMeta } from '../api/meta'

const SessionContext = createContext(null)

// La app no tiene login. Se usa siempre el mismo usuario de sistema
// (id 1, creado automaticamente por el backend) para registrar
// ventas y turnos.
const SYSTEM_USER = { id: 1, name: 'Heladeria' }

const INSIGHTS_REFRESH_MS = 15 * 60 * 1000

export function SessionProvider({ children }) {
  const [cashRegister, setCashRegister] = useState(null)
  const [loadingRegister, setLoadingRegister] = useState(true)
  const [alertCount, setAlertCount] = useState(0)
  const [remote, setRemote] = useState(false)

  const refreshCashRegister = useCallback(async () => {
    setLoadingRegister(true)
    try {
      const register = await getCurrentCashRegister()
      setCashRegister(register)
    } finally {
      setLoadingRegister(false)
    }
  }, [])

  useEffect(() => {
    refreshCashRegister()
  }, [refreshCashRegister])

  // Alertas del panel de analisis: al abrir la app y cada 15 minutos,
  // para el indicador junto al enlace "Analisis".
  useEffect(() => {
    function refreshAlerts() {
      getInsights()
        .then((insights) => setAlertCount(insights.alerts.length))
        .catch(() => {}) // Sin datos de analisis no se muestra indicador.
    }
    refreshAlerts()
    const id = setInterval(refreshAlerts, INSIGHTS_REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    getMeta().then((m) => setRemote(!!m.remote)).catch(() => {})
  }, [])

  const value = {
    user: SYSTEM_USER,
    cashRegister,
    loadingRegister,
    refreshCashRegister,
    alertCount,
    setAlertCount,
    remote,
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession debe usarse dentro de SessionProvider')
  }
  return context
}
