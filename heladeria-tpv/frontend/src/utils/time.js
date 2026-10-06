export function relativeTimeSince(isoDate) {
  const start = new Date(isoDate)
  const now = new Date()
  const diffMs = now - start
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (hours <= 0) return `hace ${minutes}m`
  return `hace ${hours}h ${minutes}m`
}

// Fecha sin hora del backend ("2026-10-05") como dia local. new Date() la
// tomaria como medianoche UTC, que en Colombia (UTC-5) cae el dia anterior.
export function parseLocalDate(isoDate) {
  const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}
