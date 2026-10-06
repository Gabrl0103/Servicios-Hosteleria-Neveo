import { useEffect, useMemo, useRef, useState } from 'react'
import { getProducts, createProduct, updateProduct, setProductAvailability, deleteProduct } from '../api/products'
import { formatCurrency } from '../utils/format'
import { categoryInfo, normalizeCategory, uniqueCategories } from '../utils/categoryColors'
import { Button, Card, Field, Input, Modal, Notice } from '../components/ui'
import CategoryIcon from '../components/CategoryIcon'
import './ProductsPage.css'

const EMPTY_FORM = { id: null, name: '', category: '', price: '' }

const NEW_CATEGORY = '__nueva__'

// Formulario de producto. La categoria se elige de un selector con las
// existentes (sin duplicados por mayusculas, tildes o espacios) o con
// "+ Nueva categoria". Solo calcula form.category; el envio es el de siempre.
function ProductFormModal({ form, setForm, categories, onSubmit, onClose, error }) {
  const nameRef = useRef(null)
  // Categoria con la que se abrio el formulario (al editar).
  const [original] = useState(() => ({ key: normalizeCategory(form.category), text: form.category }))
  const [selected, setSelected] = useState(() => (form.category ? normalizeCategory(form.category) : ''))
  const [newCategory, setNewCategory] = useState('')

  // Nombre a guardar para una clave existente: si el producto ya estaba en
  // esa categoria se conserva su texto tal cual; si no, el de la categoria.
  function labelFor(key) {
    if (key === original.key) return original.text
    return categories.find((c) => c.key === key)?.label ?? ''
  }

  const typedKey = normalizeCategory(newCategory)
  const duplicate = selected === NEW_CATEGORY && typedKey ? categories.find((c) => c.key === typedKey) : null

  function selectCategory(value) {
    setSelected(value)
    if (value === NEW_CATEGORY) {
      setForm({ ...form, category: resolveNew(newCategory) })
    } else {
      setForm({ ...form, category: value ? labelFor(value) : '' })
    }
  }

  // Una categoria "nueva" que ya existe (ej. "acai" con "Açaí") usa la existente.
  function resolveNew(text) {
    const key = normalizeCategory(text)
    if (!key) return ''
    const existing = categories.find((c) => c.key === key)
    return existing ? labelFor(existing.key) : text.trim().replace(/\s+/g, ' ')
  }

  function changeNewCategory(text) {
    setNewCategory(text)
    setForm({ ...form, category: resolveNew(text) })
  }

  return (
    <Modal
      title={form.id ? 'Editar producto' : 'Nuevo producto'}
      closeButton
      width={420}
      onClose={onClose}
      initialFocusRef={nameRef}
      footer={(
        <>
          <Button variant="neutral" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="product-form">{form.id ? 'Guardar' : 'Agregar'}</Button>
        </>
      )}
    >
      <form id="product-form" className="product-form" onSubmit={onSubmit}>
        <Field label="Nombre">
          <Input
            ref={nameRef}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>

        <Field label="Categoría">
          <div className="product-form__category">
            {selected && selected !== NEW_CATEGORY && <CategoryIcon category={labelFor(selected)} size={36} />}
            <select className="ui-input" value={selected} onChange={(e) => selectCategory(e.target.value)}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
              <option value={NEW_CATEGORY}>+ Nueva categoría</option>
            </select>
          </div>
        </Field>

        {selected === NEW_CATEGORY && (
          <Field
            label="Nombre de la nueva categoría"
            hint={duplicate ? `Ya existe como "${duplicate.label}": se usará esa categoría.` : 'Ej: Helados, Malteadas'}
          >
            <Input
              value={newCategory}
              onChange={(e) => changeNewCategory(e.target.value)}
              required
              autoFocus
            />
          </Field>
        )}

        <Field label="Precio">
          <Input
            type="number"
            className="ui-num"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
        </Field>

        {error && <Notice variant="danger">{error}</Notice>}
      </form>
    </Modal>
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
    <div className="products-page">
      <div className="products-page__inner">
        <div className="products-page__header">
          <div className="products-page__heading">
            <h1 className="ui-page-title">Productos</h1>
            <p className="products-page__subtitle">Gestiona el catálogo, precios y disponibilidad.</p>
          </div>
          <Button onClick={() => setForm(EMPTY_FORM)}>
            <svg width="18" height="18" aria-hidden="true"><use href="#ic-plus" /></svg>
            Agregar producto
          </Button>
        </div>

        <div className="category-chips" role="group" aria-label="Categorías">
          {categories.map((category) => {
            const active = activeCategory === category.key
            return (
              <button
                key={category.key}
                type="button"
                onClick={() => setActiveCategory(category.key)}
                className={`category-chip ${active ? 'category-chip--active' : ''}`}
                aria-pressed={active}
              >
                {category.key === 'Todos' ? (
                  <span className="category-chip__all" aria-hidden="true">
                    <svg width="16" height="16"><use href="#cat-todos" /></svg>
                  </span>
                ) : (
                  <CategoryIcon category={category.label} size={28} />
                )}
                {category.label}
              </button>
            )
          })}
        </div>

        {error && <Notice variant="danger">{error}</Notice>}

        <Card className="product-list">
          {visibleProducts.map((product) => {
            const info = categoryInfo(product.category)
            return (
              <div key={product.id} className="product-row">
                <CategoryIcon category={product.category} size={40} />
                <div className="product-row__text">
                  <div className="product-row__name">{product.name}</div>
                  <div className="product-row__category">{info.short}</div>
                </div>
                <span className="product-row__price">{formatCurrency(product.price)}</span>
                <button
                  type="button"
                  onClick={() => toggleAvailability(product)}
                  className={`availability ${product.available ? 'availability--on' : 'availability--off'}`}
                  title={product.available ? 'Marcar como agotado' : 'Marcar como disponible'}
                >
                  <span className="availability__dot" />
                  {product.available ? 'Disponible' : 'Agotado'}
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setForm({ id: product.id, name: product.name, category: product.category || '', price: product.price })}
                  aria-label={`Editar ${product.name}`}
                  title="Editar"
                >
                  <svg width="17" height="17" aria-hidden="true"><use href="#ic-edit" /></svg>
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => handleDelete(product.id)}
                  aria-label="Eliminar"
                  title="Eliminar"
                >
                  <svg width="16" height="16" aria-hidden="true"><use href="#ic-trash" /></svg>
                </button>
              </div>
            )
          })}
        </Card>
      </div>

      {form && (
        <ProductFormModal
          form={form}
          setForm={setForm}
          categories={categories.filter((c) => c.key !== 'Todos')}
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
