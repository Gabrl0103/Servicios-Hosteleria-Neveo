import { useEffect, useState } from 'react'
import { getInsights } from '../api/insights'
import { getReportSummary } from '../api/reports'
import { useSession } from '../context/SessionContext'
import { formatCurrency } from '../utils/format'
import { buildBarGeometry } from '../utils/chartGeometry'

function toIsoDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Mismo rango base que el analisis: ultimos 30 dias completos, sin hoy.
function last30Days() {
  const to = new Date()
  to.setDate(to.getDate() - 1)
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

function hourLabel(hour) {
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h}${hour < 12 ? 'am' : 'pm'}`
}

// Solo las horas entre la primera y la ultima con ventas.
function visibleHours(peakHours) {
  const withSales = peakHours.filter((h) => h.avgOrders > 0)
  if (withSales.length === 0) return []
  const first = withSales[0].hour
  const last = withSales[withSales.length - 1].hour
  return peakHours.filter((h) => h.hour >= first && h.hour <= last)
}

export default function AnalyticsPage() {
  const [insights, setInsights] = useState(null)
  const [topProducts, setTopProducts] = useState(null)
  const [error, setError] = useState('')
  const [hover, setHover] = useState(null)
  const { setAlertCount } = useSession()

  useEffect(() => {
    getInsights()
      .then((data) => {
        setInsights(data)
        setAlertCount(data.alerts.length)
      })
      .catch((err) => setError(err.message))
    const { from, to } = last30Days()
    getReportSummary(from, to)
      .then((data) => setTopProducts(data.topProducts))
      .catch(() => setTopProducts([]))
  }, [setAlertCount])

  const hours = insights ? visibleHours(insights.peakHours) : []
  const geometry = hours.length > 0
    ? buildBarGeometry(hours.map((h) => ({ label: hourLabel(h.hour), total: h.avgAmount })))
    : null

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <h1 style={{ fontSize: 25, fontWeight: 900, margin: '0 0 4px' }}>Análisis</h1>
        <p style={{ fontSize: 14, color: 'var(--text-soft)', fontWeight: 700, margin: '0 0 18px' }}>
          Calculado con las ventas de los últimos 30 días (sin contar hoy).
        </p>

        {error && <p style={{ color: 'var(--red-text)' }}>{error}</p>}
        {!insights && !error && <p style={{ color: 'var(--text-soft)' }}>Cargando...</p>}

        {insights && (
          <>
            {!insights.hasEnoughData ? (
              <div className="card" style={{ padding: '20px 22px', marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink)', marginBottom: 4 }}>
                  Aún no hay suficientes datos para analizar
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 700 }}>
                  Se necesitan al menos 14 días con ventas en el último mes (hay {insights.daysWithSales}).
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: '20px 22px', marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink)', marginBottom: 12 }}>Alertas</div>
                {insights.alerts.length === 0 ? (
                  <p style={{ fontSize: 14, color: 'var(--green-text)', fontWeight: 800, margin: 0 }}>Todo en orden</p>
                ) : (
                  insights.alerts.map((a, i) => (
                    <div
                      key={i}
                      style={{ padding: '10px 14px', background: 'var(--red-bg)', color: 'var(--red-text)', borderRadius: 10, fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}
                    >
                      {a.message}
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="card" style={{ padding: '22px 24px', marginBottom: 16, position: 'relative' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink)', marginBottom: 4 }}>Ventas por hora</div>
              <div style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 700, marginBottom: 14 }}>
                Promedio por día con ventas. Horas pico resaltadas.
              </div>
              {!geometry ? (
                <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>Sin ventas en el periodo.</p>
              ) : (
                <div style={{ position: 'relative' }}>
                  <svg
                    viewBox={`0 0 ${geometry.width} ${geometry.height}`}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                    onMouseLeave={() => setHover(null)}
                  >
                    {geometry.gridLines.map((gl, i) => (
                      <g key={i}>
                        <line x1={geometry.padLeft} y1={gl.y} x2={geometry.width - 20} y2={gl.y} stroke="var(--border-soft)" strokeWidth="1" />
                        <text x={geometry.padLeft - 8} y={gl.y + 4} textAnchor="end" fontFamily="Space Mono, monospace" fontSize="11" fill="#a89e8c" fontWeight="700">
                          {gl.label}
                        </text>
                      </g>
                    ))}
                    {geometry.bars.map((b, i) => (
                      <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: 'pointer' }}>
                        <rect
                          x={b.x}
                          y={b.y}
                          width={Math.max(geometry.barWidth, 2)}
                          height={b.barHeight}
                          rx="4"
                          fill={hours[i].peak ? '#DA2C5E' : '#c9bfb0'}
                          fillOpacity={hover === i ? 1 : 0.85}
                        />
                        <text x={b.x + geometry.barWidth / 2} y={geometry.bottom + 22} textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="12" fill="#a89e8c" fontWeight="700">
                          {b.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                  {hover !== null && geometry.bars[hover] && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${(geometry.bars[hover].x + geometry.barWidth / 2) / geometry.width * 100}%`,
                        top: `${geometry.bars[hover].y / geometry.height * 100 - 6}%`,
                        transform: 'translate(-50%, -100%)',
                        background: 'var(--ink)',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                      }}
                    >
                      {geometry.bars[hover].label}: {formatCurrency(hours[hover].avgAmount)} · {hours[hover].avgOrders} ventas
                      {hours[hover].peak ? ' · pico' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink)', marginBottom: 14 }}>Productos más vendidos</div>
                {!topProducts ? (
                  <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>Cargando...</p>
                ) : topProducts.length === 0 ? (
                  <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>Sin ventas en el periodo.</p>
                ) : (
                  topProducts.map((p, i) => (
                    <div
                      key={p.productId}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border-soft-2)' }}
                    >
                      <span className="mono" style={{ width: 20, fontSize: 13, fontWeight: 700, color: 'var(--text-faint-2)' }}>{i + 1}</span>
                      <span style={{ flex: 1, fontWeight: 800, color: 'var(--ink)', fontSize: 14 }}>{p.productName}</span>
                      <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-soft)', fontWeight: 700 }}>{p.totalQuantity} und</span>
                      <span className="mono" style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 700, width: 96, textAlign: 'right' }}>
                        {formatCurrency(p.totalAmount)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink)', marginBottom: 14 }}>Ideas y recomendaciones</div>
                {!insights.hasEnoughData ? (
                  <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>Aún no hay suficientes datos para analizar.</p>
                ) : insights.recommendations.length === 0 ? (
                  <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>Sin ideas por ahora.</p>
                ) : (
                  insights.recommendations.map((r, i) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-soft-2)', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                      {r.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
