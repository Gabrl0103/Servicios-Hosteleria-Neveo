# Reporte Especificación 12: Rediseño de la interfaz

Rama: `feature/rediseno-ui`. Este reporte se va completando por pasos.

## Paso 1: Revisión de `design/`

### Qué trae

| Archivo | Contenido |
|---|---|
| `A-Mesas.dc.html` | Maqueta 1366×768 de **Mesas**: barra superior (logo, "PUNTO DE VENTA", 7 enlaces, punto de alerta en Análisis, chip "Turno abierto · hora · Caja 01", fecha), título "Mesas" con leyenda Disponible/Ocupada, texto "Arrastra las mesas para ordenarlas", aviso "Cuenta guardada: $ X" y plano con fondo de puntos (mesas de 176×116, ocupada con tinte violeta y monto, disponible en blanco con "Sin pendiente", ícono de arrastre). |
| `A-Detalle.dc.html` | Maqueta 1366×768 del **Detalle de mesa**: riel oscuro de 92 px con "Todos" + 7 categorías (círculo 44 px con símbolo y etiqueta), botón "← Mesas", título de mesa, chip "Guardado", buscador de 300 px, cuadrícula de 4 columnas de tarjetas de 160 px (círculo de categoría 48 px, burbuja "×N", categoría en versalitas, nombre, precio, botón "+"), panel "Pedido actual" de 372 px (ítems con −/cantidad/+, "Quitar", total, "Cobrar este pedido", "Dejar en la cuenta", nota "Cada producto se guarda al tocarlo"). Incluye los **trazos SVG** de los 7 símbolos (acai, mix, yogurt, cookies, cafe, toppings, oblea) y sus colores. |
| `neveo-logo.png` | 225×225 px, RGB sin transparencia. Fondo azul pizarra con "Neveo" en blanco. Suficiente para 48×48 (también en pantallas 2×). |

Los dos `.dc.html` no se abren solos: dependen de `support.js` (no incluido), de Google Fonts y de una imagen interna `/_blob/...`. Sirven como código de referencia: todos los valores (colores, tamaños, pesos, radios, sombras, espaciados) se leen exactos del HTML.

### Qué falta (se deriva del mismo sistema, sin inventar otro estilo)

1. Pantallas sin diseñar: Turno, Cuadre, Reportes, Análisis, Productos, Configuración, modales y Soporte (el spec ya lo prevé).
2. Estados no dibujados: chip **"Sin turno abierto"**, **banner de modo remoto**, hover/foco/deshabilitado de enlaces y botones.
3. Componentes no dibujados: modal, campo de formulario con etiqueta, tabla, botón de peligro, avisos de alerta y de error.
4. Colores incompletos: de **alerta** solo viene `#E8A33D` (el punto) y de **error** solo `#B4443F`; faltan fondo y texto para avisos. Derivados: alerta fondo `#FBF1DF` / texto `#7A4E0E`; error fondo `#F8E7E6`; deshabilitado fondo `#EEECF3` / texto `#A39DB5`; sombra de modal.
5. Símbolo genérico de respaldo para categorías nuevas: no viene en el diseño.

### Ambiguo o en conflicto (requiere decisión)

