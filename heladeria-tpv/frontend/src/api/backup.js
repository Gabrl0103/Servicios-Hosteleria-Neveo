import client from './client'

export function downloadBackup() {
  const link = document.createElement('a')
  link.href = '/api/backup/database'
  link.download = ''
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export async function listBackups() {
  const { data } = await client.get('/backup/list')
  return data
}

export async function restoreFromBackup(name) {
  const { data } = await client.post('/backup/restore', null, { params: { name } })
  return data
}

export async function restoreFromFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await client.post('/backup/restore/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  })
  return data
}

export async function runMaintenance() {
  const { data } = await client.post('/backup/maintenance/run')
  return data
}
