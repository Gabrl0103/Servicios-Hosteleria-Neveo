import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getShiftReceipt } from '../api/reports'
import { formatCurrency } from '../utils/format'
import '../styles/global.css'

const METHODS = [
  { value: 'EFECTIVO', label: 'EFECTIVO' },
  { value: 'NEQUI', label: 'NEQUI' },
  { value: 'RAPPI', label: 'RAPPI' },
]

function formatDateTime(iso) {
  if (!iso) return null
  return (
    new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) +
    ' ' +
    new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

// Pantalla dedicada solo a este recibo, sin NavBar, formato ticket
// termico angosto. Se abre en pestana/ventana aparte (window.open),
// igual al patron "cashBox-print" de Loggro.
export default function ShiftReceiptPage() {
  const { cashRegisterId } = useParams()
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getShiftReceipt(cashRegisterId).then(setReceipt).catch((err) => setError(err.message))
  }, [cashRegisterId])

  return (
    <div style={{ minHeight: '100vh', background: '#e7e0d3', padding: '34px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <button onClick={() => window.close()} style={{ background: '#fff', border: '1px solid var(--border-strong)', color: '#5c554c', fontSize: 13, fontWeight: 800, padding: '9px 16px', borderRadius: 10 }}>
          Cerrar ventana
        </button>
        <button onClick={() => window.print()} disabled={!receipt} className="btn-ink" style={{ fontSize: 13, padding: '9px 16px' }}>
          Imprimir
        </button>
      </div>

      {error && <p style={{ color: 'var(--red-text)' }}>{error}</p>}
      {!receipt && !error && <p style={{ color: '#8a8175' }}>Cargando comprobante...</p>}

      {receipt && (
        <div
          className="receipt-mono"
          style={{
            width: 300,
            background: '#fafafa',
            padding: '22px 18px',
            boxShadow: '0 2px 14px rgba(0,0,0,.16)',
            position: 'relative',
            fontSize: 11,
            color: '#1a1a1a',
            lineHeight: 1.55,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -7,
              left: 0,
              right: 0,
              height: 14,
              background: 'linear-gradient(135deg, transparent 50%, #fafafa 50%), linear-gradient(45deg, transparent 50%, #fafafa 50%)',
              backgroundSize: '14px 14px',
              backgroundPosition: '0 0',
            }}
          />

          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            {receipt.logoBase64 && (
              <img src={receipt.logoBase64} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 6 }} />
            )}
            <div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: '1px' }}>{(receipt.businessName || 'HELADERIA').toUpperCase()}</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>NIT {receipt.nit || '901.234.567-8'}</div>
            <div style={{ fontSize: 10, color: '#555' }}>{receipt.address || 'Calle 12 # 34-56, Bogotá'}</div>
            <div style={{ fontSize: 10, color: '#555' }}>Tel. {receipt.phone || '310 123 4567'}</div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 10.5, borderTop: '1px dashed #999', borderBottom: '1px dashed #999', padding: '7px 0', margin: '8px 0' }}>
            COMPROBANTE DE CIERRE
            <br />
            N° {String(receipt.cashRegisterId).padStart(6, '0')}
          </div>

          <div style={{ marginBottom: 8 }}>
            <Row label="CAJA" value="Principal" />
            <Row label="RESPONSABLE" value={receipt.cashierName || '—'} />
            <Row label="APERTURA" value={formatDateTime(receipt.openedAt)} />
            <Row label="CIERRE" value={receipt.closedAt ? formatDateTime(receipt.closedAt) : 'En curso'} />
          </div>

          <div style={{ fontSize: 10.5, borderTop: '1px dashed #999', paddingTop: 7, marginBottom: 4 }}>
            VENTAS POR MÉTODO
          </div>
          <div>
            {METHODS.map(({ value, label }) => (
              <Row
                key={value}
                label={`${label} x${receipt.paymentBreakdown.breakdown[value]?.orderCount || 0}`}
                value={formatCurrency(receipt.paymentBreakdown.breakdown[value]?.total || 0)}
              />
            ))}
          </div>

          <div style={{ marginTop: 10, paddingTop: 9, borderTop: '1px dashed #999', display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
            <span>TOTAL</span>
            <span>{formatCurrency(receipt.paymentBreakdown.totalAmount)}</span>
          </div>

          {receipt.expenses && receipt.expenses.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 7, borderTop: '1px dashed #999' }}>
              <div style={{ fontSize: 10.5, marginBottom: 4 }}>GASTOS DEL TURNO</div>
              {receipt.expenses.map((exp) => (
                <Row key={exp.id} label={exp.description} value={formatCurrency(exp.amount)} />
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 2 }}>
                <span>TOTAL GASTOS</span>
                <span>{formatCurrency(receipt.totalExpenses || 0)}</span>
              </div>
            </div>
          )}

          <div style={{ marginTop: 10, paddingTop: 7, borderTop: '1px dashed #999' }}>
            <Row label="CAJA INICIAL" value={formatCurrency(receipt.openingAmount || 0)} />
            <Row label="VENTAS EFECTIVO" value={formatCurrency(receipt.cashSales || 0)} />
            {receipt.totalExpenses > 0 && (
              <Row label="GASTOS" value={`-${formatCurrency(receipt.totalExpenses)}`} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 2 }}>
              <span>ESPERADO EN CAJA</span>
              <span>{formatCurrency(receipt.expectedCash || 0)}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 9.5, color: '#777', lineHeight: 1.7 }}>
            *** GRACIAS ***
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: -7,
              left: 0,
              right: 0,
              height: 14,
              background: 'linear-gradient(135deg, #fafafa 50%, transparent 50%), linear-gradient(45deg, #fafafa 50%, transparent 50%)',
              backgroundSize: '14px 14px',
              backgroundPosition: '0 0',
            }}
          />
        </div>
      )}
    </div>
  )
}
