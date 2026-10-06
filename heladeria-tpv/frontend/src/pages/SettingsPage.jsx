import { useEffect, useState, useRef } from 'react'
import { getBusinessSettings, updateBusinessSettings, updateAdminPassword } from '../api/businessSettings'
import { getCashiers, createCashier, deleteCashier } from '../api/cashiers'
import { downloadBackup } from '../api/backup'
import { Button, Card, Field, Input, Notice } from '../components/ui'
import './SettingsPage.css'

const MAX_LOGO_SIZE = 2 * 1024 * 1024

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    businessName: '', nit: '', address: '', phone: '',
    logoBase64: null, businessHours: '', instagramHandle: '', facebookUrl: '', whatsappNumber: '',
  })
  const [saved, setSaved] = useState(false)
  const [settingsError, setSettingsError] = useState('')

  const [cashiers, setCashiers] = useState([])
  const [newCashierName, setNewCashierName] = useState('')
  const [cashierError, setCashierError] = useState('')

  const [adminPasswordSet, setAdminPasswordSet] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  const fileInputRef = useRef(null)

  useEffect(() => {
    getBusinessSettings()
      .then((s) => {
        setSettings(s)
        setAdminPasswordSet(!!s.adminPasswordSet)
      })
      .catch(() => {})
    getCashiers().then(setCashiers).catch(() => {})
  }, [])

  async function handleSaveSettings(e) {
    e.preventDefault()
    setSettingsError('')
    setSaved(false)
    try {
      const updated = await updateBusinessSettings(settings)
      setSettings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSettingsError(err.message)
    }
  }

  async function handleSavePassword(e) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSaved(false)
    if (newPassword.length < 4) {
      setPasswordError('La contraseña debe tener al menos 4 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden')
      return
    }
    try {
      await updateAdminPassword(adminPasswordSet ? currentPassword : null, newPassword)
      setAdminPasswordSet(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 2500)
    } catch (err) {
      setPasswordError(err.message)
    }
  }

  function handleLogoSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setSettingsError('El archivo debe ser una imagen')
      return
    }
    if (file.size > MAX_LOGO_SIZE) {
      setSettingsError('La imagen no debe superar 2 MB')
      return
    }
    setSettingsError('')
    const reader = new FileReader()
    reader.onload = () => {
      setSettings((prev) => ({ ...prev, logoBase64: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  async function handleAddCashier(e) {
    e.preventDefault()
    if (!newCashierName.trim()) return
    setCashierError('')
    try {
      const created = await createCashier(newCashierName.trim())
      setCashiers((prev) => [...prev, created])
      setNewCashierName('')
    } catch (err) {
      setCashierError(err.message)
    }
  }

  async function handleDeleteCashier(id, name) {
    if (!window.confirm(`¿Eliminar al cajero "${name}"?`)) return
    setCashierError('')
    try {
      await deleteCashier(id)
      setCashiers((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setCashierError(err.message)
    }
  }

  const businessFields = [
    { key: 'businessName', label: 'Nombre del negocio', required: true },
    { key: 'nit', label: 'NIT' },
    { key: 'address', label: 'Dirección' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'businessHours', label: 'Horario de atención', placeholder: 'Ej: Lun-Sáb 10am-8pm' },
    { key: 'instagramHandle', label: 'Instagram', placeholder: '@tunegocio' },
    { key: 'facebookUrl', label: 'Facebook', placeholder: 'URL de Facebook' },
    { key: 'whatsappNumber', label: 'WhatsApp', placeholder: 'Ej: 310 123 4567' },
  ]

  return (
    <div className="settings-page">
      <div className="settings-page__inner">
        <header className="settings-page__header">
          <h1 className="ui-page-title">Configuración</h1>
          <p className="settings-page__subtitle">Datos del negocio, cajeros y respaldo de datos.</p>
        </header>

        <div className="settings-grid">
          {/* Datos del negocio */}
          <Card className="settings-card">
            <h2 className="settings-card__title">Datos del negocio</h2>
            <p className="settings-card__text">Aparecen en los comprobantes de cierre de turno y venta.</p>

            <form onSubmit={handleSaveSettings} className="settings-form">
              <div className="ui-field">
                <span className="ui-field__label">Logo del negocio</span>
                <div className="logo-picker">
                  <button
                    type="button"
                    className={`logo-picker__preview ${settings.logoBase64 ? 'logo-picker__preview--filled' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={settings.logoBase64 ? 'Cambiar logo' : 'Subir logo'}
                  >
                    {settings.logoBase64 ? (
                      <img src={settings.logoBase64} alt="Logo" />
                    ) : (
                      <svg width="24" height="24" aria-hidden="true"><use href="#ic-plus" /></svg>
                    )}
                  </button>
                  <div className="logo-picker__actions">
                    <div className="logo-picker__buttons">
                      <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                        {settings.logoBase64 ? 'Cambiar logo' : 'Subir logo'}
                      </Button>
                      {settings.logoBase64 && (
                        <Button variant="danger-text" onClick={() => setSettings((prev) => ({ ...prev, logoBase64: null }))}>
                          Quitar
                        </Button>
                      )}
                    </div>
                    <div className="ui-field__hint">PNG, JPG. Máx. 2 MB. Se usa en los recibos.</div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} hidden />
                </div>
              </div>

              <div className="settings-form__grid">
                {businessFields.map((f) => (
                  <Field key={f.key} label={f.label}>
                    <Input
                      value={settings[f.key] || ''}
                      onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      required={f.required}
                    />
                  </Field>
                ))}
              </div>

              {settingsError && <Notice variant="danger">{settingsError}</Notice>}

              <div>
                <Button type="submit">{saved ? '✓ Guardado' : 'Guardar cambios'}</Button>
              </div>
            </form>
          </Card>

          <div className="settings-grid__side">
            {/* Cajeros */}
            <Card className="settings-card">
              <h2 className="settings-card__title">Cajeros</h2>
              <p className="settings-card__text">Personas que pueden atender un turno de caja.</p>

              {cashierError && <Notice variant="danger">{cashierError}</Notice>}

              {cashiers.length === 0 ? (
                <p className="settings-card__empty">No hay cajeros configurados.</p>
              ) : (
                <div className="cashier-list">
                  {cashiers.map((c) => (
                    <div key={c.id} className="cashier-list__row">
                      <span className="cashier-list__avatar" aria-hidden="true">{c.name.trim().charAt(0).toUpperCase()}</span>
                      <span className="cashier-list__name">{c.name}</span>
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        onClick={() => handleDeleteCashier(c.id, c.name)}
                        aria-label={`Eliminar al cajero ${c.name}`}
                        title="Eliminar cajero"
                      >
                        <svg width="16" height="16" aria-hidden="true"><use href="#ic-trash" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddCashier} className="settings-inline-form">
                <Input
                  placeholder="Nombre del cajero"
                  value={newCashierName}
                  onChange={(e) => setNewCashierName(e.target.value)}
                  aria-label="Nombre del cajero"
                />
                <Button type="submit" variant="secondary">Agregar cajero</Button>
              </form>
            </Card>

            {/* Contraseña de administrador */}
            <Card className="settings-card">
              <h2 className="settings-card__title">Contraseña de administrador</h2>
              <p className="settings-card__text">
                {adminPasswordSet
                  ? 'Se pide para anular ventas. Para cambiarla escribe la actual.'
                  : 'Aún no está configurada. Es necesaria para anular ventas. Mínimo 4 caracteres (puede ser un PIN).'}
              </p>
              <form onSubmit={handleSavePassword} className="settings-form">
                {adminPasswordSet && (
                  <Field label="Contraseña actual">
                    <Input type="password" autoComplete="off" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                  </Field>
                )}
                <Field label="Nueva contraseña">
                  <Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </Field>
                <Field label="Repetir nueva contraseña">
                  <Input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </Field>
                {passwordError && <Notice variant="danger">{passwordError}</Notice>}
                <div>
                  <Button type="submit">
                    {passwordSaved ? '✓ Guardada' : adminPasswordSet ? 'Cambiar contraseña' : 'Crear contraseña'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Respaldo */}
            <Card className="settings-card">
              <h2 className="settings-card__title">Respaldo de datos</h2>
              <p className="settings-card__text">Descarga una copia de seguridad de toda la información del sistema.</p>
              <div>
                <Button variant="secondary" onClick={downloadBackup}>Descargar copia de seguridad</Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
