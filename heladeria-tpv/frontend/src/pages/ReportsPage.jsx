import { useEffect, useState, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { getReportSummary, getDashboardKpis, getMonthlyBarChart } from '../api/reports'
import { getOrders, anularOrder } from '../api/orders'
import { getBusinessSettings } from '../api/businessSettings'
import { useSession } from '../context/SessionContext'
import { formatCurrency } from '../utils/format'
import { parseLocalDate } from '../utils/time'
import { Button, Card, Chip, Field, Input, Modal, Notice } from '../components/ui'
import CategoryIcon from '../components/CategoryIcon'
import { niceAxisTicks, formatAxisLabel, buildBarGeometry } from '../utils/chartGeometry'
import '../styles/data-viz.css'
import './ReportsPage.css'

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
    const label = parseLocalDate(d.date).toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')
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
  // Foco inicial del modal de anulacion: el motivo.
  const anularMotivoRef = useRef(null)

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
    <div className="reports-page">
      <div className="reports-page__inner">
        <header className="reports-page__header">
          <h1 className="ui-page-title">Reportes</h1>
          <p className="reports-page__subtitle">Vista general del negocio.</p>
        </header>

        {/* KPIs fijos, independientes del filtro de periodo de abajo */}
        <div className="kpi-grid">
          <KpiCard label="Cuadre actual" value={kpis?.currentShiftTotal} />
          <KpiCard label="Últimos 7 días" value={kpis?.last7DaysTotal} />
          <KpiCard label="Últimos 30 días" value={kpis?.last30DaysTotal} />
          <KpiCard label="Este año" value={kpis?.yearTotal} accent />
        </div>

        {/* Gráfico de barras: tendencia mensual */}
        <Card className="report-card">
          <h2 className="report-card__title">Facturado por mes</h2>
          <div className="report-card__subtitle">Últimos 6 meses</div>
          {barGeometry && (
            <div className="chart">
              <svg
                viewBox={`0 0 ${barGeometry.width} ${barGeometry.height}`}
                className="chart__svg"
                onMouseLeave={() => setBarHover(null)}
              >
                {barGeometry.gridLines.map((gl, i) => (
                  <g key={i}>
                    <line x1={barGeometry.padLeft} y1={gl.y} x2={barGeometry.width - 20} y2={gl.y} stroke="var(--color-border)" strokeWidth="1" />
                    <text x={barGeometry.padLeft - 8} y={gl.y + 4} textAnchor="end" className="chart__axis" fontSize="11">
                      {gl.label}
                    </text>
                  </g>
                ))}
                {barGeometry.bars.map((b, i) => (
                  <g key={i} onMouseEnter={() => setBarHover(i)} onMouseLeave={() => setBarHover(null)} style={{ cursor: 'pointer' }}>
                    <rect x={b.x} y={b.y} width={barGeometry.barWidth} height={b.barHeight} rx="6" fill="var(--color-primary)" fillOpacity={barHover === i ? 1 : 0.82} />
                    {barHover === i && (
                      <rect x={b.x - 2} y={b.y - 2} width={barGeometry.barWidth + 4} height={b.barHeight + 4} rx="7" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeOpacity="0.35" />
                    )}
                    <text x={b.x + barGeometry.barWidth / 2} y={barGeometry.bottom + 22} textAnchor="middle" className="chart__axis" fontSize="13">
                      {b.label}
                    </text>
                  </g>
                ))}
              </svg>
              {barHover !== null && barGeometry.bars[barHover] && (
                <div
                  className="chart__tooltip"
                  style={{
                    left: `${(barGeometry.bars[barHover].x + barGeometry.barWidth / 2) / barGeometry.width * 100}%`,
                    top: `${barGeometry.bars[barHover].y / barGeometry.height * 100 - 6}%`,
                  }}
                >
                  {barGeometry.bars[barHover].label}: {formatCurrency(barGeometry.bars[barHover].value)}
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="period-bar">
          <div>
            <h2 className="period-bar__title">Detalle por periodo</h2>
            <p className="period-bar__subtitle">Elige un rango para ver el desglose completo.</p>
          </div>
          <div className="segmented" role="group" aria-label="Periodo">
            {presets.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => selectPreset(p.value)}
                className={`segmented__option ${preset === p.value ? 'segmented__option--active' : ''}`}
                aria-pressed={preset === p.value}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPreset('custom')}
              className={`segmented__option ${preset === 'custom' ? 'segmented__option--active' : ''}`}
              aria-pressed={preset === 'custom'}
            >
              Personalizado
            </button>
          </div>
        </div>

        {preset === 'custom' && (
          <Card className="custom-range">
            <Field label="Desde">
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </Field>
            <Field label="Hasta">
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </Field>
            <Button onClick={applyCustomRange}>Consultar</Button>
          </Card>
        )}

        {error && <Notice variant="danger">{error}</Notice>}
        {loading && !report && <p className="reports-page__muted">Cargando...</p>}

        {report && (
          <div className={`period-report ${loading ? 'period-report--loading' : ''}`}>
            {/* KPIs del periodo */}
            <div className="period-kpis">
              <Card className="period-kpi">
                <div className="report-label">Total del periodo</div>
                <div className="period-kpi__row">
                  <span className="period-kpi__value">{formatCurrency(report.totalAmount)}</span>
                  {report.percentChangeVsPrevious != null && (
                    <Chip variant={report.percentChangeVsPrevious >= 0 ? 'success' : 'danger'}>
                      <svg width="14" height="14" aria-hidden="true">
                        <use href={report.percentChangeVsPrevious >= 0 ? '#ic-up' : '#ic-down'} />
                      </svg>
                      <span className="ui-num">{Math.abs(report.percentChangeVsPrevious).toFixed(1)}%</span>
                    </Chip>
                  )}
                </div>
                <div className="period-kpi__note">Periodo anterior: {formatCurrency(report.previousPeriodAmount)}</div>
              </Card>
              <Card className="period-kpi">
                <div className="report-label">Ventas</div>
                <div className="period-kpi__value">{report.totalOrders}</div>
                <div className="period-kpi__note">Ticket prom. {formatCurrency(report.averageTicket)}</div>
              </Card>
              <Card className="period-kpi">
                <div className="report-label">Mejor día</div>
                <div className="period-kpi__day">
                  {report.bestDay
                    ? parseLocalDate(report.bestDay.date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })
                    : 'Sin ventas'}
                </div>
                <div className="period-kpi__note">{report.bestDay ? formatCurrency(report.bestDay.total) : '—'}</div>
              </Card>
            </div>

            {/* Gráfico de línea */}
            <Card className="report-card">
              <h2 className="report-card__title">Ventas por día</h2>
              <div className="report-card__subtitle">{report.dailySales.length} día(s) en el rango seleccionado</div>
              {chart && (
                <div className="chart">
                  <svg
                    viewBox={`0 0 ${chart.width} ${chart.height}`}
                    className="chart__svg"
                    onMouseLeave={() => setLineHover(null)}
                  >
                    {chart.gridLines.map((gl, i) => (
                      <g key={i}>
                        <line x1={chart.padLeft} y1={gl.y} x2={chart.width - 8} y2={gl.y} stroke={gl.value === 0 ? 'var(--color-border-strong)' : 'var(--color-border)'} strokeWidth="1" />
                        <text x={chart.padLeft - 8} y={gl.y + 4} textAnchor="end" className="chart__axis" fontSize="11">
                          {gl.label}
                        </text>
                      </g>
                    ))}
                    <polygon points={chart.area} fill="var(--color-primary)" fillOpacity="0.08" />
                    <polyline points={chart.line} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {chart.points.map((p, i) => (
                      <g key={i} onMouseEnter={() => setLineHover(i)} onMouseLeave={() => setLineHover(null)} style={{ cursor: 'pointer' }}>
                        <circle cx={p.x} cy={p.y} r={lineHover === i ? 8 : 5} fill={lineHover === i ? 'var(--color-primary)' : '#fff'} stroke="var(--color-primary)" strokeWidth="3" />
                        <text x={p.x} y={chart.bottom + 25} textAnchor="middle" className="chart__axis" fontSize="13">
                          {p.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                  {lineHover !== null && chart.points[lineHover] && (
                    <div
                      className="chart__tooltip"
                      style={{
                        left: `${chart.points[lineHover].x / chart.width * 100}%`,
                        top: `${chart.points[lineHover].y / chart.height * 100 - 6}%`,
                      }}
                    >
                      {parseLocalDate(chart.points[lineHover].date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}:{' '}
                      {formatCurrency(chart.points[lineHover].value)}
                    </div>
                  )}
                </div>
              )}
            </Card>

            <div className="report-columns">
              {/* Ranking */}
              <Card className="report-card">
                <h2 className="report-card__title">Productos más vendidos</h2>
                {report.topProducts.length === 0 ? (
                  <p className="reports-page__muted">Sin ventas en este periodo.</p>
                ) : (
                  <div className="ranking">
                    {report.topProducts.map((p, i) => (
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
              </Card>

              {/* Métodos de pago */}
              <Card className="report-card">
                <h2 className="report-card__title">Por método de pago</h2>
                <div className="methods">
                  {METHODS.map((m) => {
                    const value = Number(report.paymentBreakdown.breakdown[m.value]?.total || 0)
                    const pct = report.totalAmount > 0 ? (value / Number(report.totalAmount)) * 100 : 0
                    return (
                      <div key={m.value} className="methods__row">
                        <div className="methods__head">
                          <span className="methods__name">
                            <span className="methods__dot" style={{ background: m.color }} />
                            {m.label}
                          </span>
                          <span className="methods__value">{formatCurrency(value)}</span>
                        </div>
                        <div className="methods__track">
                          <div className="methods__fill" style={{ width: `${pct}%`, background: m.color }} />
                        </div>
                        <div className="methods__pct">{pct.toFixed(1)}% del total</div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Ventas del periodo — colapsada por defecto, carga perezosa */}
        <Card className="orders-card">
          <button type="button" className="orders-card__toggle" onClick={handleToggleOrders} aria-expanded={ordersVisible}>
            <span className="orders-card__title">
              Ventas del periodo
              {ordersTotal > 0
                ? <span className="orders-card__count">({ordersTotal})</span>
                : report && <span className="orders-card__count">({report.totalOrders})</span>
              }
            </span>
            <svg width="20" height="20" aria-hidden="true" className={`orders-card__chevron ${ordersVisible ? 'orders-card__chevron--open' : ''}`}>
              <use href="#ic-down" />
            </svg>
          </button>

          {ordersVisible && (
            <div className="orders-card__body">
              {ordersLoading && !orders && <p className="reports-page__muted">Cargando...</p>}
              {orders && (
                <>
                  <div className="orders-table-wrap">
                    <table className="ui-table orders-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Fecha</th>
                          <th>Mesa</th>
                          <th>Cajero</th>
                          <th>Método</th>
                          <th className="ui-table__num">Total</th>
                          <th aria-label="Acciones"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => {
                          const voided = order.status === 'ANULADO'
                          const canAnular = !voided && cashRegister && order.cashRegisterId === cashRegister.id
                          return (
                            <Fragment key={order.id}>
                            <tr className={voided ? 'orders-table__row--voided' : undefined}>
                              <td className="ui-num">
                                {order.id}
                                {voided && <Chip variant="danger" className="orders-table__badge">Anulada</Chip>}
                              </td>
                              <td className="ui-num orders-table__date">
                                {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}{' '}
                                {new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
                              </td>
                              <td className="orders-table__strike">{order.tableName || '—'}</td>
                              <td className="orders-table__strike">{order.userName}</td>
                              <td className="orders-table__method">{order.paymentMethod}</td>
                              <td className="ui-table__num orders-table__total orders-table__strike">{formatCurrency(order.total)}</td>
                              <td className="orders-table__actions">
                                <button
                                  type="button"
                                  title="Reimprimir recibo"
                                  aria-label={`Reimprimir recibo de la venta ${order.id}`}
                                  onClick={() => window.open(`#/recibo-venta/${order.id}`, '_blank', 'width=420,height=720')}
                                  className="icon-btn"
                                >
                                  <svg width="16" height="16" aria-hidden="true"><use href="#ic-print" /></svg>
                                </button>
                                {canAnular && (
                                  <button
                                    type="button"
                                    title="Anular venta"
                                    aria-label={`Anular venta ${order.id}`}
                                    onClick={() => openAnularModal(order)}
                                    className="icon-btn icon-btn--danger"
                                  >
                                    <svg width="15" height="15" aria-hidden="true"><use href="#ic-x" /></svg>
                                  </button>
                                )}
                              </td>
                            </tr>
                            {voided && (
                              <tr className="orders-table__void-info">
                                <td colSpan={7}>
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
                    <Button
                      variant="neutral"
                      size="sm"
                      className="orders-card__more"
                      onClick={() => loadOrdersPage(currentFrom, currentTo, ordersPage + 1)}
                      disabled={ordersLoading}
                    >
                      {ordersLoading ? 'Cargando...' : 'Ver más'}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>

    {/* Modal de anulación */}
    {anularTarget && (
      <Modal
        title={`Anular venta #${anularTarget.id}`}
        subtitle={`${formatCurrency(anularTarget.total)} · ${anularTarget.tableName || 'Sin mesa'} · ${anularTarget.paymentMethod}`}
        closeButton
        width={460}
        onClose={() => setAnularTarget(null)}
        dismissible={!anularLoading}
        initialFocusRef={anularMotivoRef}
        footer={(
          <>
            <Button variant="neutral" onClick={() => setAnularTarget(null)} disabled={anularLoading}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleAnular} disabled={!canConfirmAnular} aria-busy={anularLoading}>
              {anularLoading ? 'Anulando...' : 'Confirmar anulación'}
            </Button>
          </>
        )}
      >
        <div className="void-form">
          <Notice variant="danger">
            Esta venta no se borrará — quedará marcada como anulada para auditoría. Esta acción no se puede deshacer.
          </Notice>
          <Field label="Motivo de anulación *">
            <textarea
              ref={anularMotivoRef}
              className="ui-input"
              value={anularMotivo}
              onChange={(e) => setAnularMotivo(e.target.value)}
              placeholder="Ej: Se cobró por error, cliente no recibió el producto..."
              rows={3}
            />
          </Field>
          <Field label="Contraseña de administrador *">
            <Input
              type="password"
              value={anularPassword}
              onChange={(e) => setAnularPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAnular() }}
              autoComplete="off"
            />
          </Field>
          {anularError && <Notice variant="danger">{anularError}</Notice>}
        </div>
      </Modal>
    )}

    {/* Aviso: falta configurar la contraseña de administrador */}
    {showPasswordNotice && (
      <Modal
        title="Falta la contraseña de administrador"
        closeButton
        width={440}
        onClose={() => setShowPasswordNotice(false)}
        footer={(
          <>
            <Button variant="neutral" onClick={() => setShowPasswordNotice(false)}>Cerrar</Button>
            <Button onClick={() => navigate('/configuracion')}>Ir a Configuración</Button>
          </>
        )}
      >
        <p className="reports-page__muted">
          Para anular ventas primero configura la contraseña de administrador en Configuración.
        </p>
      </Modal>
    )}
    </>
  )
}

function KpiCard({ label, value, accent }) {
  return (
    <Card className={`kpi-card ${accent ? 'kpi-card--accent' : ''}`}>
      <div className="report-label">{label}</div>
      <div className="kpi-card__value">{value != null ? formatCurrency(value) : '—'}</div>
    </Card>
  )
}
