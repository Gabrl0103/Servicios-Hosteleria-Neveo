// Simbolo y color por categoria (Especificacion 12, Parte 3).
// color = trazo del simbolo, bg = fondo del circulo. Los pares vienen de
// design/A-Detalle.dc.html; deben coincidir con --cat-* de styles/tokens.css.

const PALETTE = {
  acai: { color: '#6A3FB5', bg: '#EEE7FA' },
  mix: { color: '#C2347F', bg: '#FCE6F1' },
  yogurt: { color: '#1F78C1', bg: '#E2F0FB' },
  cookies: { color: '#A8641E', bg: '#FAEBD8' },
  cafe: { color: '#6E4A33', bg: '#EEE3DA' },
  toppings: { color: '#1F8A5C', bg: '#DCF3E7' },
  oblea: { color: '#8F6F0A', bg: '#F8EFC8' },
}

const PALETTE_LIST = Object.values(PALETTE)

// Clave = nombre de categoria normalizado (ver normalizeCategory).
// Las categorias del diseño usan su color fijo; las que el diseño no dibuja
// (helados, miti-miti, fruta, salsas) conservan su simbolo y toman el color
// estable calculado del nombre, igual que una categoria nueva.
const CATEGORY_MAP = {
  acai: { icon: 'acai', short: 'Açaí', ...PALETTE.acai },
  mix: { icon: 'mix', short: 'Mix', ...PALETTE.mix },
  'yogurt helado': { icon: 'yogurt', short: 'Yogurt Helado', ...PALETTE.yogurt },
  cookies: { icon: 'cookies', short: 'Cookies', ...PALETTE.cookies },
  cafe: { icon: 'cafe', short: 'Café', ...PALETTE.cafe },
  toppings: { icon: 'toppings', short: 'Toppings', ...PALETTE.toppings },
  oblea: { icon: 'oblea', short: 'Oblea', ...PALETTE.oblea },
  helados: { icon: 'helados', short: 'Helados' },
  'miti-miti': { icon: 'mitimiti', short: 'Miti-miti' },
  mitimiti: { icon: 'mitimiti', short: 'Miti-miti' },
  'adicion de fruta': { icon: 'fruta', short: 'Ad. fruta' },
  fruta: { icon: 'fruta', short: 'Ad. fruta' },
  'adicion de salsas': { icon: 'salsas', short: 'Ad. salsas' },
  salsas: { icon: 'salsas', short: 'Ad. salsas' },
}

// "  Acaí " = "acai" = "ACAI": sin mayusculas, tildes ni espacios sobrantes.
export function normalizeCategory(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Color estable para una categoria sin color fijo: el mismo nombre
// normalizado da siempre el mismo par de la paleta del diseño.
function stableColor(key) {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return PALETTE_LIST[hash % PALETTE_LIST.length]
}

export function categoryInfo(category) {
  const key = normalizeCategory(category)
  const known = CATEGORY_MAP[key]
  if (known) return { key, ...stableColor(key), ...known }
  return { key, icon: 'generico', ...stableColor(key), short: (category || '').trim() || 'Otros' }
}

// Categorias distintas de una lista de productos, comparando normalizado.
// Se muestra el nombre del primer producto que la usa.
export function uniqueCategories(products) {
  const seen = new Map()
  for (const p of products) {
    const key = normalizeCategory(p.category)
    if (key && !seen.has(key)) seen.set(key, p.category.trim())
  }
  return [...seen].map(([key, label]) => ({ key, label }))
}

export function categoryTint(hex) {
  // Aplica un alpha bajo (~12%) al color hex, igual al "tint" del diseño.
  return hex + '1f'
}
