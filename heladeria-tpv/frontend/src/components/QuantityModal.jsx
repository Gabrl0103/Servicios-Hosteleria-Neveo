import { useRef, useState } from 'react'
import { formatCurrency } from '../utils/format'
import { categoryInfo } from '../utils/categoryColors'
import { Button, Modal } from './ui'
import CategoryIcon from './CategoryIcon'
import './CheckoutModals.css'

const SHORTCUTS = [2, 5, 10]

export default function QuantityModal({ product, onConfirm, onCancel }) {
  const [quantity, setQuantity] = useState(1)
  const info = categoryInfo(product.category)
  const inputRef = useRef(null)

  function changeBy(delta) {
    setQuantity((q) => Math.max(1, q + delta))
  }

  function handleInputChange(e) {
    const value = Number(e.target.value)
    if (!Number.isNaN(value) && value >= 1) {
      setQuantity(Math.floor(value))
    } else if (e.target.value === '') {
      setQuantity('')
    }
  }

  const safeQuantity = quantity === '' ? 0 : quantity
  const subtotal = product.price * safeQuantity

  return (
    <Modal
      title={product.name}
      subtitle={`${formatCurrency(product.price)} c/u · ${info.short}`}
      icon={<CategoryIcon category={product.category} size={44} />}
      closeButton
      width={420}
      onClose={onCancel}
      initialFocusRef={inputRef}
      footer={(
        <Button size="lg" disabled={safeQuantity < 1} onClick={() => onConfirm(safeQuantity)}>
          Agregar al pedido <span className="ui-num">· {formatCurrency(subtotal)}</span>
        </Button>
      )}
    >
      <div className="qty-picker">
        <button type="button" className="qty-picker__btn" onClick={() => changeBy(-1)} aria-label="Restar uno">
          <svg width="24" height="24" aria-hidden="true"><use href="#ic-minus" /></svg>
        </button>
        <input
          ref={inputRef}
          type="number"
          value={quantity}
          onChange={handleInputChange}
          className="qty-picker__input"
          aria-label="Cantidad"
        />
        <button type="button" className="qty-picker__btn qty-picker__btn--plus" onClick={() => changeBy(1)} aria-label="Sumar uno">
          <svg width="24" height="24" aria-hidden="true"><use href="#ic-plus" /></svg>
        </button>
      </div>

      <div className="qty-shortcuts">
        <span className="qty-shortcuts__label">Rápido</span>
        {SHORTCUTS.map((n) => (
          <button key={n} type="button" className="qty-shortcuts__btn" onClick={() => setQuantity(n)}>
            {n}
          </button>
        ))}
      </div>
    </Modal>
  )
}
