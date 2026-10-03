import { useEffect, useState, useRef } from 'react'
import { getBusinessSettings, updateBusinessSettings, updateAdminPassword } from '../api/businessSettings'
import { getCashiers, createCashier, deleteCashier } from '../api/cashiers'
import { downloadBackup } from '../api/backup'

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

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--ink)',
    background: '#fff',
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <h1 style={{ fontSize: 25, fontWeight: 900, margin: '0 0 4px' }}>Configuración</h1>
        <p style={{ fontSize: 14, color: 'var(--text-soft)', fontWeight: 700, margin: '0 0 24px' }}>
          Datos del negocio, cajeros y respaldo de datos.
        </p>

        {/* Datos del negocio */}
        <div className="card" style={{ padding: 26, marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)', marginBottom: 4 }}>Datos del negocio</div>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 700, margin: '0 0 18px' }}>
            Aparecen en los comprobantes de cierre de turno y venta.
          </p>

          <form onSubmit={handleSaveSettings}>
            {/* Logo */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                Logo del negocio
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 72, height: 72, borderRadius: 14,
                    background: settings.logoBase64 ? 'transparent' : 'var(--tile-bg)',
                    border: '2px dashed var(--border)',
                    display: 'grid', placeItems: 'center',
                    cursor: 'pointer', overflow: 'hidden', flex: 'none',
                  }}
                >
                  {settings.logoBase64 ? (
                    <img src={settings.logoBase64} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: 28, color: 'var(--text-faint)' }}>+</span>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: 'var(--tile-bg)', border: 'none', padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 800, color: 'var(--ink)', cursor: 'pointer' }}
                  >
                    {settings.logoBase64 ? 'Cambiar logo' : 'Subir logo'}
                  </button>
                  {settings.logoBase64 && (
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, logoBase64: null }))}
                      style={{ background: 'none', border: 'none', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', cursor: 'pointer' }}
                    >
                      Quitar
                    </button>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>PNG, JPG. Máx. 2 MB.</div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} style={{ display: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  Nombre del negocio
                </label>
                <input style={inputStyle} value={settings.businessName} onChange={(e) => setSettings({ ...settings, businessName: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  NIT
                </label>
                <input style={inputStyle} value={settings.nit || ''} onChange={(e) => setSettings({ ...settings, nit: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  Dirección
                </label>
                <input style={inputStyle} value={settings.address || ''} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  Teléfono
                </label>
                <input style={inputStyle} value={settings.phone || ''} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  Horario de atención
                </label>
                <input style={inputStyle} placeholder="Ej: Lun-Sáb 10am-8pm" value={settings.businessHours || ''} onChange={(e) => setSettings({ ...settings, businessHours: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  Instagram
                </label>
                <input style={inputStyle} placeholder="@tunegocio" value={settings.instagramHandle || ''} onChange={(e) => setSettings({ ...settings, instagramHandle: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  Facebook
                </label>
                <input style={inputStyle} placeholder="URL de Facebook" value={settings.facebookUrl || ''} onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  WhatsApp
                </label>
                <input style={inputStyle} placeholder="Ej: 310 123 4567" value={settings.whatsappNumber || ''} onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })} />
              </div>
            </div>

            {settingsError && <p style={{ color: 'var(--red-text)', fontSize: 13, marginBottom: 10 }}>{settingsError}</p>}

            <button type="submit" className="btn-ink" style={{ padding: '12px 22px', fontSize: 14 }}>
              {saved ? '✓ Guardado' : 'Guardar cambios'}
            </button>
          </form>
        </div>

        {/* Cajeros */}
        <div className="card" style={{ padding: 26, marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)', marginBottom: 4 }}>Cajeros</div>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 700, margin: '0 0 18px' }}>
            Personas que pueden atender un turno de caja.
          </p>

          {cashierError && <p style={{ color: 'var(--red-text)', fontSize: 13, marginBottom: 10 }}>{cashierError}</p>}

          {cashiers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 14 }}>
              No hay cajeros configurados.
            </p>
          ) : (
            <div style={{ marginBottom: 14 }}>
              {cashiers.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: '1px solid var(--border-soft-2)',
                  }}
                >
                  <span style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 15 }}>{c.name}</span>
                  <button
                    onClick={() => handleDeleteCashier(c.id, c.name)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-faint)',
                      cursor: 'pointer',
                      padding: 6,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <svg width="16" height="16"><use href="#ic-trash" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddCashier} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Nombre del cajero"
              value={newCashierName}
              onChange={(e) => setNewCashierName(e.target.value)}
            />
            <button type="submit" className="btn-ink" style={{ padding: '10px 18px', fontSize: 14, whiteSpace: 'nowrap' }}>
              Agregar cajero
            </button>
          </form>
        </div>

        {/* Contraseña de administrador */}
        <div className="card" style={{ padding: 26, marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)', marginBottom: 4 }}>Contraseña de administrador</div>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 700, margin: '0 0 18px' }}>
            {adminPasswordSet
              ? 'Se pide para anular ventas. Para cambiarla escribe la actual.'
              : 'Aún no está configurada. Es necesaria para anular ventas. Mínimo 4 caracteres (puede ser un PIN).'}
          </p>
          <form onSubmit={handleSavePassword}>
            <div style={{ display: 'grid', gridTemplateColumns: adminPasswordSet ? '1fr 1fr 1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {adminPasswordSet && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                    Contraseña actual
                  </label>
                  <input type="password" autoComplete="off" style={inputStyle} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  Nueva contraseña
                </label>
                <input type="password" autoComplete="new-password" style={inputStyle} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  Repetir nueva contraseña
                </label>
                <input type="password" autoComplete="new-password" style={inputStyle} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            {passwordError && <p style={{ color: 'var(--red-text)', fontSize: 13, marginBottom: 10 }}>{passwordError}</p>}
            <button type="submit" className="btn-ink" style={{ padding: '12px 22px', fontSize: 14 }}>
              {passwordSaved ? '✓ Guardada' : adminPasswordSet ? 'Cambiar contraseña' : 'Crear contraseña'}
            </button>
          </form>
        </div>

        {/* Respaldo */}
        <div className="card" style={{ padding: 26 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)', marginBottom: 4 }}>Respaldo de datos</div>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 700, margin: '0 0 18px' }}>
            Descarga una copia de seguridad de toda la información del sistema.
          </p>
          <button onClick={downloadBackup} className="btn-ink" style={{ padding: '12px 22px', fontSize: 14 }}>
            Descargar copia de seguridad
          </button>
        </div>
      </div>
    </div>
  )
}
