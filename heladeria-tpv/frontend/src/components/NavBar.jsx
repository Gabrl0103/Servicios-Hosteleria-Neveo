import { NavLink, useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import neveoLogo from '../assets/neveo-logo.png'
import './NavBar.css'

// Orden de los enlaces segun el diseño (design/A-Mesas.dc.html).
const ITEMS = [
  { to: '/mesas', label: 'Mesas' },
  { to: '/turno', label: 'Turno' },
  { to: '/cuadre-de-caja', label: 'Cuadre de caja' },
  { to: '/reportes', label: 'Reportes' },
  { to: '/analisis', label: 'Análisis' },
  { to: '/productos', label: 'Productos' },
  { to: '/configuracion', label: 'Configuración' },
]

function formatToday() {
  return new Date().toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function NavBar() {
  const { cashRegister, alertCount } = useSession()
  const navigate = useNavigate()

  return (
    <header className="navbar">
      <div className="navbar__brand" onClick={() => navigate('/reportes')}>
        {/* Logo fijo de Neveo. El subido en Configuracion es solo para los recibos. */}
        <img className="navbar__logo" src={neveoLogo} alt="Neveo" />
        <div className="navbar__tagline">PUNTO DE VENTA</div>
      </div>

      <nav className="navbar__links">
        {ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className="navbar__link">
            {item.label}
            {item.to === '/analisis' && alertCount > 0 && (
              <span className="navbar__alert-dot" title={`${alertCount} alerta(s)`} />
            )}
          </NavLink>
        ))}
      </nav>

      <div className="navbar__status">
        {cashRegister ? (
          <div className="navbar__shift navbar__shift--open">
            <span className="navbar__shift-dot" />
            <div className="navbar__shift-text">
              <span className="navbar__shift-title">Turno abierto</span>
              <span className="navbar__shift-meta">
                {new Date(cashRegister.openedAt).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })} · Caja 01
              </span>
            </div>
          </div>
        ) : (
          <div className="navbar__shift navbar__shift--closed">
            <span className="navbar__shift-dot" />
            <div className="navbar__shift-text">
              <span className="navbar__shift-title">Sin turno abierto</span>
              <span className="navbar__shift-meta">Caja 01</span>
            </div>
          </div>
        )}
        <div className="navbar__date">{formatToday()}</div>
      </div>
    </header>
  )
}
