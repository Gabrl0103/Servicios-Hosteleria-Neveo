import { useEffect, useState, useRef } from 'react'
import { listBackups, restoreFromBackup, restoreFromFile } from '../api/backup'
import { resetAdminPassword } from '../api/businessSettings'

export default function DatabaseRestorePage() {
  const [backups, setBackups] = useState([])
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [confirmation, setConfirmation] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const [resetConfirmation, setResetConfirmation] = useState('')
  const [resetStep, setResetStep] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [resetError, setResetError] = useState('')

  useEffect(() => {
    listBackups()
      .then(setBackups)
      .catch((err) => setLoadError(err.message))
  }, [])

  const canRestore = confirmation === 'RESTAURAR' && (selected || uploadFile) && !restoring && !result

  async function handleRestore() {
    if (!canRestore) return
    setRestoring(true)
    setError('')
    try {
      const res = uploadFile
        ? await restoreFromFile(uploadFile)
        : await restoreFromBackup(selected)
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setRestoring(false)
    }
  }

  async function handleResetPassword() {
    if (resetConfirmation !== 'RESTABLECER') return
    setResetError('')
    try {
      await resetAdminPassword(resetConfirmation)
      setResetDone(true)
      setResetStep(false)
      setResetConfirmation('')
    } catch (err) {
      setResetError(err.message)
    }
  }

  if (result) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#065f46', marginBottom: 8 }}>
            Restauración completada
          </div>
          <p style={{ color: 'var(--text-soft)', fontSize: 14, fontWeight: 700, marginBottom: 20 }}>
            {result.message}
          </p>
          {result.preRestoreBackup && (
            <p style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 700 }}>
              Respaldo previo guardado como: <span style={{ fontFamily: 'monospace' }}>{result.preRestoreBackup}</span>
            </p>
          )}
          <div style={{ marginTop: 24, padding: '16px 20px', background: '#fef3c7', borderRadius: 12, fontSize: 13, fontWeight: 800, color: '#92400e' }}>
            Cierra y vuelve a abrir la aplicación para que los cambios tomen efecto.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: 640 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
          Soporte — Acceso restringido
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px', color: 'var(--ink)' }}>
          Restaurar base de datos
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 700, margin: '0 0 24px' }}>
          Esta operación reemplaza todos los datos actuales. No se puede deshacer fácilmente.
        </p>

        {loadError && (
          <p style={{ color: 'var(--red-text)', fontSize: 13, marginBottom: 16 }}>{loadError}</p>
        )}

        {/* Backup list */}
        <div style={{ marginBottom: 20 }}>
          <div style={labelStyle}>Backups automáticos disponibles</div>
          {backups.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-faint)', fontWeight: 700 }}>No hay backups automáticos guardados.</p>
          ) : (
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
              {backups.map((name) => (
                <div
                  key={name}
                  onClick={() => { setSelected(name); setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    fontWeight: 700,
                    borderBottom: '1px solid var(--border-soft-2)',
                    background: selected === name ? 'var(--ink)' : 'transparent',
                    color: selected === name ? '#fff' : 'var(--ink)',
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* File upload */}
        <div style={{ marginBottom: 24 }}>
          <div style={labelStyle}>O sube un archivo .db manualmente</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ background: 'var(--tile-bg)', border: 'none', padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 800, color: 'var(--ink)', cursor: 'pointer' }}
            >
              Seleccionar archivo
            </button>
            {uploadFile && (
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{uploadFile.name}</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".db"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files[0]
                if (f) { setUploadFile(f); setSelected(null) }
              }}
            />
          </div>
        </div>

        {/* Confirmation */}
        <div style={{ marginBottom: 20, padding: '16px 18px', background: '#fef2f2', borderRadius: 12, border: '1px solid #fca5a5' }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#991b1b', marginBottom: 10 }}>
            Esta acción reemplaza todos los datos actuales y no se puede deshacer fácilmente.
          </div>
          <div style={labelStyle}>Escribe RESTAURAR para confirmar</div>
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="RESTAURAR"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #fca5a5',
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 800,
              fontFamily: 'monospace',
              background: '#fff',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && <p style={{ color: 'var(--red-text)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button
          onClick={handleRestore}
          disabled={!canRestore}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: 15,
            fontWeight: 900,
            borderRadius: 12,
            border: 'none',
            cursor: canRestore ? 'pointer' : 'not-allowed',
            background: canRestore ? '#dc2626' : 'var(--border)',
            color: canRestore ? '#fff' : 'var(--text-faint)',
          }}
        >
          {restoring ? 'Restaurando...' : 'Restaurar base de datos'}
        </button>

        {/* Restablecer contraseña de administrador (doble confirmacion) */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 900, margin: '0 0 4px', color: 'var(--ink)' }}>
            Restablecer contraseña de administrador
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 700, margin: '0 0 16px' }}>
            Borra la contraseña olvidada. Después hay que crear una nueva en Configuración para poder anular ventas.
          </p>
          {resetDone && (
            <p style={{ fontSize: 13, fontWeight: 800, color: '#065f46', marginBottom: 12 }}>
              ✓ Contraseña restablecida. Configura una nueva en Configuración.
            </p>
          )}
          {!resetStep ? (
            <button
              type="button"
              onClick={() => { setResetStep(true); setResetDone(false); setResetError('') }}
              style={{ background: 'var(--tile-bg)', border: 'none', padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 800, color: 'var(--ink)', cursor: 'pointer' }}
            >
              Restablecer contraseña
            </button>
          ) : (
            <div style={{ padding: '16px 18px', background: '#fef2f2', borderRadius: 12, border: '1px solid #fca5a5' }}>
              <div style={labelStyle}>Escribe RESTABLECER para confirmar</div>
              <input
                value={resetConfirmation}
                onChange={(e) => setResetConfirmation(e.target.value)}
                placeholder="RESTABLECER"
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #fca5a5', borderRadius: 9, fontSize: 14, fontWeight: 800, fontFamily: 'monospace', background: '#fff', boxSizing: 'border-box', marginBottom: 12 }}
              />
              {resetError && <p style={{ color: 'var(--red-text)', fontSize: 13, marginBottom: 10 }}>{resetError}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => { setResetStep(false); setResetConfirmation('') }}
                  style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid var(--border)', background: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetConfirmation !== 'RESTABLECER'}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 800,
                    cursor: resetConfirmation === 'RESTABLECER' ? 'pointer' : 'not-allowed',
                    background: resetConfirmation === 'RESTABLECER' ? '#dc2626' : 'var(--border)',
                    color: resetConfirmation === 'RESTABLECER' ? '#fff' : 'var(--text-faint)',
                  }}
                >
                  Confirmar restablecimiento
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const pageStyle = {
  minHeight: '100vh',
  background: '#e7e0d3',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 32,
}

const cardStyle = {
  background: '#fff',
  borderRadius: 18,
  padding: '32px 36px',
  width: '100%',
  maxWidth: 540,
  boxShadow: '0 4px 24px rgba(0,0,0,.10)',
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: 'var(--text-faint)',
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  marginBottom: 8,
  display: 'block',
}
