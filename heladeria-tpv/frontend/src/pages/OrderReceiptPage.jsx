import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOrder } from '../api/orders'
import { getBusinessSettings } from '../api/businessSettings'
import { formatCurrency } from '../utils/format'
import { Button } from '../components/ui'
import '../styles/receipt-window.css'
import '../styles/global.css'

function formatDateTime(iso) {
  if (!iso) return null
  return (
    new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
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

export default function OrderReceiptPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [settings, setSettings] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getOrder(orderId).then(setOrder).catch((err) => setError(err.message))
    getBusinessSettings().then(setSettings).catch(() => {})
  }, [orderId])

  const discountAmount =
    order && order.discountPercent ? order.total / (1 - Number(order.discountPercent) / 100) - order.total : 0
  const subtotalBeforeDiscount = order ? order.total + discountAmount : 0

  return (
    <div className="receipt-window">
      <div className="no-print receipt-window__actions">
        <Button variant="neutral" size="sm" onClick={() => window.close()}>
          Cerrar ventana
        </Button>
        <Button size="sm" className="receipt-window__print" onClick={() => window.print()} disabled={!order}>
          <svg width="16" height="16" aria-hidden="true"><use href="#ic-print" /></svg>
          Imprimir
        </Button>
      </div>

      {error && <p className="receipt-window__message receipt-window__message--error">{error}</p>}
      {!order && !error && <p className="receipt-window__message">Cargando comprobante...</p>}

      {order && (
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
            {settings?.logoBase64 && (
              <img src={settings.logoBase64} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 6 }} />
            )}
            <div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: '1px' }}>{(settings?.businessName || 'HELADERIA').toUpperCase()}</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>NIT {settings?.nit || '901.234.567-8'}</div>
            <div style={{ fontSize: 10, color: '#555' }}>{settings?.address || 'Calle 12 # 34-56, Bogotá'}</div>
            <div style={{ fontSize: 10, color: '#555' }}>Tel. {settings?.phone || '310 123 4567'}</div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 10.5, borderTop: '1px dashed #999', borderBottom: '1px dashed #999', padding: '7px 0', margin: '8px 0' }}>
            COMPROBANTE DE VENTA
            <br />
            N° {String(order.id).padStart(6, '0')}
          </div>

          <div style={{ marginBottom: 8 }}>
            <Row label="FECHA" value={formatDateTime(order.createdAt)} />
            {order.tableName && <Row label="MESA" value={order.tableName} />}
          </div>

          <div style={{ fontSize: 10.5, borderTop: '1px dashed #999', paddingTop: 7, marginBottom: 6 }}>
            DETALLE
          </div>
          <div style={{ marginBottom: 8 }}>
            {order.items.map((item, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.quantity}x {item.productName}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
                {item.note && (
                  <div style={{ fontSize: 9.5, color: '#777', fontStyle: 'italic', paddingLeft: 14 }}>
                    &gt; {item.note}
                  </div>
                )}
              </div>
            ))}
          </div>

          {order.discountPercent != null && Number(order.discountPercent) > 0 && (
            <div style={{ borderTop: '1px dashed #999', paddingTop: 5, marginBottom: 4 }}>
              <Row label={`Subtotal`} value={formatCurrency(subtotalBeforeDiscount)} />
              <Row label={`Descuento ${Number(order.discountPercent)}%`} value={`-${formatCurrency(discountAmount)}`} />
            </div>
          )}

          <div style={{ marginTop: 10, paddingTop: 9, borderTop: '1px dashed #999', display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
            <span>TOTAL</span>
            <span>{formatCurrency(order.total)}</span>
          </div>

          <div style={{ marginTop: 8 }}>
            <Row label="MÉTODO" value={order.paymentMethod} />
            {order.paymentMethod === 'EFECTIVO' && order.amountReceived != null && (
              <>
                <Row label="RECIBIDO" value={formatCurrency(order.amountReceived)} />
                <Row label="CAMBIO" value={formatCurrency(order.changeGiven || 0)} />
              </>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 9.5, color: '#777', lineHeight: 1.7 }}>
            *** GRACIAS POR SU COMPRA ***
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
