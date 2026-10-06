import { useEffect, useState, useRef } from 'react'
import { listBackups, restoreFromBackup, restoreFromFile } from '../api/backup'
import { resetAdminPassword } from '../api/businessSettings'
import { Button, Card, Field, Input, Notice } from '../components/ui'
import neveoLogo from '../assets/neveo-logo.png'
import './DatabaseRestorePage.css'

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
      <div className="support-page">
        <Card className="support-card support-card--result">
          <span className="support-result__icon" aria-hidden="true">
            <svg width="30" height="30"><use href="#ic-check" /></svg>
          </span>
          <h1 className="support-card__title">Restauración completada</h1>
          <p className="support-card__text">{result.message}</p>
          {result.preRestoreBackup && (
            <p className="support-result__backup">
              Respaldo previo guardado como: <span className="support-filename">{result.preRestoreBackup}</span>
            </p>
          )}
          <Notice variant="warning">Cierra y vuelve a abrir la aplicación para que los cambios tomen efecto.</Notice>
        </Card>
      </div>
    )
  }

  return (
    <div className="support-page">
      <Card className="support-card">
        <div className="support-brand">
          <img src={neveoLogo} alt="Neveo" className="support-brand__logo" />
          <span className="support-label">Soporte — Acceso restringido</span>
        </div>
        <div>
          <h1 className="support-card__title">Restaurar base de datos</h1>
          <p className="support-card__text">
            Esta operación reemplaza todos los datos actuales. No se puede deshacer fácilmente.
          </p>
        </div>

        {loadError && <Notice variant="danger">{loadError}</Notice>}

        {/* Backups automaticos */}
        <div className="support-section">
          <div className="support-label">Backups automáticos disponibles</div>
          {backups.length === 0 ? (
            <p className="support-card__text">No hay backups automáticos guardados.</p>
          ) : (
            <div className="backup-list" role="radiogroup" aria-label="Backups automáticos">
              {backups.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={selected === name}
                  onClick={() => { setSelected(name); setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className={`backup-list__item ${selected === name ? 'backup-list__item--active' : ''}`}
                >
                  <span className="backup-list__radio" aria-hidden="true" />
                  <span className="support-filename">{name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Archivo manual */}
        <div className="support-section">
          <div className="support-label">O sube un archivo .db manualmente</div>
          <div className="support-upload">
            <Button variant="neutral" size="sm" onClick={() => fileInputRef.current?.click()}>
              Seleccionar archivo
            </Button>
            {uploadFile && <span className="support-filename">{uploadFile.name}</span>}
            <input
              ref={fileInputRef}
              type="file"
              accept=".db"
              hidden
              onChange={(e) => {
                const f = e.target.files[0]
                if (f) { setUploadFile(f); setSelected(null) }
              }}
            />
          </div>
        </div>

        {/* Confirmacion */}
        <div className="danger-zone">
          <div className="danger-zone__title">
            Esta acción reemplaza todos los datos actuales y no se puede deshacer fácilmente.
          </div>
          <Field label="Escribe RESTAURAR para confirmar">
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="RESTAURAR"
              className="danger-zone__input"
            />
          </Field>
        </div>

        {error && <Notice variant="danger">{error}</Notice>}

        <Button variant="danger" size="lg" block onClick={handleRestore} disabled={!canRestore} aria-busy={restoring}>
          {restoring ? 'Restaurando...' : 'Restaurar base de datos'}
        </Button>

        {/* Restablecer contraseña de administrador (doble confirmacion) */}
        <div className="support-reset">
          <h2 className="support-reset__title">Restablecer contraseña de administrador</h2>
          <p className="support-card__text">
            Borra la contraseña olvidada. Después hay que crear una nueva en Configuración para poder anular ventas.
          </p>
          {resetDone && (
            <Notice variant="success">✓ Contraseña restablecida. Configura una nueva en Configuración.</Notice>
          )}
          {!resetStep ? (
            <div>
              <Button
                variant="danger-outline"
                size="sm"
                onClick={() => { setResetStep(true); setResetDone(false); setResetError('') }}
              >
                Restablecer contraseña
              </Button>
            </div>
          ) : (
            <div className="danger-zone">
              <Field label="Escribe RESTABLECER para confirmar">
                <Input
                  value={resetConfirmation}
                  onChange={(e) => setResetConfirmation(e.target.value)}
                  placeholder="RESTABLECER"
                  className="danger-zone__input"
                />
              </Field>
              {resetError && <Notice variant="danger">{resetError}</Notice>}
              <div className="danger-zone__actions">
                <Button variant="neutral" onClick={() => { setResetStep(false); setResetConfirmation('') }}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleResetPassword} disabled={resetConfirmation !== 'RESTABLECER'}>
                  Confirmar restablecimiento
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
