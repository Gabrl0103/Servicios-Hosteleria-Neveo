# Especificación 12: Rediseño de la interfaz (versión 1.2.0)

## Contexto

Continuación de los specs anteriores. La versión 1.1.0 está en `main` (etiqueta `v1.1.0`) y se está entregando en la heladería. Esta especificación implementa un rediseño visual completo de la interfaz, diseñado aparte con Claude Design. El diseño elegido se entrega en la carpeta `design/` del repo (archivos de referencia, capturas y/o el código exportado). Si falta algo en esa carpeta o es ambiguo, preguntar antes de inventar.

## Por qué

La interfaz es funcional pero visualmente básica y los productos no se distinguen bien entre sí. El objetivo es un aspecto profesional y consistente, legible en el monitor pequeño de la heladería, sin cambiar ninguna función.

## Diseño elegido: Propuesta A (Açaí)

Referencia visual: el canvas de Claude Design (https://claude.ai/artifact/1b9cfKjoKWyuf4z34QUwLu, artboards "A · Mesas" y "A · Detalle de mesa") y, en la carpeta `design/` del repo, `A-Mesas.dc.html`, `A-Detalle.dc.html` y `neveo-logo.png`. Los `.dc.html` son solo referencia de maquetación: cargan fuentes desde Google y usan una imagen interna del canvas, que no funcionan sin internet. En la app usar las fuentes locales y el archivo `neveo-logo.png`. Las demás pantallas (Turno, Cuadre, Reportes, Análisis, Productos, Configuración, modales y Soporte) no están diseñadas: derivarlas del mismo sistema, sin inventar otro estilo.

- **Colores:** fondo `#F3F2F8`, superficie `#FFFFFF`, texto `#1D1730`, texto secundario `#6B6580`, bordes `#E6E3EF` y `#DAD6E6`. Violeta principal `#4B2A86` con tinte `#ECE6F7` y riel oscuro `#2B1659`. Éxito `#1F9D6B` (fondo `#E7F6EE`, texto `#0F5F3F`), alerta `#E8A33D`, error `#B4443F`.
- **Tipografía:** Fraunces (pesos 600 a 800) para la marca, los títulos de pantalla, los nombres de mesa, los nombres de producto y los títulos de panel y de modal. DM Sans (400 a 800) para todo lo demás; precios y totales con `font-variant-numeric: tabular-nums`. Ambas como archivos locales.
- **Logo:** la imagen real de Neveo (48×48, esquinas de 12 px) a la izquierda de la barra superior, con el rótulo "PUNTO DE VENTA" al lado. No usar la "N" de prueba ni repetir el texto "Neveo".
- **Estructura:** barra superior blanca de 64 px con los enlaces, el punto de alerta en "Análisis" y el chip del turno; en el detalle de mesa, un riel izquierdo oscuro de 92 px con las categorías como círculos con símbolo y etiqueta, tarjetas de producto de 160 px (círculo de categoría, nombre, precio, botón "+" y burbuja "×N" si ya está en el pedido) y panel de pedido a la derecha de 372 px con "Cobrar este pedido" (principal) y "Dejar en la cuenta" (secundario); en Mesas, un plano con fondo de puntos, mesas ocupadas con tinte violeta y disponibles en blanco.
- **Colores por categoría (símbolo / fondo del círculo):** Açaí `#6A3FB5` / `#EEE7FA`; Mix `#C2347F` / `#FCE6F1`; Yogurt Helado `#1F78C1` / `#E2F0FB`; Cookies `#A8641E` / `#FAEBD8`; Café `#6E4A33` / `#EEE3DA`; Toppings `#1F8A5C` / `#DCF3E7`; Oblea `#8F6F0A` / `#F8EFC8`. Los símbolos son los trazos SVG de `A-Detalle.dc.html`; para categorías nuevas, el símbolo genérico y un color estable calculado a partir del nombre.
- Los precios y montos de ejemplo del diseño son datos de muestra, no vienen de la base.
- La Especificación 13 (confirmación al cerrar el turno) se implementa en esta misma rama, sobre la pantalla Turno.

## Reglas generales (aplican a todo el spec)

1. **Solo capa visual.** No se cambia ninguna lógica, endpoint, modelo ni flujo. Los textos de botones y el comportamiento se mantienen.
2. **Funciona sin internet.** Nada de fuentes ni íconos desde CDN. Las fuentes se incluyen como archivos locales dentro del build del frontend y los íconos son SVG propios. Verificar que se vean bien con el instalador, que sirve el frontend desde el backend.
3. **Pantalla pequeña.** Diseñar y probar a **1366×768** como mínimo, y revisar también 1600×900 y 1920×1080. Sin scroll horizontal ni elementos cortados.
4. **El recibo impreso no se toca** (`OrderReceiptPage.jsx` y el comprobante de turno). Su diseño de impresión térmica queda exactamente igual.
5. Sin librerías nuevas de componentes. CSS simple y variables CSS.
6. Rama nueva `feature/rediseno-ui` desde `main`.

---

## Parte 1: Sistema de diseño base

1. Crear un único archivo de variables CSS (ej. `src/styles/tokens.css`) con colores, tipografía, espaciados, radios y sombras, tal como definió el diseño en `design/`. Incluir colores de estado (éxito, alerta, error, deshabilitado).
2. Incluir las fuentes del diseño como archivos locales (por ejemplo con `@fontsource` o archivos `woff2` en `src/assets/fonts`) y declarar sus `@font-face`. Con tipografías de respaldo (`system-ui`, `sans-serif`).
3. Crear los componentes base reutilizables que pida el diseño (botón principal/secundario/peligro, tarjeta, chip, modal, campo de formulario, aviso, tabla). Reemplazar los estilos duplicados por estos, sin cambiar la lógica de los componentes existentes.

## Parte 2: Pantallas (en este orden, un commit por pantalla)

1. NavBar (con indicador de turno, punto de alerta de Análisis y banner de modo remoto).
2. Mesas (`TablesPage.jsx`), incluido el aviso "Cuenta guardada: $X".
3. Detalle de mesa (`TableDetailPage.jsx`) con el catálogo, el panel "Pedido actual" y los botones "Cobrar este pedido" y "Dejar en la cuenta".
4. Modales del cobro (cantidad, confirmación con observaciones, pago con descuento).
5. Turno y Cuadre de caja.
6. Reportes (incluida "Ventas del periodo" colapsable, con paginación, reimprimir, anular y filas anuladas) y el modal de anulación.
7. Análisis.
8. Productos.
9. Configuración (incluida la contraseña de administrador).
10. Soporte (`/soporte/restaurar`).

## Parte 3: Símbolo y color por categoría

1. **Tarjeta de producto:** cada una muestra un círculo con el símbolo de su categoría. Los chips de categoría usan el mismo símbolo y color.
2. **Símbolos:** ya existen 8 en `components/IconDefs.jsx` (helados, acai, cafe, cookies, mitimiti, fruta, salsas, toppings). Agregar los que falten para las categorías actuales: Mix, Yogurt Helado y Oblea (hoy usan un ícono genérico), y un símbolo genérico de respaldo para cualquier categoría nueva.
3. **Color automático:** asignar el color del círculo según la categoría, sin configuración manual. Mantener el mapa actual de `utils/categoryColors.js` para las conocidas y, para una categoría nueva, calcular el color a partir del nombre normalizado (siempre el mismo color para la misma categoría) dentro de la paleta del diseño.
4. **Normalización:** comparar categorías sin distinguir mayúsculas, tildes ni espacios sobrantes ("Acaí" = "acai"), tanto en `categoryColors.js` como al listar los chips (`ProductsPage.jsx` y `TableDetailPage.jsx` deduplican hoy con un `Set`).
5. **Formulario de producto:** reemplazar el campo de texto libre de categoría por un selector con las categorías existentes y la opción "+ Nueva categoría", que abre un campo de texto solo cuando hace falta. Antes de crear una nueva, normalizar y comparar para no generar duplicados por una errata. Esto no requiere una tabla nueva ni cambios en el backend. Si ya está implementado, solo verificarlo.

---

## Casos a verificar explícitamente

1. A 1366×768 ninguna pantalla tiene scroll horizontal ni elementos cortados; revisar también 1600×900 y 1920×1080.
2. Sin internet y con el instalador (no en modo dev): las fuentes y los íconos se cargan bien.
3. Flujo completo con la app instalada: abrir turno, mover una mesa, agregar productos, "Dejar en la cuenta" (aparece "Cuenta guardada: $X"), volver a entrar a la mesa, cobrar con descuento, que abra la ventana del recibo, Reimprimir desde Reportes, cerrar turno.
4. Anular una venta con motivo y contraseña: la fila anulada se ve tachada, con motivo, fecha y cajero; "Cuadre actual" y las gráficas se actualizan sin recargar.
5. Análisis: con datos, con "Todo en orden" y con "Aún no hay suficientes datos".
6. Productos: crear uno con una categoría existente (por selector) y otro con una nueva; probar que "Acaí" y "acai" no generan dos categorías.
7. Las tarjetas de producto y los chips muestran el símbolo y el color de su categoría; una categoría nueva usa el símbolo genérico con un color estable.
8. Configuración: subir el logo, crear y cambiar la contraseña de administrador y descargar el backup manual.
9. Modo remoto simulado (con el header de Tailscale): se ve el banner y las pantallas de lectura funcionan.
10. Los recibos impresos (venta y comprobante de turno) se ven exactamente igual que antes.
11. `npm run build` corre limpio y no se agregan errores de lint nuevos.
12. El instalador sigue pesando aproximadamente lo mismo (las fuentes agregan pocos MB) y sigue sin dejar ningún `java.exe` vivo al cerrar.

## Criterio de terminado

- Todas las pantallas de la Parte 2 usan el nuevo sistema de diseño, sin cambios de función.
- Las tarjetas de producto y los chips muestran el símbolo y el color por categoría, y el formulario de producto usa selector.
- Los 12 casos de verificación pasan, con una captura por pantalla en el reporte.
- Versión 1.2.0 en `backend/pom.xml`, `frontend/package.json`, `electron/package.json` y los lockfiles, y el instalador se genera y se prueba instalado.

---

## Notas para Claude Code

- Antes de empezar, leer `design/` y reportar qué entrega y qué falta; no implementar nada si el diseño no está completo.
- Hacer primero la Parte 1 y mostrar una pantalla de ejemplo antes de seguir con todas.
- Un commit por pantalla, para poder revertir una sola sin perder el resto.
- No tocar la lógica de los componentes; si algún cambio visual obliga a mover algo de lógica, reportarlo antes.
- Recordar que en el instalador el frontend va suelto en `resources/frontend` y lo sirve el backend: probar siempre con el instalador generado, no solo con `npm run dev`.
- Sin push ni merge hasta que Gabs apruebe el resultado.
