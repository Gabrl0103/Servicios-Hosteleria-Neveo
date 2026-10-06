import { useEffect, useState } from 'react'
import { getInsights } from '../api/insights'
import { getReportSummary } from '../api/reports'
import { useSession } from '../context/SessionContext'
import { formatCurrency } from '../utils/format'
import { buildBarGeometry } from '../utils/chartGeometry'
import { Card, Notice } from '../components/ui'
import CategoryIcon from '../components/CategoryIcon'
import '../styles/data-viz.css'
import './AnalyticsPage.css'

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
    <div className="analytics-page">
      <div className="analytics-page__inner">
        <header className="analytics-page__header">
          <h1 className="ui-page-title">Análisis</h1>
          <p className="analytics-page__subtitle">Calculado con las ventas de los últimos 30 días (sin contar hoy).</p>
        </header>

        {error && <Notice variant="danger">{error}</Notice>}
        {!insights && !error && <p className="analytics-page__muted">Cargando...</p>}

        {insights && (
          <>
            {!insights.hasEnoughData ? (
              <Card className="report-card analytics-empty">
                <span className="analytics-empty__icon" aria-hidden="true">
                  <svg width="22" height="22"><use href="#ic-chart" /></svg>
                </span>
                <div>
                  <h2 className="report-card__title">Aún no hay suficientes datos para analizar</h2>
                  <p className="analytics-page__muted">
                    Se necesitan al menos 14 días con ventas en el último mes (hay {insights.daysWithSales}).
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="report-card">
                <h2 className="report-card__title">Alertas</h2>
                <div className="report-card__body alert-list">
                  {insights.alerts.length === 0 ? (
                    <Notice variant="success" icon={<svg aria-hidden="true"><use href="#ic-check" /></svg>}>Todo en orden</Notice>
                  ) : (
                    insights.alerts.map((a, i) => (
                      <Notice key={i} variant="warning" icon={<span className="alert-list__dot" />}>
                        {a.message}
                      </Notice>
                    ))
                  )}
                </div>
              </Card>
            )}

            <Card className="report-card">
              <h2 className="report-card__title">Ventas por hora</h2>
              <div className="report-card__subtitle">
                Promedio por día con ventas. Horas pico resaltadas.
                {geometry && (
                  <span className="hours-legend">
                    <span className="hours-legend__item"><span className="hours-legend__swatch hours-legend__swatch--peak" />Pico</span>
                    <span className="hours-legend__item"><span className="hours-legend__swatch" />Resto</span>
                  </span>
                )}
              </div>
              {!geometry ? (
                <p className="analytics-page__muted">Sin ventas en el periodo.</p>
              ) : (
                <div className="chart">
                  <svg
                    viewBox={`0 0 ${geometry.width} ${geometry.height}`}
                    className="chart__svg"
                    onMouseLeave={() => setHover(null)}
                  >
                    {geometry.gridLines.map((gl, i) => (
                      <g key={i}>
                        <line x1={geometry.padLeft} y1={gl.y} x2={geometry.width - 20} y2={gl.y} stroke="var(--color-border)" strokeWidth="1" />
                        <text x={geometry.padLeft - 8} y={gl.y + 4} textAnchor="end" className="chart__axis" fontSize="11">
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
                          rx="5"
                          fill={hours[i].peak ? 'var(--color-primary)' : 'var(--color-primary-border)'}
                          fillOpacity={hover === i ? 1 : 0.88}
                        />
                        <text x={b.x + geometry.barWidth / 2} y={geometry.bottom + 22} textAnchor="middle" className="chart__axis" fontSize="12">
                          {b.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                  {hover !== null && geometry.bars[hover] && (
                    <div
                      className="chart__tooltip"
                      style={{
                        left: `${(geometry.bars[hover].x + geometry.barWidth / 2) / geometry.width * 100}%`,
                        top: `${geometry.bars[hover].y / geometry.height * 100 - 6}%`,
                      }}
                    >
                      {geometry.bars[hover].label}: {formatCurrency(hours[hover].avgAmount)} · {hours[hover].avgOrders} ventas
                      {hours[hover].peak ? ' · pico' : ''}
                    </div>
                  )}
                </div>
              )}
            </Card>

            <div className="analytics-columns">
              <Card className="report-card">
                <h2 className="report-card__title">Productos más vendidos</h2>
                <div className="report-card__body">
                  {!topProducts ? (
                    <p className="analytics-page__muted">Cargando...</p>
                  ) : topProducts.length === 0 ? (
                    <p className="analytics-page__muted">Sin ventas en el periodo.</p>
                  ) : (
                    <div className="ranking">
                      {topProducts.map((p, i) => (
                        <div key={p.productId} className="ranking__row">
                          <span className="ranking__pos">{i + 1}</span>
                          <CategoryIcon category={p.category} size={30} />
                          <span className="ranking__name">{p.productName}</span>
                          <span className="ranking__qty">{p.totalQuantity} und</span>
                          <span className="ranking__total">{formatCurrency(p.totalAmount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="report-card">
                <h2 className="report-card__title">Ideas y recomendaciones</h2>
                <div className="report-card__body">
                  {!insights.hasEnoughData ? (
                    <p className="analytics-page__muted">Aún no hay suficientes datos para analizar.</p>
                  ) : insights.recommendations.length === 0 ? (
                    <p className="analytics-page__muted">Sin ideas por ahora.</p>
                  ) : (
                    <div className="ideas">
                      {insights.recommendations.map((r, i) => (
                        <div key={i} className="ideas__row">
                          <span className="ideas__icon" aria-hidden="true">
                            <svg width="18" height="18"><use href="#ic-bulb" /></svg>
                          </span>
                          <span>{r.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
