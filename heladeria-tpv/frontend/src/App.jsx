// Estilos base primero, para que el CSS de cada pantalla pueda refinarlos.
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/global.css'
import './styles/ui.css'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SessionProvider, useSession } from './context/SessionContext'
import NavBar from './components/NavBar'
import IconDefs from './components/IconDefs'
import CashRegisterPage from './pages/CashRegisterPage'
import CashBoxHistoryPage from './pages/CashBoxHistoryPage'
import TablesPage from './pages/TablesPage'
import TableDetailPage from './pages/TableDetailPage'
import ReportsPage from './pages/ReportsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ProductsPage from './pages/ProductsPage'
import SettingsPage from './pages/SettingsPage'
import ShiftReceiptPage from './pages/ShiftReceiptPage'
import OrderReceiptPage from './pages/OrderReceiptPage'
import DatabaseRestorePage from './pages/DatabaseRestorePage'

function RemoteBanner() {
  const { remote } = useSession()
  if (!remote) return null
  return (
    <div className="remote-banner" role="status">
      <span className="remote-banner__dot" />
      Modo remoto (solo lectura)
    </div>
  )
}

function Layout({ children }) {
  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RemoteBanner />
      <NavBar />
      <main style={{ flex: 1, minHeight: 0, position: 'relative' }}>{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <IconDefs />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/reportes" replace />} />
          <Route path="/mesas" element={<Layout><TablesPage /></Layout>} />
          <Route path="/mesas/:tableId" element={<Layout><TableDetailPage /></Layout>} />
          <Route path="/turno" element={<Layout><CashRegisterPage /></Layout>} />
          <Route path="/cuadre-de-caja" element={<Layout><CashBoxHistoryPage /></Layout>} />
          <Route path="/reportes" element={<Layout><ReportsPage /></Layout>} />
          <Route path="/analisis" element={<Layout><AnalyticsPage /></Layout>} />
          <Route path="/productos" element={<Layout><ProductsPage /></Layout>} />
          <Route path="/configuracion" element={<Layout><SettingsPage /></Layout>} />
          {/* Ruta independiente, sin NavBar, pensada para abrirse en pestana/ventana aparte */}
          <Route path="/recibo/:cashRegisterId" element={<ShiftReceiptPage />} />
          <Route path="/recibo-venta/:orderId" element={<OrderReceiptPage />} />
          <Route path="/soporte/restaurar" element={<DatabaseRestorePage />} />
        </Routes>
      </HashRouter>
    </SessionProvider>
  )
}
