import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProducts } from '../api/products'
import { getTable, getTablePendingItems, addProductToTable, removeProductFromTable } from '../api/tables'
import { createOrder } from '../api/orders'
import { useSession } from '../context/SessionContext'
import { formatCurrency } from '../utils/format'
import { categoryInfo, normalizeCategory, uniqueCategories } from '../utils/categoryColors'
import { Button, Card, Chip, Notice } from '../components/ui'
import CategoryIcon from '../components/CategoryIcon'
import QuantityModal from '../components/QuantityModal'
import ConfirmationModal from '../components/ConfirmationModal'
import PaymentModal from '../components/PaymentModal'
import './TableDetailPage.css'

export default function TableDetailPage() {
  const { user, cashRegister } = useSession()
  const { tableId } = useParams()
  const navigate = useNavigate()

  const [table, setTable] = useState(null)
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [cart, setCart] = useState([])
  const [productForQuantity, setProductForQuantity] = useState(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Guardados en curso (agregar, sumar/restar, quitar). "Dejar en la cuenta"
  // espera a que terminen antes de consultar el total y navegar.
  const inFlight = useRef(new Set())
  const savingRef = useRef(false)

  function track(promise) {
    inFlight.current.add(promise)
    const done = () => inFlight.current.delete(promise)
    promise.then(done, done)
    return promise
  }

  function loadTable() {
    getTable(tableId).then(setTable).catch((err) => setError(err.message))
  }

  function restoreCart(prods, items) {
    return items
      .map((item) => {
        const product = prods.find((p) => p.id === item.product.id)
        return product ? { product, quantity: item.quantity, note: '' } : null
      })
      .filter(Boolean)
  }

  useEffect(() => {
    if (!cashRegister) {
      navigate('/turno')
      return
    }
    loadTable()
    getProducts(false).then((prods) => {
      setProducts(prods)
      getTablePendingItems(tableId).then((items) => {
        setCart(restoreCart(prods, items))
      }).catch(() => {})
    }).catch((err) => setError(err.message))
  }, [cashRegister, navigate, tableId])

  // Categorias sin duplicados por mayusculas, tildes o espacios ("Acaí" = "acai").
  // activeCategory guarda la clave normalizada, o 'Todos'.
  const categories = useMemo(() => uniqueCategories(products), [products])

  const visibleProducts =
    activeCategory === 'Todos'
      ? products
      : products.filter((p) => normalizeCategory(p.category) === activeCategory)

  function openQuantityModal(product) {
    if (!product.available) return
    setProductForQuantity(product)
  }

  async function addToCartWithQuantity(quantity) {
    const product = productForQuantity
    setProductForQuantity(null)
    try {
      const updated = await track(addProductToTable(table.id, product.id, quantity))
      setTable(updated)
      setCart((prev) => {
        const existing = prev.find((i) => i.product.id === product.id)
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
          )
        }
        return [...prev, { product, quantity, note: '' }]
      })
    } catch (err) {
      setError(err.message)
    }
  }

  async function changeQuantity(productId, delta) {
    const item = cart.find((i) => i.product.id === productId)
    if (!item) return
    try {
      const updated = delta > 0
        ? await track(addProductToTable(table.id, productId, 1))
        : await track(removeProductFromTable(table.id, productId, 1))
      setTable(updated)
      setCart((prev) =>
        prev
          .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
          .filter((i) => i.quantity > 0)
      )
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeFromCart(productId) {
    const item = cart.find((i) => i.product.id === productId)
    if (!item) return
    try {
      const updated = await track(removeProductFromTable(table.id, productId, item.quantity))
      setTable(updated)
      setCart((prev) => prev.filter((i) => i.product.id !== productId))
    } catch (err) {
      setError(err.message)
    }
  }

  function updateNote(productId, note) {
    setCart((prev) => prev.map((i) => (i.product.id === productId ? { ...i, note } : i)))
  }

  const subtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

  async function clearCart() {
    setError('')
    try {
      for (const item of cart) {
        await track(removeProductFromTable(table.id, item.product.id, item.quantity))
      }
      setCart([])
      loadTable()
    } catch (err) {
      setError(err.message)
    }
  }

  /**
   * "Dejar en la cuenta": no escribe nada. Espera los guardados en curso,
   * consulta el total real de la mesa al backend y vuelve a Mesas con la
   * confirmacion. Si algo fallo, se queda en la mesa mostrando lo guardado.
   */
  async function handleLeaveOnAccount() {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      let failure = null
      while (inFlight.current.size > 0) {
        const results = await Promise.allSettled([...inFlight.current])
        const rejected = results.find((r) => r.status === 'rejected')
        if (rejected) failure = rejected.reason
      }
      if (failure) {
        const [fresh, items] = await Promise.all([getTable(tableId), getTablePendingItems(tableId)])
        setTable(fresh)
        setCart(restoreCart(products, items))
        setError(`No se pudo guardar todo en la cuenta: ${failure.message}. Se muestra lo que quedó guardado.`)
        return
      }
      const fresh = await getTable(tableId)
      navigate('/mesas', { state: { notice: `Cuenta guardada: ${formatCurrency(fresh.pendingTotal)}` } })
    } catch (err) {
      setError(err.message)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function startPayFlow() {
    setShowConfirmation(true)
  }

  async function handleConfirmPayment(paymentData) {
    setConfirming(true)
    setError('')
    try {
      const order = await createOrder({
        userId: user.id,
        tableId: table.id,
        items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity, note: i.note || null })),
        ...paymentData,
      })
      window.open(`#/recibo-venta/${order.id}`, '_blank', 'width=420,height=720')
      setCart([])
      setShowPayment(false)
      loadTable()
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  if (!cashRegister || !table) return null

  const units = cart.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className="table-detail">
      <nav className="category-rail" aria-label="Categorías">
        <button
          type="button"
          className={`category-rail__item ${activeCategory === 'Todos' ? 'category-rail__item--active' : ''}`}
          onClick={() => setActiveCategory('Todos')}
        >
          <span className="category-rail__all">
            <svg width="24" height="24" aria-hidden="true"><use href="#cat-todos" /></svg>
          </span>
          <span className="category-rail__label">Todos</span>
        </button>
        {categories.map((category) => (
          <button
            key={category.key}
            type="button"
            className={`category-rail__item ${activeCategory === category.key ? 'category-rail__item--active' : ''}`}
            onClick={() => setActiveCategory(category.key)}
          >
            <CategoryIcon category={category.label} size={44} />
            <span className="category-rail__label">{categoryInfo(category.label).short}</span>
          </button>
        ))}
      </nav>

      <section className="catalog">
        <div className="catalog__header">
          <Button variant="neutral" size="sm" className="catalog__back" onClick={() => navigate('/mesas')}>
            <svg width="18" height="18" aria-hidden="true"><use href="#ic-back" /></svg>
            Mesas
          </Button>
          <h1 className="catalog__title">{table.name}</h1>
          {Number(table.pendingTotal) > 0 && (
            <Chip variant="warning">Debe {formatCurrency(table.pendingTotal)}</Chip>
          )}
        </div>

        {error && <Notice variant="danger">{error}</Notice>}

        <div className="catalog__grid-wrap">
          <div className="catalog__grid">
            {visibleProducts.map((product) => {
              const inCart = cart.find((i) => i.product.id === product.id)
              const info = categoryInfo(product.category)
              return (
                <Card
                  as="button"
                  type="button"
                  key={product.id}
                  className="product-card"
                  disabled={!product.available}
                  onClick={() => openQuantityModal(product)}
                >
                  <div className="product-card__top">
                    <span className="product-card__icon">
                      <CategoryIcon category={product.category} size={48} />
                      {inCart && <span className="product-card__qty">×{inCart.quantity}</span>}
                    </span>
                    <span className="product-card__text">
                      <span className="product-card__category">{info.short}</span>
                      <span className="product-card__name">{product.name}</span>
                    </span>
                  </div>
                  <div className="product-card__bottom">
                    <span className={`product-card__price ${product.available ? '' : 'product-card__price--out'}`}>
                      {product.available ? formatCurrency(product.price) : 'Agotado'}
                    </span>
                    <span className="product-card__add" aria-hidden="true">
                      {product.available
                        ? <svg width="20" height="20"><use href="#ic-plus" /></svg>
                        : <svg width="20" height="20"><use href="#ic-minus" /></svg>}
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <aside className="order-panel">
        <div className="order-panel__header">
          <div>
            <h2 className="order-panel__title">Pedido actual</h2>
            <div className="order-panel__subtitle">
              {table.name} · {units} {units === 1 ? 'producto' : 'productos'}
            </div>
          </div>
          {cart.length > 0 && (
            <Button variant="danger-text" onClick={clearCart}>Vaciar</Button>
          )}
        </div>

        <div className="order-panel__items">
          {cart.length === 0 ? (
            <p className="order-panel__empty">Toca un producto para agregarlo</p>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="order-item">
                <div className="order-item__main">
                  <CategoryIcon category={item.product.category} size={40} />
                  <div className="order-item__text">
                    <span className="order-item__name">{item.product.name}</span>
                    <span className="order-item__unit">{formatCurrency(item.product.price)} c/u</span>
                  </div>
                  <span className="order-item__total">{formatCurrency(item.product.price * item.quantity)}</span>
                </div>
                <div className="order-item__actions">
                  <div className="qty-stepper">
                    <button type="button" className="qty-stepper__btn" onClick={() => changeQuantity(item.product.id, -1)} aria-label={`Restar uno a ${item.product.name}`}>
                      <svg width="16" height="16" aria-hidden="true"><use href="#ic-minus" /></svg>
                    </button>
                    <span className="qty-stepper__value">{item.quantity}</span>
                    <button type="button" className="qty-stepper__btn" onClick={() => changeQuantity(item.product.id, 1)} aria-label={`Sumar uno a ${item.product.name}`}>
                      <svg width="16" height="16" aria-hidden="true"><use href="#ic-plus" /></svg>
                    </button>
                  </div>
                  <Button variant="danger-text" onClick={() => removeFromCart(item.product.id)}>
                    <svg width="14" height="14" aria-hidden="true"><use href="#ic-x" /></svg>
                    Quitar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="order-panel__footer">
          <div className="order-panel__total">
            <span className="order-panel__total-label">Total pedido</span>
            <span className="order-panel__total-value">{formatCurrency(subtotal)}</span>
          </div>
          <Button size="lg" block disabled={cart.length === 0} onClick={startPayFlow}>
            Cobrar este pedido
          </Button>
          <Button variant="secondary" block disabled={cart.length === 0 || saving} onClick={handleLeaveOnAccount}>
            {saving ? 'Guardando...' : 'Dejar en la cuenta'}
          </Button>
          <div className="order-panel__note">
            <svg width="14" height="14" aria-hidden="true"><use href="#ic-check" /></svg>
            Cada producto se guarda al tocarlo
          </div>
        </div>
      </aside>

      {productForQuantity && (
        <QuantityModal product={productForQuantity} onConfirm={addToCartWithQuantity} onCancel={() => setProductForQuantity(null)} />
      )}

      {showConfirmation && (
        <ConfirmationModal
          cart={cart}
          onUpdateNote={updateNote}
          onCancel={() => setShowConfirmation(false)}
          onConfirm={() => {
            setShowConfirmation(false)
            setShowPayment(true)
          }}
        />
      )}

      {showPayment && (
        <PaymentModal
          subtotal={subtotal}
          loading={confirming}
          onConfirm={handleConfirmPayment}
          onCancel={() => setShowPayment(false)}
        />
      )}
    </div>
  )
}
