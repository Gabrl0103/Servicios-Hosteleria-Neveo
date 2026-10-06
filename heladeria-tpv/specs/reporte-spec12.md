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

## Paso 5: Detalle de mesa (Parte 2, punto 3) y Parte 3 (símbolo y color por categoría)

Decisión de Gabs: para las categorías conocidas se usan los colores del diseño (no los del mapa anterior de `categoryColors.js`).

### Detalle de mesa
- `pages/TableDetailPage.jsx` + `TableDetailPage.css`, según `design/A-Detalle.dc.html`:
  - Riel oscuro de 92 px con "Todos" y las categorías (círculo con símbolo y etiqueta). Con muchas categorías, el riel se desplaza con una barra fina.
  - Encabezado: "← Mesas", nombre de la mesa en Fraunces 34 y chip "Debe $ X".
  - Tarjetas de producto de 160 px: círculo de categoría, burbuja "×N" si ya está en el pedido, categoría, nombre en Fraunces, precio y "+". Las agotadas quedan deshabilitadas, con "Agotado" y "−".
  - Cuadrícula de 4 columnas a 1366, 5 a 1600 y 6 a 1920.
  - Panel "Pedido actual" de 372 px: subtítulo "Mesa · N productos", "Vaciar", ítems con −/cantidad/+, total de línea y "Quitar". Debajo, el total, "Cobrar este pedido" (principal), "Dejar en la cuenta" (secundario) y la nota "Cada producto se guarda al tocarlo".
- Componentes base: `Button`, `Card` (tarjeta de producto), `Chip` ("Debe"), `Notice` (errores) y el nuevo `CategoryIcon` (círculo de categoría reutilizable).
- **Sin cambios de lógica.** Tocar un producto sigue abriendo el modal de cantidad. Agregar, +/−, quitar, vaciar, "Dejar en la cuenta" (espera los guardados en curso) y el cobro quedan igual. Los modales de cantidad, confirmación y pago no se tocaron: se rediseñan en el paso siguiente.
- **No implementado (función nueva, fuera de "solo capa visual"):**
  - El buscador "Buscar producto" del diseño.
  - El chip "Guardado": se mantiene el chip existente "Debe $ X", con color de alerta.

### Parte 3
- `utils/categoryColors.js`:
  - `normalizeCategory` (sin mayúsculas, tildes ni espacios sobrantes: "Açaí" = "Acaí" = " ACAI " = "acai").
  - Mapa con los 7 pares símbolo/fondo del diseño (Açaí, Mix, Yogurt Helado, Cookies, Café, Toppings, Oblea).
  - Color estable para el resto: hash del nombre normalizado dentro de esos 7 pares. Lo usan las categorías nuevas y también Helados, Miti-miti, Fruta y Salsas, que conservan su símbolo.
  - `uniqueCategories` para listar sin duplicados. `categoryInfo` mantiene `color`/`icon`/`short` y agrega `bg`, así que los consumidores existentes (modales, Reportes) siguen funcionando.
- `components/IconDefs.jsx`:
  - Se agregan `cat-mix`, `cat-yogurt`, `cat-oblea`, `cat-generico` (etiqueta, derivado: no viene en el diseño) y `cat-todos`.
  - `cat-acai`, `cat-cafe`, `cat-cookies` y `cat-toppings` pasan a los trazos del diseño, como pide el spec.
  - Íconos auxiliares nuevos: `ic-minus`, `ic-back` y `ic-check`.
- Chips normalizados en `TableDetailPage` (riel) y `ProductsPage` (fila de chips). En `ProductsPage` solo cambió la deduplicación y el filtro, no el estilo. Ahí el chip muestra el nombre del primer producto de la categoría (ej. "ACAI"); en el riel se muestra la etiqueta canónica ("Açaí").
- Limitación: con solo 7 colores, dos categorías sin color fijo pueden coincidir en color con otra (ej. "POSTRES" usa el par de Café). El símbolo genérico las distingue.

### Verificación (Playwright, backend sirviendo `frontend/dist`, copia de prueba de la base, nunca AppData)
- Productos de prueba con categorías escritas distinto ("ACAI", "Açaí", "acaí"; "Yogurt Helado", "yogurt helado "; "Mix", "mix"). El riel muestra una sola de cada una, y los filtros Açaí y Yogurt Helado muestran sus 3 productos.
- En una mesa vacía:
  - Tocar 3 productos: cada uno queda guardado en el backend al momento.
  - "+" en Acai: queda ×2 en el backend.
  - "−" con cantidad 1: se quita.
  - "Quitar": se quita en el backend.
  - Burbujas ×2/×1 correctas; producto agotado deshabilitado.