1. **Logo subido en Configuración.** Hoy, si se sube un logo, reemplaza la "N" de la barra. El diseño pide `neveo-logo.png`. Implementado: logo subido si existe; si no, `neveo-logo.png` (se conserva la función actual). Alternativa: usar siempre `neveo-logo.png` en la barra y dejar el logo subido solo para los recibos.
2. **Recibos y Space Mono.** `index.html` carga Nunito y Space Mono desde Google. Los recibos impresos usan Space Mono (clase `.mono`). La regla 2 (nada de CDN) choca con la regla 4 (el recibo no cambia): sin internet hoy el recibo ya cae a la monoespaciada del sistema. Propuesta: incluir Space Mono como archivo local (OFL, ~40 KB), así el recibo se ve igual que con internet y también sin internet. Por ahora se quitó solo Nunito (ya no se usa) y se dejó el enlace de Space Mono hasta decidir.
3. **Orden de los enlaces.** Diseño: Mesas, Turno, Cuadre de caja, Reportes, Análisis, Productos, Configuración. App actual: Reportes, Análisis, Mesas, Turno, Cuadre de caja, Productos, Configuración. Implementado el orden del diseño; la ruta inicial (`/` → Reportes) no cambia.
4. **Íconos en los enlaces.** La app actual los tiene; el diseño no. Implementado sin íconos, como el diseño.
5. **Colores de categoría.** El spec (Parte 3) dice mantener el mapa de `utils/categoryColors.js`, pero el diseño trae otros colores para las mismas categorías (ej. Açaí `#7A4FA3` actual vs `#6A3FB5` diseño; Toppings `#E08A1E` vs `#1F8A5C`; Cookies `#C99A52` vs `#A8641E`). Además el mapa actual tiene Helados, Miti-miti, Adición de fruta y Adición de salsas, que no aparecen en el diseño (en el diseño "Miti Miti 14oz" está en Mix). Se decide al llegar a la Parte 3.
6. **Formato de fecha.** Diseño "sáb. 27 jun 2026"; `es-CO` produce "sáb, 27 jun 2026". Se mantiene el formato actual.
7. **Fraunces.** El diseño fija pesos 600–800 sin eje óptico; se usa el archivo variable de peso con el tamaño óptico por defecto, igual que lo sirve Google Fonts en la referencia.
8. **Color del logo.** El azul pizarra del logo no pertenece a la paleta violeta. No se modifica la imagen; se señala por si se quiere una versión del logo en violeta.

## Paso 2: Parte 1, sistema de diseño base

- `src/styles/tokens.css`: colores (incluye estados éxito, alerta, error, deshabilitado y los de categoría del diseño), tipografía, tamaños, espaciados, radios, sombras y medidas de layout.
- `src/styles/fonts.css` + `src/assets/fonts/`: DM Sans y Fraunces como `woff2` variables locales (subconjuntos latin y latin-ext, ~125 KB en total) con licencia OFL. Respaldo `system-ui, sans-serif` y `Georgia, serif`.
- `src/styles/ui.css` + `src/components/ui/index.jsx`: `Button` (principal, secundario, neutro, peligro, texto de peligro; tamaños sm/md/lg), `Card`, `Chip`, `Modal` (Escape, clic fuera, foco inicial configurable, para el Spec 13), `Field` + `Input`, `Notice` y la tabla como clase `.ui-table`.
- `index.html`: se quitó Nunito de Google Fonts (ya no se usa). Queda Space Mono solo para los recibos, pendiente de decisión.
- `npm run build` limpio. Lint: los 5 problemas que reporta son anteriores (ConfirmationModal, SessionContext, ReportsPage, TableDetailPage); ninguno en archivos nuevos.
- `body` pasa a DM Sans. Las variables antiguas de `global.css` se mantienen hasta que cada pantalla se migre (cada pantalla reemplaza sus estilos duplicados en su propio commit). La clase `.mono` de los recibos no se toca.


## Paso 3: NavBar (pantalla de ejemplo)

- `components/NavBar.jsx` + `NavBar.css`: barra blanca de 64 px; logo real `neveo-logo.png` 48×48 con esquinas de 12 px y rótulo "PUNTO DE VENTA" (sin la "N" de prueba ni el texto "Neveo"); enlaces sin ícono en el orden del diseño, activo con tinte violeta; punto de alerta ámbar en "Análisis" (misma condición que antes: `alertCount > 0`); chip de turno "Turno abierto · hora · Caja 01" en verde, y estado derivado "Sin turno abierto · Caja 01" en gris; fecha a la derecha.
- `App.jsx`: banner "Modo remoto (solo lectura)" con los colores de alerta del sistema. Misma condición y texto.
- Sin cambios de lógica: mismos enlaces y rutas, mismo clic del logo a Reportes, misma carga del logo subido en Configuración (tiene prioridad sobre `neveo-logo.png`).
- Probado con el backend sirviendo `frontend/dist` (como el instalador) y una base de datos de prueba aparte. A 1366×768 no hay scroll horizontal ni elementos cortados.
- Capturas: `capturas-spec12/navbar-1366x768.png` (turno abierto) y `capturas-spec12/navbar-sin-turno-1366x768.png`. El resto de la pantalla sigue con el estilo anterior hasta migrarla.
- Observación (no se tocó): al abrir `#/mesas` en frío, `TablesPage` redirige a `/turno` antes de que cargue el turno, porque `cashRegister` empieza en `null`. Es comportamiento previo.

