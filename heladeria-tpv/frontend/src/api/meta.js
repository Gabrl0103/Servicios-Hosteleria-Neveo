import client from './client'

// { remote: true } cuando la app se abre por Tailscale (solo lectura).
export async function getMeta() {
  const { data } = await client.get('/meta')
  return data
}
