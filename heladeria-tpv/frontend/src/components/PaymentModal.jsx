import { useState, useMemo, useRef } from 'react'
import { formatCurrency } from '../utils/format'
import { Button, Modal, Notice } from './ui'
import './CheckoutModals.css'

const BILLS = [10000, 20000, 50000, 100000]

const METHODS = [
  { value: 'EFECTIVO', label: 'Efectivo', color: '#27A567' },
  { value: 'NEQUI', label: 'Nequi', color: '#7A4FA3' },
  { value: 'RAPPI', label: 'Rappi', color: '#E0518A' },
]

// subtotal: total antes de descuento. onConfirm recibe { paymentMethod, amountReceived?, discountPercent? }
export default function PaymentModal({ subtotal, onConfirm, onCancel, loading }) {
  const [method, setMethod] = useState('EFECTIVO')
  const [received, setReceived] = useState(null)
  const [discountPercent, setDiscountPercent] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [inputSource, setInputSource] = useState(null)
  // Foco inicial en el descuento, nunca en "Confirmar venta".
  const discountRef = useRef(null)

  const discountValue = Number(discountPercent) || 0
  const discountAmount = subtotal * (discountValue / 100)
  const total = Math.max(0, subtotal - discountAmount)

  const effectiveReceived = inputSource === 'manual' ? (Number(manualAmount) || null) : received

  const change = useMemo(() => {
    if (method !== 'EFECTIVO' || effectiveReceived == null) return null
    return effectiveReceived - total
  }, [method, effectiveReceived, total])

  const canConfirm = (effectiveReceived == null || effectiveReceived >= total) && discountValue >= 0 && discountValue <= 100

  function selectBill(amount) {
    setManualAmount('')
    setInputSource('bills')
    setReceived((prev) => (prev || 0) + amount)
  }

  function handleManualChange(value) {
    setManualAmount(value)
    setInputSource(value ? 'manual' : null)
    setReceived(null)
  }

  function handleConfirm() {
    const payload = { paymentMethod: method }
    if (method === 'EFECTIVO' && effectiveReceived != null) {
      payload.amountReceived = effectiveReceived
    }
    if (discountValue > 0) {
      payload.discountPercent = discountValue
    }
    onConfirm(payload)
  }

  const methodInfo = METHODS.find((m) => m.value === method)
  const changeTone = change == null ? '' : change >= 0 ? 'cash-tile--ok' : 'cash-tile--short'

  return (
    <Modal
      title="Total a cobrar"
      closeButton
      width={520}
      onClose={onCancel}
      dismissible={!loading}
      initialFocusRef={discountRef}
      headerExtra={(
        <>
          <div className="pay-total">{formatCurrency(total)}</div>
          {discountValue > 0 && (
            <div className="pay-total__detail">
              {formatCurrency(subtotal)} − {discountValue}% ({formatCurrency(discountAmount)})
            </div>
          )}
        </>
      )}
      footer={(
        <Button size="lg" disabled={!canConfirm || loading} aria-busy={loading} onClick={handleConfirm}>
          {loading ? 'Procesando...' : 'Confirmar venta'}
        </Button>
      )}
    >
      <div className="pay-section">
        <div className="pay-label">
          Descuento <span className="pay-label__hint">(opcional, %)</span>
        </div>
        <div className="pay-discount">
          <input
            ref={discountRef}
            type="number"
            min="0"
            max="100"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            placeholder="0"
            className="ui-input pay-discount__input"
            aria-label="Descuento en porcentaje"
          />
          <span className="pay-discount__unit">%</span>
          {discountValue > 0 && (
            <span className="pay-discount__saving">Ahorra {formatCurrency(discountAmount)}</span>
          )}
        </div>
      </div>

      <div className="pay-section">
        <div className="pay-label">Método de pago</div>
        <div className="pay-methods">
          {METHODS.map((m) => {
            const active = method === m.value
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={`pay-method ${active ? 'pay-method--active' : ''}`}
                aria-pressed={active}
              >
                <span className="pay-method__dot" style={{ background: m.color }} />
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {method === 'EFECTIVO' ? (
        <div className="pay-section">
          <div className="pay-label">
            Efectivo recibido <span className="pay-label__hint">(opcional)</span>
          </div>
          <div className="pay-bills">
            {BILLS.map((bill) => (
              <button key={bill} type="button" className="pay-bill" onClick={() => selectBill(bill)}>
                {formatCurrency(bill)}
              </button>
            ))}
          </div>
          <div className="cash-tiles">
            <div className="cash-tile">
              <div className="cash-tile__label">Recibido</div>
              <div className="cash-tile__value">{effectiveReceived != null ? formatCurrency(effectiveReceived) : '—'}</div>
              {effectiveReceived != null && (
                <button
                  type="button"
                  className="cash-tile__clear"
                  onClick={() => { setReceived(null); setManualAmount(''); setInputSource(null) }}
                  aria-label="Limpiar"
                >
                  <svg width="12" height="12" aria-hidden="true"><use href="#ic-x" /></svg>
                </button>
              )}
            </div>
            <div className={`cash-tile ${changeTone}`}>
              <div className="cash-tile__label">Cambio</div>
              <div className="cash-tile__value">{change == null ? '—' : formatCurrency(change)}</div>
            </div>
          </div>
          <label className="ui-field">
            <span className="ui-field__hint">O escribe el monto manualmente</span>
            <input
              type="number"
              min="0"
              value={manualAmount}
              onChange={(e) => handleManualChange(e.target.value)}
              placeholder="$0"
              className="ui-input pay-manual"
            />
          </label>
          {change != null && change < 0 && (
            <Notice variant="danger" className="pay-short">El monto recibido es menor al total</Notice>
          )}
        </div>
      ) : (
        <div className="pay-digital">
          <div className="pay-digital__title">Cobro por {methodInfo.label}</div>
          <div className="pay-digital__text">
            Confirma que el pago de <span className="ui-num">{formatCurrency(total)}</span> llegó antes de finalizar.
          </div>
        </div>
      )}
    </Modal>
  )
}
