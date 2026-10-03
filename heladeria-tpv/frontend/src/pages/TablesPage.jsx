import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getTables, createTable, renameTable, deleteTable, updateTablePosition } from '../api/tables'
import { formatCurrency } from '../utils/format'
import { useSession } from '../context/SessionContext'

const CARD_W = 180
const CARD_H = 120
const GRID_GAP = 14
const COLS = 5

export default function TablesPage() {
  const { cashRegister } = useSession()
  const [tables, setTables] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  // Confirmacion que llega desde el detalle de mesa ("Cuenta guardada: $X").
  const [notice, setNotice] = useState(location.state?.notice || '')

  const containerRef = useRef(null)
  const dragRef = useRef(null)
  const wasDragRef = useRef(false)

  function load() {
    getTables().then((loaded) => {
      const needsPosition = loaded.filter((t) => t.positionX == null || t.positionY == null)
      if (needsPosition.length > 0) {
        const assigned = loaded.map((t, i) => {
          if (t.positionX != null && t.positionY != null) return t
          const col = i % COLS
          const row = Math.floor(i / COLS)
          const px = col * (CARD_W + GRID_GAP)
          const py = row * (CARD_H + GRID_GAP)
          updateTablePosition(t.id, px, py).catch(() => {})
          return { ...t, positionX: px, positionY: py }
        })
        setTables(assigned)
      } else {
        setTables(loaded)
      }
    }).catch((err) => setError(err.message))
  }

  useEffect(() => {
    if (!cashRegister) {
      navigate('/turno')
      return
    }
    load()
  }, [cashRegister, navigate])

  useEffect(() => {
    if (!notice) return
    // Limpia el estado de navegacion para que no reaparezca al recargar.
    navigate('.', { replace: true, state: null })
    const id = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(id)
  }, [notice, navigate])

  const handleMouseDown = useCallback((e, table) => {
    if (e.button !== 0) return
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    dragRef.current = {
      tableId: table.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: table.positionX,
      origY: table.positionY,
      containerRect: rect,
      moved: false,
    }
  }, [])

  useEffect(() => {
    function handleMouseMove(e) {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      if (!d.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
      d.moved = true
      const maxX = d.containerRect.width - CARD_W
      const maxY = d.containerRect.height - CARD_H
      const newX = Math.max(0, Math.min(d.origX + dx, maxX))
      const newY = Math.max(0, Math.min(d.origY + dy, maxY))
      setTables((prev) =>
        prev.map((t) => (t.id === d.tableId ? { ...t, positionX: newX, positionY: newY } : t))
      )
    }

    function handleMouseUp() {
      const d = dragRef.current
      if (!d) return
      dragRef.current = null
      if (d.moved) {
        wasDragRef.current = true
        const table = document.querySelector(`[data-table-id="${d.tableId}"]`)
        if (table) {
          const finalX = parseFloat(table.style.left)
          const finalY = parseFloat(table.style.top)
          updateTablePosition(d.tableId, finalX, finalY).catch(() => {})
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  function handleCardClick(e, table) {
    if (wasDragRef.current) {
      wasDragRef.current = false
      return
    }
    navigate(`/mesas/${table.id}`)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await createTable(newName.trim())
      setNewName('')
      setCreating(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRename(e) {
    e.preventDefault()
    if (!editing.name.trim()) return
    try {
      await renameTable(editing.id, editing.name.trim())
      setEditing(null)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(table) {
    const confirmed = window.confirm(`Eliminar la mesa "${table.name}"?`)
    if (!confirmed) return
    try {
      await deleteTable(table.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!cashRegister) return null

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 25, fontWeight: 900, margin: '0 0 4px' }}>Mesas</h1>
            <p style={{ fontSize: 14, color: 'var(--text-soft)', fontWeight: 700, margin: 0 }}>
              Arrastra las mesas para organizarlas. Toca una para ver sus productos.
            </p>
          </div>
          <button onClick={() => setCreating(true)} className="btn-ink" style={{ padding: '13px 20px', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18"><use href="#ic-plus" /></svg>
            Nueva mesa
          </button>
        </div>

        {notice && (
          <p style={{ display: 'inline-block', background: 'var(--green-bg)', border: '1px solid var(--green-border)', color: 'var(--green-text)', fontSize: 14, fontWeight: 800, padding: '8px 14px', borderRadius: 10, margin: '0 0 12px' }}>
            ✓ {notice}
          </p>
        )}
        {error && <p style={{ color: 'var(--red-text)' }}>{error}</p>}

        <div
          ref={containerRef}
          style={{ position: 'relative', width: '100%', minHeight: 600, userSelect: 'none' }}
        >
          {tables.map((table) => {
            const occupied = Number(table.pendingTotal) > 0
            return (
              <div
                key={table.id}
                data-table-id={table.id}
                className="card"
                style={{
                  position: 'absolute',
                  left: table.positionX ?? 0,
                  top: table.positionY ?? 0,
                  width: CARD_W,
                  padding: 18,
                  border: occupied ? '2px solid var(--accent)' : '1px solid var(--border)',
                  cursor: 'grab',
                }}
                onMouseDown={(e) => handleMouseDown(e, table)}
                onClick={(e) => handleCardClick(e, table)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: occupied ? 'var(--accent)' : 'var(--text-faint)' }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: occupied ? 'var(--accent)' : 'var(--text-soft)' }}>
                    {occupied ? 'OCUPADA' : 'DISPONIBLE'}
                  </span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)' }}>{table.name}</div>
                <div className="mono" style={{ fontSize: occupied ? 19 : 13, fontWeight: 700, color: occupied ? 'var(--accent)' : 'var(--text-faint)', marginTop: 8 }}>
                  {formatCurrency(table.pendingTotal)}
                </div>

                <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setEditing({ id: table.id, name: table.name })}
                    aria-label="Editar"
                    style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--tile-bg)', display: 'grid', placeItems: 'center', border: 'none' }}
                  >
                    <svg width="12" height="12"><use href="#ic-edit" /></svg>
                  </button>
                  <button
                    onClick={() => handleDelete(table)}
                    aria-label="Eliminar"
                    style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--tile-bg)', display: 'grid', placeItems: 'center', border: 'none' }}
                  >
                    <svg width="11" height="11"><use href="#ic-x" /></svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {tables.length === 0 && !error && (
          <p style={{ color: 'var(--text-soft)', fontSize: 14, marginTop: 20 }}>
            Aún no hay mesas creadas. Crea la primera con "Nueva mesa".
          </p>
        )}
      </div>

      {creating && (
        <div
          onClick={() => setCreating(false)}
          style={{ position: 'absolute', inset: 0, background: 'rgba(42,38,34,.42)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40 }}
        >
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} style={{ background: '#fff', width: 340, borderRadius: 20, boxShadow: 'var(--shadow-modal)', padding: 24 }}>
            <h3 style={{ marginTop: 0, fontWeight: 900 }}>Nueva mesa</h3>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Cliente 1, Pipe, Manu..."
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 15, marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setCreating(false)} className="btn-outline" style={{ flex: 1, padding: 12 }}>
                Cancelar
              </button>
              <button type="submit" className="btn-ink" style={{ flex: 1, padding: 12 }}>
                Crear
              </button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <div
          onClick={() => setEditing(null)}
          style={{ position: 'absolute', inset: 0, background: 'rgba(42,38,34,.42)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40 }}
        >
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleRename} style={{ background: '#fff', width: 340, borderRadius: 20, boxShadow: 'var(--shadow-modal)', padding: 24 }}>
            <h3 style={{ marginTop: 0, fontWeight: 900 }}>Renombrar mesa</h3>
            <input
              autoFocus
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 15, marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setEditing(null)} className="btn-outline" style={{ flex: 1, padding: 12 }}>
                Cancelar
              </button>
              <button type="submit" className="btn-ink" style={{ flex: 1, padding: 12 }}>
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
