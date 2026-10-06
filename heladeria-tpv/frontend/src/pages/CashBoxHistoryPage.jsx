import { useEffect, useState } from 'react'
import { getAllCashRegisters } from '../api/cashRegisters'
import { getShiftReport } from '../api/reports'
import { formatCurrency } from '../utils/format'
import { Button, Card, Chip, Notice } from '../components/ui'
import './CashBoxHistoryPage.css'

function formatDateTime(iso) {
  if (!iso) return '—'
  return (
    new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) +
    ' · ' +
    new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
  )
}

export default function CashBoxHistoryPage() {
  const [registers, setRegisters] = useState([])
  const [totals, setTotals] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    getAllCashRegisters()
      .then(async (list) => {
        setRegisters(list)
        const entries = await Promise.all(
          list.map(async (r) => {
            try {
              const report = await getShiftReport(r.id)
              return [r.id, report]
            } catch {
              return [r.id, null]
            }
          })
        )
        setTotals(Object.fromEntries(entries))
      })
      .catch((err) => setError(err.message))
  }, [])

  function openReceipt(cashRegisterId) {
    // Pestana/ventana aparte, igual al patron de Loggro (cashBox-print).
    // En la app empaquetada con Electron, esto se intercepta para abrir
    // una BrowserWindow nueva en vez de una pestana del navegador.
    window.open(`#/recibo/${cashRegisterId}`, '_blank', 'width=420,height=720')
  }

  return (
    <div className="cashbox-page">
      <div className="cashbox-page__inner">
        <header className="cashbox-page__header">
          <h1 className="ui-page-title">Cuadre de caja</h1>
          <p className="cashbox-page__subtitle">
            Historial de turnos. Abre el comprobante de cierre de cualquiera en una ventana aparte.
          </p>
        </header>

        {error && <Notice variant="danger">{error}</Notice>}

        <Card className="cashbox-table-card">
          <table className="ui-table cashbox-table">
            <thead>
              <tr>
                <th>Fecha inicio</th>
                <th>Fecha fin</th>
                <th>Nombre de caja</th>
                <th>Responsable</th>
                <th className="ui-table__num">Ventas</th>
                <th className="ui-table__num">Total</th>
                <th aria-label="Comprobante"></th>
              </tr>
            </thead>
            <tbody>
              {registers.map((register) => {
                const report = totals[register.id]
                const isOpen = !register.closedAt
                return (
                  <tr key={register.id}>
                    <td className="ui-num">{formatDateTime(register.openedAt)}</td>
                    <td className="ui-num">
                      {isOpen ? <Chip variant="success" dot>En curso</Chip> : formatDateTime(register.closedAt)}
                    </td>
                    <td className="cashbox-table__strong">Caja principal</td>
                    <td className="cashbox-table__muted">{register.cashierName || '—'}</td>
                    <td className="ui-table__num">{report?.totalOrders ?? '—'}</td>
                    <td className="ui-table__num cashbox-table__strong">{report ? formatCurrency(report.totalAmount) : '—'}</td>
                    <td className="cashbox-table__action">
                      <Button variant="neutral" size="sm" onClick={() => openReceipt(register.id)}>
                        <svg width="16" height="16" aria-hidden="true"><use href="#ic-print" /></svg>
                        Comprobante
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {registers.length === 0 && !error && (
            <p className="cashbox-empty">Aún no hay turnos registrados.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
