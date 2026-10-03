import client from './client'

export async function getInsights() {
  const { data } = await client.get('/insights')
  return data
}
