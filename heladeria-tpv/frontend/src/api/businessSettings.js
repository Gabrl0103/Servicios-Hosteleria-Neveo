import client from './client'

export async function getBusinessSettings() {
  const { data } = await client.get('/business-settings')
  return data
}

export async function updateBusinessSettings(settings) {
  const { data } = await client.put('/business-settings', settings)
  return data
}

// Crea la contraseña de administrador o la cambia (exige la actual).
export async function updateAdminPassword(currentPassword, newPassword) {
  const { data } = await client.put('/settings/admin-password', { currentPassword, newPassword })
  return data
}

// Solo desde la ruta de soporte: borra la contraseña olvidada.
export async function resetAdminPassword(confirmacion) {
  const { data } = await client.post('/settings/admin-password/reset', { confirmacion })
  return data
}
