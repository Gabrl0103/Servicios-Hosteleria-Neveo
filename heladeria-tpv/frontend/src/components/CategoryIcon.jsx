import { categoryInfo } from '../utils/categoryColors'

// Circulo de categoria con su simbolo y color (Especificacion 12, Parte 3).
// size = diametro del circulo; el simbolo ocupa ~54%.
export default function CategoryIcon({ category, size = 48, className }) {
  const info = categoryInfo(category)
  const icon = Math.round(size * 0.54)
  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: '50%',
        background: info.bg,
        color: info.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={icon} height={icon} aria-hidden="true"><use href={`#cat-${info.icon}`} /></svg>
    </span>
  )
}
