import client from './client'

export async function createOrder(order) {
  const { data } = await client.post('/orders', order)
  return data
}

export async function getOrder(id) {
  const { data } = await client.get(`/orders/${id}`)
  return data
}

export async function getOrders(from, to, page = 0, size = 20) {
  const { data } = await client.get('/orders', { params: { from, to, page, size } })
  return data
}

export async function anularOrder(id, motivo, password) {
  const { data } = await client.post(`/orders/${id}/anular`, { motivo, password })
  return data
}
