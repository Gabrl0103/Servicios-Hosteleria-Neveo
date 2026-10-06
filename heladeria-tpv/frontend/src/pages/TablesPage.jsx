import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getTables, createTable, renameTable, deleteTable, updateTablePosition } from '../api/tables'
import { formatCurrency } from '../utils/format'
import { useSession } from '../context/SessionContext'
import { Button, Card, Chip, Input, Modal, Notice } from '../components/ui'
import './TablesPage.css'

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
  const newNameRef = useRef(null)
  const editNameRef = useRef(null)

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
    <div className="tables-page">
      <div className="tables-page__header">
        <h1 className="ui-page-title">Mesas</h1>
        <div className="tables-page__legend">
          <span className="tables-page__legend-item">
            <span className="tables-page__legend-dot" style={{ background: 'var(--color-success)' }} />
            Disponible
          </span>
          <span className="tables-page__legend-item">
            <span className="tables-page__legend-dot" style={{ background: 'var(--color-primary)' }} />
            Ocupada
          </span>
        </div>

        <div className="tables-page__actions">
          <span className="tables-page__hint">Arrastra las mesas para organizarlas. Toca una para ver sus productos.</span>
          {notice && (
            <Notice variant="success" icon={<CheckIcon />} className="tables-page__notice">
              {notice}
            </Notice>
          )}
          <Button size="sm" onClick={() => setCreating(true)}>
            <svg width="18" height="18"><use href="#ic-plus" /></svg>
            Nueva mesa
          </Button>
        </div>
      </div>

      {error && <Notice variant="danger">{error}</Notice>}

      <div className="tables-plan">
        <div ref={containerRef} className="tables-plan__area">
          {tables.map((table) => {
            const occupied = Number(table.pendingTotal) > 0
            return (
              <Card
                key={table.id}
                data-table-id={table.id}
                className={`table-card ${occupied ? 'table-card--busy' : 'table-card--free'}`}
                style={{
                  left: table.positionX ?? 0,
                  top: table.positionY ?? 0,
                  width: CARD_W,
                  height: CARD_H,
                }}
                onMouseDown={(e) => handleMouseDown(e, table)}
                onClick={(e) => handleCardClick(e, table)}
              >
                <div className="table-card__top">
                  <span className="table-card__name" title={table.name}>{table.name}</span>
                  <svg className="table-card__handle" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 6h.01 M15 6h.01 M9 12h.01 M15 12h.01 M9 18h.01 M15 18h.01" />
                  </svg>
                </div>

                <div className="table-card__bottom">
                  <div className="table-card__status">
                    <Chip variant={occupied ? 'primary' : 'success'}>{occupied ? 'Ocupada' : 'Disponible'}</Chip>
                    <div className="table-card__tools" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="table-card__tool"
                        onClick={() => setEditing({ id: table.id, name: table.name })}
                        aria-label="Editar"
                        title="Renombrar"
                      >
                        <svg width="13" height="13"><use href="#ic-edit" /></svg>
                      </button>
                      <button
                        type="button"
                        className="table-card__tool"
                        onClick={() => handleDelete(table)}
                        aria-label="Eliminar"
                        title="Eliminar"
                      >
                        <svg width="12" height="12"><use href="#ic-x" /></svg>
                      </button>
                    </div>
                  </div>
                  {occupied
                    ? <span className="table-card__amount">{formatCurrency(table.pendingTotal)}</span>
                    : <span className="table-card__empty">Sin pendiente</span>}
                </div>
              </Card>
            )
          })}

          {tables.length === 0 && !error && (
            <p className="tables-plan__empty">Aún no hay mesas creadas. Crea la primera con "Nueva mesa".</p>
          )}
        </div>
      </div>

      {creating && (
        <Modal
          title="Nueva mesa"
          width={360}
          onClose={() => setCreating(false)}
          initialFocusRef={newNameRef}
          footer={(
            <>
              <Button variant="neutral" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button type="submit" form="new-table-form">Crear</Button>
            </>
          )}
        >
          <form id="new-table-form" onSubmit={handleCreate}>
            <Input
              ref={newNameRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Cliente 1, Pipe, Manu..."
            />
          </form>
        </Modal>
      )}

      {editing && (
        <Modal
          title="Renombrar mesa"
          width={360}
          onClose={() => setEditing(null)}
          initialFocusRef={editNameRef}
          footer={(
            <>
              <Button variant="neutral" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" form="rename-table-form">Guardar</Button>
            </>
          )}
        >
          <form id="rename-table-form" onSubmit={handleRename}>
            <Input
              ref={editNameRef}
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </form>
        </Modal>
      )}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}