- "Dejar en la cuenta": vuelve a Mesas con "Cuenta guardada: $ 49.000" y la mesa ocupada. Al volver a entrar, el pedido se restaura igual (Acai 9oz ×2, Frozen 9oz ×1, Americano ×1; $ 49.000).
- 1366×768, 1600×900 y 1920×1080: sin scroll horizontal ni textos cortados. Sin errores de JavaScript.
- `npm run build` limpio. Lint: los mismos 5 problemas anteriores, ninguno nuevo.
- Capturas: `capturas-spec12/detalle-mesa-1366x768.png` y `capturas-spec12/detalle-mesa-reingreso-1366x768.png`.

## Paso 6: Modales del cobro (Parte 2, punto 4)

- `components/QuantityModal.jsx`, `ConfirmationModal.jsx` y `PaymentModal.jsx` usan el `Modal` base, con estilos en `components/CheckoutModals.css`. Solo cambió el JSX: estado, cálculo de descuento y cambio, validación (`canConfirm`), datos enviados (`handleConfirm`), creación de la orden y apertura del recibo (en `TableDetailPage`) quedan igual, igual que los textos de los botones ("Agregar al pedido", "Cancelar", "Continuar a cobrar", "Confirmar venta" / "Procesando...").
- `Modal` base ampliado: ícono en la cabecera, contenido extra bajo el título y botón "×" opcional. Con `dismissible={false}` no lo cierran Escape, el clic fuera ni la "×". La cabecera y el pie quedan fijos; el cuerpo se desplaza por dentro.
- Cantidad: círculo de categoría, nombre en Fraunces, −/campo/+ grandes, atajos 2/5/10 y "Agregar al pedido · $ X" como botón principal violeta.
- Confirmación: cada producto con su círculo de categoría, cantidad, total de línea y campo de observación. Total fijo en el pie con "Cancelar" y "Continuar a cobrar".
- Pago:
  - Cabecera con "Total a cobrar", el total a 36 px tabular y el detalle del descuento.
  - Descuento con chip "Ahorra $ X" y método de pago con el elegido en violeta (cada método conserva su color de punto).
  - Billetes, y casillas Recibido/Cambio a 24 px tabular: el cambio en verde si alcanza y en rojo si falta. Aviso de error "El monto recibido es menor al total".
  - "Confirmar venta" en el pie, siempre visible.
- Foco inicial: campo de cantidad, primera observación y campo de descuento, nunca el botón que confirma. Enter en esos campos no confirma nada.
- Cierre:
  - **Cambio de comportamiento pedido por Gabs:** Escape y clic fuera cierran los tres modales (antes solo clic fuera).
  - Mientras se envía el pago (`loading`), Escape, clic fuera y la "×" no lo cierran. El botón muestra "Procesando..." en violeta atenuado, legible (`aria-busy`).
- Se quitó un `useState` sin usar de `ConfirmationModal` (era un error de lint). Lint: 4 problemas, todos anteriores.

### Verificación (Playwright, backend sirviendo `frontend/dist`, copia de prueba de la base, nunca AppData)
- A 1366×768 los tres modales caben. El de pago mide 51–717 px; con el aviso de monto menor el cuerpo se desplaza por dentro, la página no se mueve y "Confirmar venta" sigue visible.
- Cantidad: foco en el campo; Escape y clic fuera cierran sin agregar nada.
- Confirmación: foco en la primera observación; Escape cierra y al reabrir las observaciones siguen ahí.
- Venta A (Mesa 3: Acai 9oz ×2 con "sin azúcar", Frozen 9oz, Americano con "bien caliente"; descuento 10 %; efectivo $ 50.000):
  - El modal muestra $ 44.100, "$ 49.000 − 10% ($ 4.900)" y cambio $ 5.900.
  - Durante el envío (retrasado a propósito), Escape y clic fuera no lo cierran y la "×" queda deshabilitada.
  - El recibo se abre con los mismos números y las dos observaciones. La mesa queda en $ 0.
