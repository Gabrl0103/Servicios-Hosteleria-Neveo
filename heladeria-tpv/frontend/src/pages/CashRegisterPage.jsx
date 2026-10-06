import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { openCashRegister, closeCashRegister } from '../api/cashRegisters'
import { getCashiers } from '../api/cashiers'
import { getShiftReport, getExpectedCash } from '../api/reports'
import { getExpenses, createExpense, deleteExpense } from '../api/expenses'
import { formatCurrency } from '../utils/format'
import { Button, Card, Modal, Notice } from '../components/ui'
import './CashRegisterPage.css'

const METHODS = [
  { value: 'EFECTIVO', label: 'Efectivo', color: '#27A567' },
  { value: 'NEQUI', label: 'Nequi', color: '#7A4FA3' },
  { value: 'RAPPI', label: 'Rappi', color: '#E0518A' },
]

export default function CashRegisterPage() {
  const { user, cashRegister, refreshCashRegister, remote } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const navigate = useNavigate()

  const [showOpenPanel, setShowOpenPanel] = useState(false)
  const [cashiers, setCashiers] = useState(null)
  const [selectedCashier, setSelectedCashier] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('')
  const [expectedCashData, setExpectedCashData] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [expDesc, setExpDesc] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expLoading, setExpLoading] = useState(false)

  // Confirmacion al cerrar el turno (Especificacion 13).
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [closeSummary, setCloseSummary] = useState(null)
  const [summaryError, setSummaryError] = useState('')
  const [closeError, setCloseError] = useState('')
  const closingRef = useRef(false)
  const cancelCloseRef = useRef(null)

  function refreshExpenseData() {
    getExpenses(cashRegister.id).then(setExpenses).catch(() => setExpenses([]))
    getExpectedCash(cashRegister.id).then(setExpectedCashData).catch(() => setExpectedCashData(null))
  }

  useEffect(() => {
    if (cashRegister) {
      getShiftReport(cashRegister.id).then(setReport).catch(() => setReport(null))
      getExpectedCash(cashRegister.id).then(setExpectedCashData).catch(() => setExpectedCashData(null))
      getExpenses(cashRegister.id).then(setExpenses).catch(() => setExpenses([]))
    }
  }, [cashRegister])

  function handleOpenClick() {
    setShowOpenPanel(true)
    setSelectedCashier(null)
    setConfirmed(false)
    getCashiers().then(setCashiers).catch(() => setCashiers([]))
  }

  async function handleConfirmOpen() {
    setLoading(true)
    setError('')
    try {
      const amount = openingAmount ? Number(openingAmount) : null
      await openCashRegister(user.id, selectedCashier.name, amount)
      await refreshCashRegister()
      navigate('/mesas')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // "Cerrar turno" ya no cierra: abre la confirmacion con el resumen del
  // turno, tomado del mismo endpoint que el "Resumen en vivo por metodo".
  function openCloseConfirm() {
    setCloseSummary(null)
    setSummaryError('')
    setCloseError('')
    setShowCloseConfirm(true)
    getShiftReport(cashRegister.id)
      .then(setCloseSummary)
      .catch((err) => setSummaryError(`No se pudo cargar el resumen del turno: ${err.message}`))
  }

  function cancelClose() {
    if (closingRef.current) return
    setShowCloseConfirm(false)
  }

  // Cierre de siempre; solo se ejecuta desde "Confirmar cierre". Si falla, el
  // error se muestra dentro del modal y el turno sigue abierto.
  async function handleClose() {
    if (closingRef.current) return
    closingRef.current = true
    setLoading(true)
    setCloseError('')
    try {
      await closeCashRegister(cashRegister.id)
      await refreshCashRegister()
      setShowCloseConfirm(false)
    } catch (err) {
      setCloseError(err.message)
    } finally {
      closingRef.current = false
      setLoading(false)
    }
  }

  const canOpen = selectedCashier && confirmed

  return (
    <div className="shift-page">
      <div className="shift-page__inner">
        <header className="shift-page__header">
          <h1 className="ui-page-title">Turno de hoy</h1>
          <p className="shift-page__subtitle">Controla la apertura y el cierre de la caja del día.</p>
        </header>

        {error && <Notice variant="danger">{error}</Notice>}

        {!cashRegister ? (
          !showOpenPanel ? (
            <Card className="shift-empty">
              <p className="shift-empty__text">No hay un turno abierto en este momento.</p>
              <Button size="lg" onClick={handleOpenClick} disabled={loading}>
                Abrir turno
              </Button>
            </Card>
          ) : (
            <Card className="shift-open">
              <h2 className="shift-open__title">Abrir turno</h2>
              <p className="shift-open__subtitle">Selecciona quién atenderá la caja y confirma la apertura.</p>

              {cashiers === null ? (
                <p className="shift-open__muted">Cargando cajeros...</p>
              ) : cashiers.length === 0 ? (
                <div className="shift-open__none">
                  <p className="shift-open__muted">No hay cajeros configurados.</p>
                  <Button onClick={() => navigate('/configuracion')}>Ir a Configuración</Button>
                </div>
              ) : (
                <>
                  <div className="shift-label">Cajero</div>
                  <div className="cashier-options">
                    {cashiers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCashier(c)}
                        className={`cashier-option ${selectedCashier?.id === c.id ? 'cashier-option--active' : ''}`}
                        aria-pressed={selectedCashier?.id === c.id}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>

                  <label className="ui-field shift-open__amount">
                    <span className="shift-label">
                      Valor inicial de caja <span className="shift-label__hint">(opcional)</span>
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={openingAmount}
                      onChange={(e) => setOpeningAmount(e.target.value)}
                      placeholder="$0"
                      className="ui-input ui-num"
                    />
                  </label>

                  <div className="shift-confirm">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={confirmed}
                      aria-label="Confirmo la apertura del turno"
                      onClick={() => setConfirmed(!confirmed)}
                      className={`ui-switch ${confirmed ? 'ui-switch--on' : ''}`}
                    >
                      <span className="ui-switch__knob" />
                    </button>
                    <span className={`shift-confirm__text ${confirmed ? 'shift-confirm__text--on' : ''}`}>
                      Confirmo la apertura del turno
                    </span>
                  </div>

                  <div className="shift-open__actions">
                    <Button size="lg" onClick={handleConfirmOpen} disabled={!canOpen || loading}>
                      {loading ? 'Abriendo...' : 'Abrir turno'}
                    </Button>
                    <Button size="lg" variant="neutral" onClick={() => setShowOpenPanel(false)}>
                      Cancelar
                    </Button>
                  </div>
                </>
              )}
            </Card>
          )
        ) : (
          <>
            <Card className="shift-status">
              <span className="shift-status__icon"><span /></span>
              <div className="shift-status__text">
                <div className="shift-status__overline">Turno abierto</div>
                <div className="shift-status__title">Caja 01 · en curso</div>
                <div className="shift-status__meta">
                  Inicio {new Date(cashRegister.openedAt).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
                  {' · '}
                  {new Date(cashRegister.openedAt).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {report ? ` · ${report.totalOrders} ventas` : ''}
                </div>
              </div>
              <div className="shift-status__total">
                <div className="shift-label">Acumulado</div>
                <div className="shift-status__amount">{report ? formatCurrency(report.totalAmount) : '—'}</div>
              </div>
            </Card>

            <div className="shift-grid">
              <div className="shift-grid__main">
                <div className="shift-label">Resumen en vivo por método</div>
                <div className="method-tiles">
                  {METHODS.map((m) => (
                    <Card key={m.value} className="method-tile">
                      <div className="method-tile__head">
                        <span className="method-tile__dot" style={{ background: m.color }} />
                        {m.label}
                      </div>
                      <div className="method-tile__amount">{formatCurrency(report?.breakdown[m.value]?.total || 0)}</div>
                      <div className="method-tile__count">{report?.breakdown[m.value]?.orderCount || 0} ventas</div>
                    </Card>
                  ))}
                  <div className="method-tile method-tile--total">
                    <div className="method-tile__head">Total</div>
                    <div className="method-tile__amount">{formatCurrency(report?.totalAmount || 0)}</div>
                    <div className="method-tile__count">{report?.totalOrders || 0} ventas</div>
                  </div>
                </div>

                {expectedCashData && (
                  <div className="expected-cash">
                    <div className="expected-cash__label">Esperado en caja</div>
                    <div className="expected-cash__amount">{formatCurrency(expectedCashData.expectedCash)}</div>
                    <div className="expected-cash__detail">
                      Caja inicial: {formatCurrency(expectedCashData.openingAmount)} + Efectivo: {formatCurrency(expectedCashData.cashSales)}
                      {expectedCashData.totalExpenses > 0 && ` − Gastos: ${formatCurrency(expectedCashData.totalExpenses)}`}
                    </div>
                  </div>
                )}
              </div>

              <Card className="expenses">
                <div className="shift-label">Gastos del turno</div>
                <div className="expenses__form">
                  <input
                    type="text"
                    placeholder="Descripción"
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    className="ui-input"
                    aria-label="Descripción del gasto"
                  />
                  <div className="expenses__row">
                    <input
                      type="number"
                      min="0"
                      placeholder="$0"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="ui-input ui-num"
                      aria-label="Monto del gasto"
                    />
                    <Button
                      variant="secondary"
                      disabled={!expDesc.trim() || !expAmount || Number(expAmount) <= 0 || expLoading}
                      onClick={async () => {
                        setExpLoading(true)
                        try {
                          await createExpense(cashRegister.id, expDesc.trim(), Number(expAmount))
                          setExpDesc('')
                          setExpAmount('')
                          refreshExpenseData()
                        } catch (err) {
                          setError(err.message)
                        } finally {
                          setExpLoading(false)
                        }
                      }}
                    >
                      Agregar gasto
                    </Button>
                  </div>
                </div>

                {expenses.length > 0 && (
                  <>
                    <div className="expenses__list">
                      {expenses.map((exp) => (
                        <div key={exp.id} className="expenses__item">
                          <span className="expenses__desc">{exp.description}</span>
                          <span className="expenses__amount">{formatCurrency(exp.amount)}</span>
                          <button
                            type="button"
                            className="expenses__delete"
                            onClick={async () => {
                              try {
                                await deleteExpense(exp.id)
                                refreshExpenseData()
                              } catch (err) {
                                setError(err.message)
                              }
                            }}
                            title="Eliminar gasto"
                            aria-label={`Eliminar gasto ${exp.description}`}
                          >
                            <svg width="16" height="16" aria-hidden="true"><use href="#ic-trash" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="expenses__total">
                      <span>Total gastos</span>
                      <span className="expenses__total-amount">
                        {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount), 0))}
                      </span>
                    </div>
                  </>
                )}
              </Card>
            </div>

            <div className="shift-actions">
              <Button size="lg" className="shift-actions__main" onClick={() => navigate('/mesas')}>
                Ir a mesas →
              </Button>
              <Button
                size="lg"
                variant="danger-outline"
                onClick={openCloseConfirm}
                disabled={loading || remote}
                title={remote ? 'No disponible en modo remoto (solo lectura)' : undefined}
              >
                {loading ? 'Cerrando...' : 'Cerrar turno'}
              </Button>
            </div>

            {showCloseConfirm && (
              <Modal
                title="Cerrar turno"
                closeButton
                width={480}
                onClose={cancelClose}
                dismissible={!loading}
                initialFocusRef={cancelCloseRef}
                footer={(
                  <>
                    <Button ref={cancelCloseRef} variant="secondary" onClick={cancelClose} disabled={loading}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleClose}
                      disabled={loading || (!closeSummary && !summaryError)}
                      aria-busy={loading}
                    >
                      {loading ? 'Cerrando...' : 'Confirmar cierre'}
                    </Button>
                  </>
                )}
              >
                <div className="close-shift">
                  <dl className="close-shift__info">
                    <div>
                      <dt>Cajero</dt>
                      <dd>{cashRegister.cashierName || '—'}</dd>
                    </div>
                    <div>
                      <dt>Apertura</dt>
                      <dd className="ui-num">
                        {new Date(cashRegister.openedAt).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
                        {' · '}
                        {new Date(cashRegister.openedAt).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </dd>
                    </div>
                  </dl>

                  {summaryError ? (
                    <Notice variant="danger">{summaryError}</Notice>
                  ) : !closeSummary ? (
                    <p className="close-shift__loading">Cargando resumen del turno...</p>
                  ) : (
                    <div className="close-shift__summary">
                      <div className="close-shift__total">
                        <div>
                          <div className="shift-label">Total vendido</div>
                          <div className="close-shift__total-amount">{formatCurrency(closeSummary.totalAmount)}</div>
                        </div>
                        <div className="close-shift__count">
                          {closeSummary.totalOrders} {closeSummary.totalOrders === 1 ? 'venta' : 'ventas'}
                        </div>
                      </div>
                      <div className="close-shift__methods">
                        {METHODS.map((m) => (
                          <div key={m.value} className="close-shift__method">
                            <span className="method-tile__dot" style={{ background: m.color }} />
                            <span className="close-shift__method-name">{m.label}</span>
                            <span className="close-shift__method-count">
                              {closeSummary.breakdown[m.value]?.orderCount || 0} {closeSummary.breakdown[m.value]?.orderCount === 1 ? 'venta' : 'ventas'}
                            </span>
                            <span className="close-shift__method-total">{formatCurrency(closeSummary.breakdown[m.value]?.total || 0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Notice variant="warning">Al cerrar el turno ya no podrás anular las ventas de este turno.</Notice>
                  {closeError && <Notice variant="danger">{closeError}</Notice>}
                </div>
              </Modal>
            )}
          </>
        )}
      </div>
    </div>
  )
}
