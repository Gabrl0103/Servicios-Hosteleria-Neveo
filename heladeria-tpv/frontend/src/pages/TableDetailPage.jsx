import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProducts } from '../api/products'
import { getTable, getTablePendingItems, addProductToTable, removeProductFromTable } from '../api/tables'
import { createOrder } from '../api/orders'
import { useSession } from '../context/SessionContext'
import { formatCurrency } from '../utils/format'
import { categoryInfo } from '../utils/categoryColors'
import QuantityModal from '../components/QuantityModal'
import ConfirmationModal from '../components/ConfirmationModal'
import PaymentModal from '../components/PaymentModal'

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

  const categories = useMemo(() => {
    const unique = [...new Set(products.map((p) => p.category).filter(Boolean))]
    return ['Todos', ...unique]
  }, [products])

  const visibleProducts =
    activeCategory === 'Todos' ? products : products.filter((p) => p.category === activeCategory)

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

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
      <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '20px 22px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => navigate('/mesas')}
            style={{ background: '#fff', border: '1px solid var(--border-strong)', color: '#5c554c', fontSize: 12, fontWeight: 800, padding: '8px 13px', borderRadius: 10 }}
          >
            ← Mesas
          </button>
          <h1 style={{ fontSize: 21, fontWeight: 900, margin: 0, color: 'var(--ink)' }}>{table.name}</h1>
          {Number(table.pendingTotal) > 0 && (
            <span style={{ background: 'var(--red-bg)', color: 'var(--red-text)', fontSize: 12, fontWeight: 800, padding: '5px 11px', borderRadius: 9 }}>
              Debe {formatCurrency(table.pendingTotal)}
            </span>
          )}
        </div>

        {error && <p style={{ color: 'var(--red-text)', fontSize: 13 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 14, flex: 'none' }}>
          {categories.map((category) => {
            const info = category === 'Todos' ? null : categoryInfo(category)
            const active = activeCategory === category
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  whiteSpace: 'nowrap',
                  flex: 'none',
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 800,
                  border: active ? 'none' : '1px solid var(--border)',
                  background: active ? 'var(--ink)' : 'var(--surface)',
                  color: active ? '#fff' : 'var(--text-muted)',
                }}
              >
                {info && (
                  <svg width="19" height="19" style={{ color: active ? '#fff' : info.color }}>
                    <use href={`#cat-${info.icon}`} />
                  </svg>
                )}
                {category}
              </button>
            )
          })}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 4px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 1fr))', gap: 14 }}>
            {visibleProducts.map((product) => {
              const inCart = cart.find((i) => i.product.id === product.id)
              const info = categoryInfo(product.category)
              return (
                <button
                  key={product.id}
                  disabled={!product.available}
                  onClick={() => openQuantityModal(product)}
                  className="card"
                  style={{
                    textAlign: 'left',
                    padding: 15,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 11,
                    minHeight: 128,
                    opacity: product.available ? 1 : 0.5,
                    border: inCart ? `2px solid ${info.color}` : '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', color: info.color }}>
                      <svg width="15" height="15"><use href={`#cat-${info.icon}`} /></svg>
                      {info.short}
                    </span>
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--tile-bg)', color: 'var(--ink)', display: 'grid', placeItems: 'center' }}>
                      {product.available ? <svg width="15" height="15"><use href="#ic-plus" /></svg> : <span style={{ fontSize: 9, fontWeight: 800 }}>—</span>}
                    </span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.2, marginTop: 'auto' }}>{product.name}</div>
                  <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: product.available ? 'var(--ink)' : 'var(--text-faint)' }}>
                    {product.available ? formatCurrency(product.price) : 'Agotado'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <aside style={{ flex: 'none', width: 380, background: 'var(--surface)', borderLeft: '1px solid #E9E1D5', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)' }}>Pedido actual</div>
          {cart.length > 0 && (
            <button onClick={clearCart} style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-soft-2)', fontSize: 12, fontWeight: 800, padding: '8px 12px', borderRadius: 9 }}>
              Vaciar
            </button>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 14px' }}>
          {cart.length === 0 ? (
            <p style={{ color: 'var(--text-soft)', fontSize: 14, padding: '20px 8px' }}>Toca un producto para agregarlo</p>
          ) : (
            cart.map((item) => {
              const info = categoryInfo(item.product.category)
              return (
                <div key={item.product.id} style={{ display: 'flex', gap: 11, alignItems: 'center', padding: '12px 8px', borderBottom: '1px solid var(--border-soft-2)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', flex: 'none', background: info.color }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.2 }}>{item.product.name}</div>
                    <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-soft)', fontWeight: 700, marginTop: 2 }}>
                      {formatCurrency(item.product.price)} c/u
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 'none' }}>
                    <button onClick={() => changeQuantity(item.product.id, -1)} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--tile-bg)', color: 'var(--ink)', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 800 }}>−</button>
                    <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 800, fontSize: 15 }}>{item.quantity}</span>
                    <button onClick={() => changeQuantity(item.product.id, 1)} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--ink)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 800 }}>+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.product.id)} aria-label="Quitar" style={{ width: 22, height: 22, borderRadius: 6, background: 'transparent', color: 'var(--text-faint)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                    <svg width="13" height="13"><use href="#ic-x" /></svg>
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div style={{ flex: 'none', padding: '16px 20px 18px', borderTop: '1px solid #E9E1D5', background: 'var(--surface-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--ink)' }}>Total pedido</span>
            <span className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(subtotal)}</span>
          </div>
          <button
            disabled={cart.length === 0}
            onClick={startPayFlow}
            className="btn-ink"
            style={{ width: '100%', fontSize: 17, padding: 16 }}
          >
            Cobrar este pedido
          </button>
          <button
            disabled={cart.length === 0 || saving}
            onClick={handleLeaveOnAccount}
            className="btn-outline"
            style={{ width: '100%', fontSize: 14, padding: 11, marginTop: 10 }}
          >
            {saving ? 'Guardando...' : 'Dejar en la cuenta'}
          </button>
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
