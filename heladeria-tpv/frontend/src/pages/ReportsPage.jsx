import { useEffect, useState, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { getReportSummary, getDashboardKpis, getMonthlyBarChart } from '../api/reports'
import { getOrders, anularOrder } from '../api/orders'
import { getBusinessSettings } from '../api/businessSettings'
import { useSession } from '../context/SessionContext'
import { formatCurrency } from '../utils/format'
import { categoryInfo } from '../utils/categoryColors'
import { niceAxisTicks, formatAxisLabel, buildBarGeometry } from '../utils/chartGeometry'

const METHODS = [
  { value: 'EFECTIVO', label: 'Efectivo', color: '#27A567' },
  { value: 'NEQUI', label: 'Nequi', color: '#7A4FA3' },
  { value: 'RAPPI', label: 'Rappi', color: '#E0518A' },
]

function toIsoDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getRange(preset) {
  const today = new Date()
  const from = new Date(today)
  if (preset === 'week') {
    from.setDate(today.getDate() - today.getDay())
  } else if (preset === 'month') {
    from.setDate(1)
  }
  return { from: toIsoDate(from), to: toIsoDate(today) }
}

function buildChartGeometry(dailySales) {
  const width = 900
  const height = 280
  const padLeft = 68
  const padRight = 8
  const top = 40
  const bottom = 230

  const values = dailySales.map((d) => Number(d.total))
  const rawMax = Math.max(...values, 1)
  const ticks = niceAxisTicks(rawMax, 4)
  const max = ticks[ticks.length - 1]

  const n = dailySales.length
  const step = n > 1 ? (width - padLeft - padRight) / (n - 1) : 0

  const points = dailySales.map((d, i) => {
    const x = padLeft + step * i
    const y = bottom - (Number(d.total) / max) * (bottom - top)
    const label = new Date(d.date).toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')
    return { x, y, label, value: Number(d.total), date: d.date }
  })

  const line = points.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${padLeft},${bottom} ${line} ${points[points.length - 1]?.x ?? padLeft},${bottom}`

  const gridLines = ticks.map((tick) => ({
    y: bottom - (tick / max) * (bottom - top),
    label: formatAxisLabel(tick),
    value: tick,
  }))

  return { line, area, points, width, height, padLeft, top, bottom, gridLines }
}

export default function ReportsPage() {
  const [preset, setPreset] = useState('week')
  const [customFrom, setCustomFrom] = useState(toIsoDate(new Date()))
  const [customTo, setCustomTo] = useState(toIsoDate(new Date()))
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [kpis, setKpis] = useState(null)
  const [barChart, setBarChart] = useState(null)
  const [barHover, setBarHover] = useState(null)
  const [lineHover, setLineHover] = useState(null)
  const [currentFrom, setCurrentFrom] = useState(null)
  const [currentTo, setCurrentTo] = useState(null)

  // Orders section state
  const [ordersVisible, setOrdersVisible] = useState(false)
  const [orders, setOrders] = useState(null)
  const [ordersPage, setOrdersPage] = useState(0)
  const [ordersHasMore, setOrdersHasMore] = useState(false)
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const ordersCacheKey = useRef(null)

  // Anular modal state
  const [anularTarget, setAnularTarget] = useState(null)
  const [anularMotivo, setAnularMotivo] = useState('')
  const [anularPassword, setAnularPassword] = useState('')
  const [adminPasswordSet, setAdminPasswordSet] = useState(null)
  const [showPasswordNotice, setShowPasswordNotice] = useState(false)
  const [anularLoading, setAnularLoading] = useState(false)
  const [anularError, setAnularError] = useState('')

  const { cashRegister } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    getDashboardKpis().then(setKpis).catch(() => setKpis(null))
    getMonthlyBarChart().then(setBarChart).catch(() => setBarChart(null))
    getBusinessSettings().then((s) => setAdminPasswordSet(!!s.adminPasswordSet)).catch(() => {})
  }, [])

  function openAnularModal(order) {
    if (adminPasswordSet === false) {
      setShowPasswordNotice(true)
      return
    }
    setAnularTarget(order)
    setAnularMotivo('')
    setAnularPassword('')
    setAnularError('')
  }

  async function loadReport(from, to) {
    setLoading(true)
    setError('')
    setCurrentFrom(from)
    setCurrentTo(to)
    // Invalidate orders cache when range changes
    if (ordersCacheKey.current !== `${from}_${to}`) {
      setOrders(null)
      setOrdersPage(0)
      setOrdersHasMore(false)
      ordersCacheKey.current = null
    }
    try {
      const data = await getReportSummary(from, to)
      setReport(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadOrdersPage(from, to, page) {
    setOrdersLoading(true)
    try {
      const data = await getOrders(from, to, page, 20)
      if (page === 0) {
        setOrders(data.content)
        ordersCacheKey.current = `${from}_${to}`
      } else {
        setOrders((prev) => [...prev, ...data.content])
      }
      setOrdersPage(data.number)
      setOrdersHasMore(!data.last)
      setOrdersTotal(data.totalElements)
    } catch (err) {
      setError(err.message)
    } finally {
      setOrdersLoading(false)
    }
  }

  function handleToggleOrders() {
    if (!ordersVisible) {
      setOrdersVisible(true)
      const cacheKey = `${currentFrom}_${currentTo}`
      if (ordersCacheKey.current !== cacheKey) {
        loadOrdersPage(currentFrom, currentTo, 0)
      }
    } else {
      setOrdersVisible(false)
    }
  }

  async function handleAnular() {
    if (!anularMotivo.trim() || !anularPassword || !anularTarget) return
    setAnularLoading(true)
    setAnularError('')
    try {
      await anularOrder(anularTarget.id, anularMotivo.trim(), anularPassword)
      // Refresh orders list and report
      ordersCacheKey.current = null
      setOrders(null)
      await Promise.all([
        loadOrdersPage(currentFrom, currentTo, 0),
        (async () => {
          const data = await getReportSummary(currentFrom, currentTo)
          setReport(data)
        })(),
        getDashboardKpis().then(setKpis).catch(() => {}),
        getMonthlyBarChart().then(setBarChart).catch(() => {}),
      ])
      setAnularTarget(null)
      setAnularMotivo('')
      setAnularPassword('')
    } catch (err) {
      setAnularError(err.message)
      setAnularPassword('')
    } finally {
      setAnularLoading(false)
    }
  }

  useEffect(() => {
    const { from, to } = getRange('week')
    setCurrentFrom(from)
    setCurrentTo(to)
    loadReport(from, to)
  }, [])

  function selectPreset(value) {
    setPreset(value)
    if (value !== 'custom') {
      const { from, to } = getRange(value)
      loadReport(from, to)
    }
  }

  function applyCustomRange() {
    loadReport(customFrom, customTo)
  }

  const presets = [
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
  ]

  const chart = report ? buildChartGeometry(report.dailySales) : null
  const canConfirmAnular = !!anularMotivo.trim() && !!anularPassword && !anularLoading
  const barGeometry = barChart ? buildBarGeometry(barChart) : null

  return (
    <>
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <h1 style={{ fontSize: 25, fontWeight: 900, margin: '0 0 4px' }}>Reportes</h1>
        <p style={{ fontSize: 14, color: 'var(--text-soft)', fontWeight: 700, margin: '0 0 18px' }}>
          Vista general del negocio.
        </p>

        {/* KPIs fijos, independientes del filtro de periodo de abajo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 26 }}>
          <KpiCard label="Cuadre actual" value={kpis?.currentShiftTotal} />
          <KpiCard label="Últimos 7 días" value={kpis?.last7DaysTotal} />
          <KpiCard label="Últimos 30 días" value={kpis?.last30DaysTotal} />
          <KpiCard label="Este año" value={kpis?.yearTotal} accent />
        </div>

        {/* Gráfico de barras: tendencia mensual */}
        <div className="card" style={{ padding: '22px 24px', marginBottom: 26, position: 'relative' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink)', marginBottom: 4 }}>Facturado por mes</div>
          <div style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 700, marginBottom: 14 }}>
            Últimos 6 meses
          </div>
          {barGeometry && (
            <div style={{ position: 'relative' }}>
              <svg
                viewBox={`0 0 ${barGeometry.width} ${barGeometry.height}`}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                onMouseLeave={() => setBarHover(null)}
              >
                {barGeometry.gridLines.map((gl, i) => (
                  <g key={i}>
                    <line x1={barGeometry.padLeft} y1={gl.y} x2={barGeometry.width - 20} y2={gl.y} stroke="var(--border-soft)" strokeWidth="1" />
                    <text x={barGeometry.padLeft - 8} y={gl.y + 4} textAnchor="end" fontFamily="Space Mono, monospace" fontSize="11" fill="#a89e8c" fontWeight="700">
                      {gl.label}
                    </text>
                  </g>
                ))}
                {barGeometry.bars.map((b, i) => (
                  <g key={i} onMouseEnter={() => setBarHover(i)} onMouseLeave={() => setBarHover(null)} style={{ cursor: 'pointer' }}>
                    <rect x={b.x} y={b.y} width={barGeometry.barWidth} height={b.barHeight} rx="5" fill="#DA2C5E" fillOpacity={barHover === i ? 1 : 0.85} />
                    {barHover === i && (
                      <rect x={b.x - 2} y={b.y - 2} width={barGeometry.barWidth + 4} height={b.barHeight + 4} rx="6" fill="none" stroke="#DA2C5E" strokeWidth="2" strokeOpacity="0.4" />
                    )}
                    <text x={b.x + barGeometry.barWidth / 2} y={barGeometry.bottom + 22} textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="13" fill="#a89e8c" fontWeight="700">
                      {b.label}
                    </text>
                  </g>
                ))}
              </svg>
              {barHover !== null && barGeometry.bars[barHover] && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${(barGeometry.bars[barHover].x + barGeometry.barWidth / 2) / barGeometry.width * 100}%`,
                    top: `${barGeometry.bars[barHover].y / barGeometry.height * 100 - 6}%`,
                    transform: 'translate(-50%, -100%)',
                    background: 'var(--ink)',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    boxShadow: 'var(--shadow-card, 0 2px 8px rgba(0,0,0,.12))',
                  }}
                >
                  {barGeometry.bars[barHover].label}: {formatCurrency(barGeometry.bars[barHover].value)}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)' }}>Detalle por periodo</div>
            <p style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 700, margin: '2px 0 0' }}>
              Elige un rango para ver el desglose completo.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {presets.map((p) => (
              <button
                key={p.value}
                onClick={() => selectPreset(p.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 11,
                  fontSize: 13,
                  fontWeight: 800,
                  border: preset === p.value ? 'none' : '1px solid var(--border)',
                  background: preset === p.value ? 'var(--ink)' : '#fff',
                  color: preset === p.value ? '#fff' : 'var(--text-muted)',
                }}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setPreset('custom')}
              style={{
                padding: '10px 16px',
                borderRadius: 11,
                fontSize: 13,
                fontWeight: 800,
                border: preset === 'custom' ? 'none' : '1px solid var(--border)',
                background: preset === 'custom' ? 'var(--ink)' : '#fff',
                color: preset === 'custom' ? '#fff' : 'var(--text-muted)',
              }}
            >
              Personalizado
            </button>
          </div>
        </div>

        {preset === 'custom' && (
          <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'end', marginBottom: 16, padding: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 700, color: 'var(--text-muted)' }}>Desde</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 700, color: 'var(--text-muted)' }}>Hasta</label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }} />
            </div>
            <button onClick={applyCustomRange} className="btn-ink" style={{ padding: '10px 18px' }}>
              Consultar
            </button>
          </div>
        )}

        {error && <p style={{ color: 'var(--red-text)' }}>{error}</p>}
        {loading && !report && <p style={{ color: 'var(--text-soft)' }}>Cargando...</p>}

        {report && (
          <div style={{ position: 'relative', opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s', pointerEvents: loading ? 'none' : 'auto' }}>
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Total del periodo
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
                  <span className="mono" style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)' }}>
                    {formatCurrency(report.totalAmount)}
                  </span>
                  {report.percentChangeVsPrevious != null && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 14,
                        fontWeight: 800,
                        color: report.percentChangeVsPrevious >= 0 ? 'var(--green-text)' : 'var(--red-text)',
                        background: report.percentChangeVsPrevious >= 0 ? 'var(--green-bg)' : 'var(--red-bg)',
                        padding: '4px 9px',
                        borderRadius: 8,
                      }}
                    >
                      <svg width="14" height="14">
                        <use href={report.percentChangeVsPrevious >= 0 ? '#ic-up' : '#ic-down'} />
                      </svg>
                      {Math.abs(report.percentChangeVsPrevious).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-soft)', fontWeight: 700, marginTop: 8 }}>
                  Periodo anterior: {formatCurrency(report.previousPeriodAmount)}
                </div>
              </div>
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Ventas
                </div>
                <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
                  {report.totalOrders}
                </div>
                <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-soft)', fontWeight: 700, marginTop: 8 }}>
                  Ticket prom. {formatCurrency(report.averageTicket)}
                </div>
              </div>
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Mejor día
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--ink)', marginTop: 6 }}>
                  {report.bestDay
                    ? new Date(report.bestDay.date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })
                    : 'Sin ventas'}
                </div>
                <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-soft)', fontWeight: 700, marginTop: 8 }}>
                  {report.bestDay ? formatCurrency(report.bestDay.total) : '—'}
                </div>
              </div>
            </div>

            {/* Gráfico de línea */}
            <div className="card" style={{ padding: '22px 24px', marginBottom: 16, position: 'relative' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink)', marginBottom: 4 }}>Ventas por día</div>
              <div style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 700, marginBottom: 14 }}>
                {report.dailySales.length} día(s) en el rango seleccionado
              </div>
              {chart && (
                <div style={{ position: 'relative' }}>
                  <svg
                    viewBox={`0 0 ${chart.width} ${chart.height}`}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                    onMouseLeave={() => setLineHover(null)}
                  >
                    {chart.gridLines.map((gl, i) => (
                      <g key={i}>
                        <line x1={chart.padLeft} y1={gl.y} x2={chart.width - 8} y2={gl.y} stroke={gl.value === 0 ? 'var(--border-strong-2)' : 'var(--border-soft)'} strokeWidth="1" />
                        <text x={chart.padLeft - 8} y={gl.y + 4} textAnchor="end" fontFamily="Space Mono, monospace" fontSize="11" fill="#a89e8c" fontWeight="700">
                          {gl.label}
                        </text>
                      </g>
                    ))}
                    <polygon points={chart.area} fill="#DA2C5E" fillOpacity="0.08" />
                    <polyline points={chart.line} fill="none" stroke="#DA2C5E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {chart.points.map((p, i) => (
                      <g key={i} onMouseEnter={() => setLineHover(i)} onMouseLeave={() => setLineHover(null)} style={{ cursor: 'pointer' }}>
                        <circle cx={p.x} cy={p.y} r={lineHover === i ? 8 : 5} fill={lineHover === i ? '#DA2C5E' : '#fff'} stroke="#DA2C5E" strokeWidth="3" />
                        <text x={p.x} y={chart.bottom + 25} textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="13" fill="#a89e8c" fontWeight="700">
                          {p.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                  {lineHover !== null && chart.points[lineHover] && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${chart.points[lineHover].x / chart.width * 100}%`,
                        top: `${chart.points[lineHover].y / chart.height * 100 - 6}%`,
                        transform: 'translate(-50%, -100%)',
                        background: 'var(--ink)',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        boxShadow: 'var(--shadow-card, 0 2px 8px rgba(0,0,0,.12))',
                      }}
                    >
                      {new Date(chart.points[lineHover].date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}:{' '}
                      {formatCurrency(chart.points[lineHover].value)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
              {/* Ranking */}
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink)', marginBottom: 14 }}>Productos más vendidos</div>
                {report.topProducts.length === 0 ? (
                  <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>Sin ventas en este periodo.</p>
                ) : (
                  report.topProducts.map((p, i) => {
                    const info = categoryInfo(p.category)
                    return (
                      <div
                        key={p.productId}
                        style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 0', borderBottom: '1px solid var(--border-soft-2)' }}
                      >
                        <span className="mono" style={{ width: 22, fontSize: 14, fontWeight: 700, color: 'var(--text-faint-2)' }}>
                          {i + 1}
                        </span>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: info.color, flex: 'none' }} />
                        <span style={{ flex: 1, fontWeight: 800, color: 'var(--ink)', fontSize: 14.5 }}>{p.productName}</span>
                        <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-soft)', fontWeight: 700, width: 62, textAlign: 'right' }}>
                          {p.totalQuantity} und
                        </span>
                        <span className="mono" style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 700, width: 96, textAlign: 'right' }}>
                          {formatCurrency(p.totalAmount)}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Métodos de pago */}
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink)', marginBottom: 14 }}>Por método de pago</div>
                {METHODS.map((m) => {
                  const value = Number(report.paymentBreakdown.breakdown[m.value]?.total || 0)
                  const pct = report.totalAmount > 0 ? (value / Number(report.totalAmount)) * 100 : 0
                  return (
                    <div key={m.value} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 800, color: 'var(--ink)', fontSize: 14.5 }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: m.color }} />
                          {m.label}
                        </span>
                        <span className="mono" style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>
                          {formatCurrency(value)}
                        </span>
                      </div>
                      <div style={{ height: 9, borderRadius: 5, background: 'var(--border-soft-2)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 5, width: `${pct}%`, background: m.color }} />
                      </div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 700, marginTop: 5 }}>
                        {pct.toFixed(1)}% del total
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
          </div>
        )}

        {/* Ventas del periodo — colapsada por defecto, carga perezosa */}
        <div className="card" style={{ marginTop: 16, overflow: 'hidden' }}>
          <button
            onClick={handleToggleOrders}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 22px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 900, color: 'var(--ink)',
            }}
          >
            <span>
              Ventas del periodo
              {ordersTotal > 0
                ? <span style={{ fontWeight: 700, color: 'var(--text-soft)', marginLeft: 8 }}>({ordersTotal})</span>
                : report && <span style={{ fontWeight: 700, color: 'var(--text-soft)', marginLeft: 8 }}>({report.totalOrders})</span>
              }
            </span>
            <svg width="18" height="18" style={{ color: 'var(--text-faint)', transform: ordersVisible ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
              <use href="#ic-down" />
            </svg>
          </button>

          {ordersVisible && (
            <div style={{ borderTop: '1px solid var(--border-soft)', padding: '0 22px 18px' }}>
              {ordersLoading && !orders && (
                <p style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 700, padding: '14px 0' }}>Cargando...</p>
              )}
              {orders && (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={thStyle}>#</th>
                          <th style={thStyle}>Fecha</th>
                          <th style={thStyle}>Mesa</th>
                          <th style={thStyle}>Cajero</th>
                          <th style={thStyle}>Método</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                          <th style={thStyle}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => {
                          const voided = order.status === 'ANULADO'
                          const canAnular = !voided && cashRegister && order.cashRegisterId === cashRegister.id
                          return (
                            <Fragment key={order.id}>
                            <tr
                              style={{
                                borderBottom: voided ? 'none' : '1px solid var(--border-soft-2)',
                                opacity: voided ? 0.5 : 1,
                              }}
                            >
                              <td style={tdStyle} className="mono">
                                {order.id}
                                {voided && (
                                  <span style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--red-text)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                                    Anulada
                                  </span>
                                )}
                              </td>
                              <td style={tdStyle} className="mono">
                                {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}{' '}
                                {new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
                              </td>
                              <td style={{ ...tdStyle, textDecoration: voided ? 'line-through' : 'none' }}>{order.tableName || '—'}</td>
                              <td style={{ ...tdStyle, textDecoration: voided ? 'line-through' : 'none' }}>{order.userName}</td>
                              <td style={tdStyle}>
                                <span style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 700 }}>
                                  {order.paymentMethod}
                                </span>
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, textDecoration: voided ? 'line-through' : 'none' }} className="mono">
                                {formatCurrency(order.total)}
                              </td>
                              <td style={{ ...tdStyle, display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}>
                                <button
                                  title="Reimprimir recibo"
                                  onClick={() => window.open(`#/recibo-venta/${order.id}`, '_blank', 'width=420,height=720')}
                                  style={iconBtnStyle}
                                >
                                  <svg width="14" height="14"><use href="#ic-print" /></svg>
                                </button>
                                {canAnular && (
                                  <button
                                    title="Anular venta"
                                    onClick={() => openAnularModal(order)}
                                    style={{ ...iconBtnStyle, color: 'var(--red-text)' }}
                                  >
                                    <svg width="14" height="14"><use href="#ic-x" /></svg>
                                  </button>
                                )}
                              </td>
                            </tr>
                            {voided && (
                              <tr style={{ borderBottom: '1px solid var(--border-soft-2)' }}>
                                <td colSpan={7} style={{ padding: '0 8px 7px', fontSize: 11, color: 'var(--text-soft)', fontWeight: 700 }}>
                                  Motivo: {order.motivoAnulacion || '—'}
                                  {order.anuladaEn && (
                                    <> · Anulada el{' '}
                                      {new Date(order.anuladaEn).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}{' '}
                                      {new Date(order.anuladaEn).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
                                    </>
                                  )}
                                  {order.anuladaPor && <> · Cajero: {order.anuladaPor}</>}
                                </td>
                              </tr>
                            )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {ordersHasMore && (
                    <button
                      onClick={() => loadOrdersPage(currentFrom, currentTo, ordersPage + 1)}
                      disabled={ordersLoading}
                      style={{
                        marginTop: 12, background: 'var(--tile-bg)', border: 'none', padding: '8px 18px',
                        borderRadius: 9, fontSize: 12, fontWeight: 800, color: 'var(--ink)', cursor: 'pointer',
                      }}
                    >
                      {ordersLoading ? 'Cargando...' : 'Ver más'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Modal de anulación */}
    {anularTarget && (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: '28px 32px', width: 420, boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)', marginBottom: 6 }}>
            Anular venta #{anularTarget.id}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 700, margin: '0 0 18px' }}>
            {formatCurrency(anularTarget.total)} · {anularTarget.tableName || 'Sin mesa'} · {anularTarget.paymentMethod}
          </p>
          <div style={{ padding: '12px 16px', background: '#fef2f2', borderRadius: 10, marginBottom: 18, fontSize: 13, fontWeight: 700, color: '#991b1b' }}>
            Esta venta no se borrará — quedará marcada como anulada para auditoría. Esta acción no se puede deshacer.
          </div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
            Motivo de anulación *
          </label>
          <textarea
            value={anularMotivo}
            onChange={(e) => setAnularMotivo(e.target.value)}
            placeholder="Ej: Se cobró por error, cliente no recibió el producto..."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10,
              fontSize: 13, fontWeight: 700, color: 'var(--ink)', resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', margin: '14px 0 6px' }}>
            Contraseña de administrador *
          </label>
          <input
            type="password"
            value={anularPassword}
            onChange={(e) => setAnularPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAnular() }}
            autoComplete="off"
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10,
              fontSize: 13, fontWeight: 700, color: 'var(--ink)', boxSizing: 'border-box',
            }}
          />
          {anularError && <p style={{ color: 'var(--red-text)', fontSize: 13, marginTop: 8 }}>{anularError}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button
              onClick={() => setAnularTarget(null)}
              style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleAnular}
              disabled={!canConfirmAnular}
              style={{
                flex: 1, padding: '11px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 800,
                cursor: canConfirmAnular ? 'pointer' : 'not-allowed',
                background: canConfirmAnular ? '#dc2626' : 'var(--border)',
                color: canConfirmAnular ? '#fff' : 'var(--text-faint)',
              }}
            >
              {anularLoading ? 'Anulando...' : 'Confirmar anulación'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Aviso: falta configurar la contraseña de administrador */}
    {showPasswordNotice && (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: '28px 32px', width: 420, boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)', marginBottom: 8 }}>
            Falta la contraseña de administrador
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 700, margin: '0 0 18px' }}>
            Para anular ventas primero configura la contraseña de administrador en Configuración.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowPasswordNotice(false)}
              style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
            >
              Cerrar
            </button>
            <button onClick={() => navigate('/configuracion')} className="btn-ink" style={{ flex: 1, padding: '11px', fontSize: 14 }}>
              Ir a Configuración
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

const thStyle = { padding: '6px 8px', textAlign: 'left', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', fontSize: 10 }
const tdStyle = { padding: '7px 8px', color: 'var(--ink)', fontSize: 12 }
const iconBtnStyle = { background: 'var(--tile-bg)', border: 'none', width: 28, height: 28, borderRadius: 7, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink)' }

function KpiCard({ label, value, accent }) {
  return (
    <div className="card" style={{ padding: '18px 20px', background: accent ? 'var(--ink)' : '#fff' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: accent ? '#bdb2a3' : 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: accent ? '#fff' : 'var(--ink)', marginTop: 6 }}>
        {value != null ? formatCurrency(value) : '—'}
      </div>
    </div>
  )
}
