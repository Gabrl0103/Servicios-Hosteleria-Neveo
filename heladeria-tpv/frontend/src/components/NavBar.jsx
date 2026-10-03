import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { getBusinessSettings } from '../api/businessSettings'

const ITEMS = [
  { to: '/reportes', label: 'Reportes', icon: 'ic-chart' },
  { to: '/analisis', label: 'Análisis', icon: 'ic-bulb' },
  { to: '/mesas', label: 'Mesas', icon: 'ic-cart' },
  { to: '/turno', label: 'Turno', icon: 'ic-clock' },
  { to: '/cuadre-de-caja', label: 'Cuadre de caja', icon: 'ic-list' },
  { to: '/productos', label: 'Productos', icon: 'ic-box' },
  { to: '/configuracion', label: 'Configuración', icon: 'ic-settings' },
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
  const [logo, setLogo] = useState(null)

  useEffect(() => {
    getBusinessSettings().then((s) => { if (s.logoBase64) setLogo(s.logoBase64) }).catch(() => {})
  }, [])

  return (
    <header
      style={{
        flex: 'none',
        height: 66,
        background: 'var(--surface)',
        borderBottom: '1px solid #E9E1D5',
        display: 'flex',
        alignItems: 'center',
        padding: '0 22px',
        gap: 26,
        boxShadow: '0 1px 0 rgba(0,0,0,.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' }} onClick={() => navigate('/reportes')}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: logo ? 'transparent' : 'var(--ink)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          {logo ? (
            <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <span className="mono" style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>N</span>
          )}
        </div>
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Neveo</div>
          <div className="mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.18em', marginTop: 3 }}>
            PUNTO DE VENTA
          </div>
        </div>
      </div>

      <nav style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 11,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              background: isActive ? 'var(--ink)' : 'transparent',
              color: isActive ? '#fff' : 'var(--text-muted)',
            })}
          >
            <svg width="18" height="18">
              <use href={`#${item.icon}`} />
            </svg>
            {item.label}
            {item.to === '/analisis' && alertCount > 0 && (
              <span
                title={`${alertCount} alerta(s)`}
                style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red-text)', marginLeft: -2 }}
              />
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        {cashRegister ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--green-bg)',
              border: '1px solid var(--green-border)',
              padding: '7px 13px',
              borderRadius: 10,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: 'var(--green-dot)',
                boxShadow: '0 0 0 3px rgba(39,165,103,.18)',
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green-text)' }}>Turno abierto</span>
            <span className="mono" style={{ fontSize: 12, color: '#5aa37f', fontWeight: 700 }}>
              · {new Date(cashRegister.openedAt).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--neutral-bg)',
              padding: '7px 13px',
              borderRadius: 10,
            }}
          >
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--text-faint)' }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--neutral-text)' }}>Sin turno abierto</span>
          </div>
        )}
        <div style={{ textAlign: 'right', lineHeight: 1.15 }}>
          <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
            {formatToday()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 700 }}>Caja 01</div>
        </div>
      </div>
    </header>
  )
}