- Venta B (Neveo Mix 9oz y Oblea; descuento 15 %; Nequi): $ 16.575 = $ 19.500 − $ 2.925. El recibo muestra lo mismo con método NEQUI. La mesa queda en $ 0 y aparece "Disponible · Sin pendiente".
- Sin errores de JavaScript. El recibo no se modificó.
- Capturas en `capturas-spec12/`:
  - `modal-cantidad-1366x768.png`
  - `modal-confirmacion-1366x768.png`
  - `modal-pago-efectivo-1366x768.png`
  - `modal-pago-nequi-1366x768.png`
  - `modal-pago-procesando-1366x768.png`
  - `recibo-venta-nequi.png`

## Paso 7: Turno y Cuadre de caja (Parte 2, punto 5)

- `pages/CashRegisterPage.jsx` + `CashRegisterPage.css` (Turno), derivados del sistema:
  - Título "Turno de hoy" en Fraunces.
  - Tarjeta de estado: punto verde, "Caja 01 · en curso" en Fraunces, inicio y ventas, y "Acumulado" a 30 px tabular.
  - Fichas por método más la de "Total" en el violeta oscuro del riel.
  - "Esperado en caja" en verde. "Gastos del turno" en una columna a la derecha; el ícono 🗑 pasa a un botón con ícono SVG.
  - "Ir a mesas →" (principal) y "Cerrar turno" (variante nueva `danger-outline`).
  - Abrir turno: cajeros como opciones seleccionables en violeta, campo de valor inicial e interruptor `ui-switch` (nuevo en el sistema, con `role="switch"`).
- `pages/CashBoxHistoryPage.jsx` + `CashBoxHistoryPage.css` (Cuadre de caja): la tabla pasa a `.ui-table` con números tabulares, chip "En curso" y botón "Comprobante" neutro con ícono.
- Sin cambios de lógica: abrir turno, gastos (agregar y eliminar), esperado en caja, resumen por método, cerrar turno y abrir el comprobante funcionan igual, con los mismos textos.
- 1366×768, 1600×900 y 1920×1080: sin scroll horizontal ni montos cortados. Con turno abierto y sin gastos, Turno cabe sin scroll vertical a 1366×768.
- Capturas: `capturas-spec12/turno-1366x768.png` y `capturas-spec12/cuadre-de-caja-1366x768.png`.

## Paso 8: Decisiones de Gabs, Space Mono local y Reportes (Parte 2, punto 6)

- **Logo:** la barra superior usa siempre el logo fijo de Neveo. El logo subido en Configuración queda solo para los recibos y su vista previa.
- **Space Mono local, solo en los recibos:**
  - Se usan los mismos `woff2` que servía Google Fonts (v17, 400/700, latin y latin-ext), con su licencia OFL. Se quitó Google Fonts de `index.html`.
  - Los recibos usan la clase nueva `.receipt-mono`. `.mono` en las demás pantallas pasa a DM Sans tabular, y los ejes de las gráficas de Reportes y Análisis también.
  - Geometría del recibo (venta y turno) medida antes y después, sin acceso a Google: 0 diferencias en los 100 elementos.
  - Ninguna otra pantalla carga Space Mono.
- **Reportes** (`pages/ReportsPage.jsx` + `ReportsPage.css`), con los componentes base:
  - Solo cambió el render; carga, caché, paginación, anulación y refresco quedan igual.
  - Tarjetas blancas, títulos en Fraunces, cifras tabulares y gráficas en violeta con `utils/chartGeometry.js`.
  - Selector de periodo segmentado y ranking con el círculo de categoría.
  - "Ventas del periodo" en `.ui-table`, con Reimprimir (impresora) y Anular como botones de ícono.
  - Filas anuladas tachadas, con chip "Anulada" y el detalle (motivo, fecha/hora, cajero) debajo.
  - El modal de anulación y el aviso de contraseña usan el `Modal` base.
  - El modal de anulación ahora también se cierra con Escape, clic fuera o "×" (salvo mientras anula). Antes solo se cerraba con Cancelar.
