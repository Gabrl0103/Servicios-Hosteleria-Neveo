import { useRef } from 'react'
import { formatCurrency } from '../utils/format'
import { Button, Modal } from './ui'
import CategoryIcon from './CategoryIcon'
import './CheckoutModals.css'

// Muestra el resumen del pedido con un campo de observacion editable
// por cada producto, antes de pasar al modal de pago.
export default function ConfirmationModal({ cart, onUpdateNote, onConfirm, onCancel }) {
  const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  // Foco inicial en la primera observacion, no en "Continuar a cobrar".
  const firstNoteRef = useRef(null)

  return (
    <Modal
      title="Confirmar pedido"
      subtitle="Revisa los productos y agrega observaciones si hace falta."
      closeButton
      width={480}
      onClose={onCancel}
      initialFocusRef={firstNoteRef}
      footer={(
        <div className="checkout-footer">
          <div className="checkout-total">
            <span className="checkout-total__label">Total</span>
            <span className="checkout-total__value">{formatCurrency(total)}</span>
          </div>
          <div className="checkout-footer__buttons">
            <Button variant="neutral" onClick={onCancel}>Cancelar</Button>
            <Button onClick={onConfirm}>Continuar a cobrar</Button>
          </div>
        </div>
      )}
    >
      <div className="confirm-list">
        {cart.map((item, index) => (
          <div key={item.product.id} className="confirm-item">
            <div className="confirm-item__main">
              <CategoryIcon category={item.product.category} size={36} />
              <span className="confirm-item__name">
                {item.product.name} <span className="confirm-item__qty">x{item.quantity}</span>
              </span>
              <span className="confirm-item__total">{formatCurrency(item.product.price * item.quantity)}</span>
            </div>
            <input
              ref={index === 0 ? firstNoteRef : undefined}
              className="ui-input confirm-item__note"
              value={item.note || ''}
              onChange={(e) => onUpdateNote(item.product.id, e.target.value)}
              placeholder="Observación (ej: sin azúcar)"
              aria-label={`Observación para ${item.product.name}`}
            />
          </div>
        ))}
      </div>
    </Modal>
  )
}