## Paso 4: Mesas (Parte 2, punto 2)

- `pages/TablesPage.jsx` + `TablesPage.css`, según `design/A-Mesas.dc.html`: título "Mesas" en Fraunces 38, leyenda Disponible/Ocupada, texto de ayuda, aviso "Cuenta guardada: $ X" y botón "Nueva mesa" en la misma fila; plano blanco con fondo de puntos que ocupa el resto de la pantalla; mesas ocupadas con tinte violeta, chip "Ocupada" y monto, y disponibles en blanco con chip "Disponible" y "Sin pendiente"; ícono de arrastre.
- Estilos duplicados reemplazados por los componentes base: `Card` (mesa), `Chip` (estado), `Notice` (aviso de cuenta guardada y errores), `Button` ("Nueva mesa", "Cancelar", "Crear", "Guardar") y `Modal` + `Input` (Nueva mesa / Renombrar mesa). Se quitaron las clases antiguas `.card`, `.btn-ink`, `.btn-outline` de esta pantalla.
- Sin cambios de lógica: carga, posiciones automáticas, arrastre y guardado de posición, clic para abrir la mesa, crear, renombrar, eliminar (con su `window.confirm`) y el aviso que se oculta a los 3,5 s quedan igual. Las tarjetas mantienen 180×120 (las constantes que usa el arrastre); el diseño dibuja 176×116.
- Decisiones de diseño a revisar:
  - Los botones de renombrar y eliminar, que el diseño no dibuja, quedan a la derecha del chip, discretos, siempre visibles.
  - El plano usa todo el ancho (antes 1000 px máximo) y desplazamiento interno si hay mesas fuera de la vista; la zona de arrastre es el área visible del plano.
  - En las disponibles el monto "$ 0" pasa a "Sin pendiente", como en el diseño.
  - Único cambio de comportamiento: el modal de Nueva mesa / Renombrar ahora también se cierra con Escape (lo hace el `Modal` base). Clic fuera y Cancelar siguen igual.
- `App.jsx`: los CSS base se importan antes que los componentes, para que el CSS de cada pantalla pueda refinar los componentes base (sin esto `.ui-card` pisaba el tinte de las mesas ocupadas).
- Verificado con Playwright sobre el build servido por el backend y una copia de prueba de la base:
  - 1366×768, 1600×900 y 1920×1080: sin scroll horizontal; ningún nombre, chip o monto cortado; con el aviso visible la fila de título no se desborda.
  - Flujo: abrir "Cliente 1", "Dejar en la cuenta", vuelve a Mesas con "Cuenta guardada: $ 43.000".
  - Arrastre de una mesa: se mueve, guarda la posición en el backend y no abre la mesa.
  - Modal Nueva mesa: foco en el campo; Escape lo cierra.
  - Sin errores de JavaScript ni peticiones fallidas.
- Punto de alerta de Análisis: con `scripts/seed-insights-test.py --today low` sobre una copia de la base de prueba (en la carpeta temporal, no en AppData) `/api/insights` devuelve 2 alertas (`LOW_SALES_TODAY`, `PRODUCT_DROP`) y el punto ámbar se ve junto a "Análisis" (8×8, `#E8A33D`, título "2 alerta(s)").
- Capturas: `capturas-spec12/mesas-1366x768.png`, `capturas-spec12/mesas-cuenta-guardada-1366x768.png` y `capturas-spec12/navbar-alerta-analisis.png`.
