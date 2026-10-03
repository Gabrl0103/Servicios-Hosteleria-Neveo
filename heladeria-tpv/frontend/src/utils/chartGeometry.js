// Geometria de los graficos SVG hechos a mano (Reportes y Analisis).

function niceMax(value) {
  if (value <= 0) return 1
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  let nice
  if (normalized <= 1) nice = 1
  else if (normalized <= 2) nice = 2
  else if (normalized <= 5) nice = 5
  else nice = 10
  return nice * magnitude
}

export function niceAxisTicks(maxValue, count) {
  if (maxValue <= 0) return [0]
  const ceiling = niceMax(maxValue)
  const ticks = []
  for (let i = 0; i <= count; i++) {
    ticks.push(Math.round((ceiling / count) * i))
  }
  return ticks
}

export function formatAxisLabel(value) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

export function buildBarGeometry(points) {
  const width = 900
  const height = 220
  const padLeft = 68
  const top = 20
  const bottom = 170
  const padRight = 20

  const values = points.map((p) => Number(p.total))
  const rawMax = Math.max(...values, 1)
  const ticks = niceAxisTicks(rawMax, 4)
  const max = ticks[ticks.length - 1]

  const barAreaWidth = width - padLeft - padRight
  const barWidth = barAreaWidth / points.length - 14

  const bars = points.map((p, i) => {
    const x = padLeft + i * (barAreaWidth / points.length) + 7
    const barHeight = (Number(p.total) / max) * (bottom - top)
    const y = bottom - barHeight
    return { x, y, barHeight, label: p.label, value: p.total }
  })

  const gridLines = ticks.map((tick) => ({
    y: bottom - (tick / max) * (bottom - top),
    label: formatAxisLabel(tick),
    value: tick,
  }))

  return { bars, width, height, bottom, barWidth, padLeft, gridLines }
}
