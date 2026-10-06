import { useEffect, useMemo, useState } from 'react'
import { getProducts, createProduct, updateProduct, setProductAvailability, deleteProduct } from '../api/products'
import { formatCurrency } from '../utils/format'
import { categoryInfo, normalizeCategory, uniqueCategories } from '../utils/categoryColors'

const EMPTY_FORM = { id: null, name: '', category: '', price: '' }

function ProductFormModal({ form, setForm, onSubmit, onClose, error }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, background: 'rgba(42,38,34,.42)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: 380, borderRadius: 22, boxShadow: 'var(--shadow-modal)', padding: 26 }}>
        <h3 style={{ marginTop: 0, fontWeight: 900, color: 'var(--ink)' }}>{form.id ? 'Editar producto' : 'Nuevo producto'}</h3>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 15 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Categoría</label>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Ej: Helados, Acaí, Toppings"
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 15 }}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Precio</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 15 }}
            />
          </div>

          {error && <p style={{ color: 'var(--red-text)', fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} className="btn-outline" style={{ flex: 1, padding: 13 }}>
              Cancelar
            </button>
            <button type="submit" className="btn-ink" style={{ flex: 1, padding: 13 }}>
              {form.id ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')

  function load() {
    getProducts(false).then(setProducts).catch((err) => setError(err.message))
  }

  useEffect(load, [])

  // Categorias sin duplicados por mayusculas, tildes o espacios ("Acaí" = "acai").
  // activeCategory guarda la clave normalizada, o 'Todos'.
  const categories = useMemo(
    () => [{ key: 'Todos', label: 'Todos' }, ...uniqueCategories(products)],
    [products],
  )

  const visibleProducts =
    activeCategory === 'Todos'
      ? products
      : products.filter((p) => normalizeCategory(p.category) === activeCategory)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const payload = { name: form.name, category: form.category, price: Number(form.price) }
      if (form.id) {
        await updateProduct(form.id, payload)
      } else {
        await createProduct(payload)
      }
      setForm(null)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function toggleAvailability(product) {
    await setProductAvailability(product.id, !product.available)
    load()
  }

  async function handleDelete(id) {
    const confirmed = window.confirm('Eliminar este producto?')
    if (!confirmed) return
    await deleteProduct(id)
    load()
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 25, fontWeight: 900, margin: '0 0 4px' }}>Productos</h1>
            <p style={{ fontSize: 14, color: 'var(--text-soft)', fontWeight: 700, margin: 0 }}>
              Gestiona el catálogo, precios y disponibilidad.
            </p>
          </div>
          <button onClick={() => setForm(EMPTY_FORM)} className="btn-ink" style={{ padding: '13px 20px', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18"><use href="#ic-plus" /></svg>
            Agregar producto
          </button>
        </div>

        <div style={{ display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 16 }}>
          {categories.map((category) => {
            const info = category.key === 'Todos' ? null : categoryInfo(category.label)
            const active = activeCategory === category.key
            return (
              <button
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  flex: 'none',
                  padding: '8px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  border: active ? 'none' : '1px solid var(--border)',
                  background: active ? 'var(--ink)' : '#fff',
                  color: active ? '#fff' : 'var(--text-muted)',
                }}
              >
                {info && (
                  <svg width="17" height="17" style={{ color: active ? '#fff' : info.color }}>
                    <use href={`#cat-${info.icon}`} />
                  </svg>
                )}
                {category.label}
              </button>
            )
          })}
        </div>

        {error && <p style={{ color: 'var(--red-text)' }}>{error}</p>}

        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          {visibleProducts.map((product) => {
            const info = categoryInfo(product.category)
            return (
              <div
                key={product.id}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 22px', borderBottom: '1px solid var(--border-soft-2)' }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: info.color + '1f',
                    color: info.color,
                    display: 'grid',
                    placeItems: 'center',
                    flex: 'none',
                  }}
                >
                  <svg width="19" height="19"><use href={`#cat-${info.icon}`} /></svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--ink)' }}>{product.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 700 }}>{info.short}</div>
                </div>
                <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', width: 90, textAlign: 'right' }}>
                  {formatCurrency(product.price)}
                </span>
                <button
                  onClick={() => toggleAvailability(product)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 12.5,
                    fontWeight: 800,
                    padding: '7px 12px',
                    borderRadius: 9,
                    background: product.available ? 'var(--green-bg)' : 'var(--red-bg)',
                    color: product.available ? 'var(--green-text)' : 'var(--red-text)',
                    width: 128,
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: product.available ? 'var(--green-dot)' : 'var(--red-dot)' }} />
                  {product.available ? 'Disponible' : 'Agotado'}
                </button>
                <button
                  onClick={() => setForm({ id: product.id, name: product.name, category: product.category || '', price: product.price })}
                  style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border-strong-2)', background: '#fff', color: 'var(--text-muted)', display: 'grid', placeItems: 'center', flex: 'none' }}
                >
                  <svg width="17" height="17"><use href="#ic-edit" /></svg>
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  aria-label="Eliminar"
                  style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border-strong-2)', background: '#fff', color: 'var(--red-text)', display: 'grid', placeItems: 'center', flex: 'none' }}
                >
                  <svg width="16" height="16"><use href="#ic-trash" /></svg>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {form && (
        <ProductFormModal
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onClose={() => {
            setForm(null)
            setError('')
          }}
          error={error}
        />
      )}
    </div>
  )
}