- **Verificado (Playwright por DOM y red, base de prueba):**
  - "Ventas del periodo" colapsada y sin carga al entrar. Al expandir pide `page=0&size=20`; al colapsar y expandir usa la caché. "Ver más" pide `page=1` (40 filas). Cambiar el rango invalida la caché.
  - La impresora aparece en todas las filas y abre el recibo. Anular aparece solo en las ventas no anuladas del turno actual.
  - Modal de anulación: foco en el motivo y contraseña `type=password`. Con una contraseña incorrecta, el error sale dentro del modal, el modal sigue abierto y el campo se vacía.
  - Al anular: fila tachada con chip y detalle. "Cuadre actual" baja exactamente el valor de la venta. KPIs, gráfica mensual y resumen se vuelven a pedir sin recargar la página.
  - Sin contraseña configurada (respuesta simulada): aparece el aviso, y "Ir a Configuración" lleva a Configuración.
  - Sin scroll horizontal ni cifras cortadas a 1366×768, 1600×900 y 1920×1080. Sin errores de JavaScript. `npm run build` limpio; lint sin problemas nuevos.

## Paso 9: Análisis (Parte 2, punto 7)

- `pages/AnalyticsPage.jsx` (solo el render) y `AnalyticsPage.css`:
  - Alertas como avisos ámbar, igual que el punto de la barra; "Todo en orden" en verde.
  - Estado sin datos suficientes con ícono.
  - "Ventas por hora": horas pico en violeta y el resto en lila, con leyenda.
  - Ranking con el círculo de categoría. Ideas con ícono de bombilla.
- `styles/data-viz.css` nuevo: tarjetas con título, gráficas y ranking compartidos por Reportes y Análisis, movidos desde `ReportsPage.css` sin cambios.
- Verificado (Playwright por DOM, base de prueba; los dos últimos estados con la respuesta de `/api/insights` simulada):
  - **Con datos:** 1 alerta ámbar y 9 barras, de ellas 3 pico. El tooltip funciona, el ranking muestra 4 productos con su círculo y hay 5 ideas. Aparece el punto en la barra.
  - **"Todo en orden":** aviso verde y el punto de la barra desaparece.
  - **"Aún no hay suficientes datos":** muestra el mensaje con los días que hay, y "Ideas" muestra el mensaje vacío.
  - En los tres: sin scroll horizontal a 1366, 1600 y 1920, sin textos cortados, sin Space Mono y sin errores de JavaScript.
  - Reportes conserva sus estilos tras mover `data-viz.css`. `npm run build` limpio; lint sin problemas nuevos.

## Paso 10: Productos (Parte 2, punto 8) y selector de categoría (Parte 3, punto 5)

- `pages/ProductsPage.jsx` y `ProductsPage.css`:
  - Chips de categoría con su círculo (sin duplicados por mayúsculas, tildes o espacios).
  - Lista con círculo de categoría, nombre en Fraunces, precio tabular, interruptor Disponible/Agotado y botones de ícono para editar y eliminar.
  - Formulario con el `Modal` base.
- `.icon-btn` pasó de `ReportsPage.css` a `styles/ui.css` (lo usan Reportes y Productos).
- **Selector de categoría:**
  - Opciones: "Sin categoría", las existentes y "+ Nueva categoría". Esta última abre el campo de texto solo cuando hace falta.
  - Una "nueva" que ya existe con otra escritura (ej. "acai", "Acaí" frente a "ACAI") usa la existente y lo avisa en el campo.
  - Al editar sin cambiar de categoría, se conserva el texto original del producto.
  - Solo cambia el valor de `form.category`. El envío, la disponibilidad, el borrado y la carga no cambian. No hay cambios en el backend.
- Verificado (Playwright por DOM y API, base de prueba; los productos de prueba se borraron al final):
  - **Categorías:** con categoría existente se guardó "Yogurt Helado"; la nueva "Granizados" aparece como chip con el símbolo genérico.
  - **Sin duplicados:** "acai" y "Acaí" se guardaron como "ACAI", y "  granizados  " como "Granizados". Queda un solo chip de cada una.
  - **Edición:** "Acai 12oz" conserva "acaí".
  - **Resto:** Disponible/Agotado cambia en el backend; Eliminar pide confirmación y borra; el filtro por chip funciona; Escape cierra el formulario; el foco inicial queda en Nombre.
  - Sin scroll horizontal ni cifras cortadas a 1366, 1600 y 1920. Sin errores de JavaScript. `npm run build` limpio; lint sin problemas nuevos.
- **Nota:** el nombre que se muestra para una categoría es el del primer producto que la usa. En la base de prueba hay "ACAI", "Açaí" y "acaí", así que se ve "ACAI".
