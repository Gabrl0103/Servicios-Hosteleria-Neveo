# Reporte de la Especificación 11: botón "Dejar en la cuenta"

**Estado:** implementado y probado. Los cambios están **sin commitear** en la rama `feature/spec-10`, que es la rama actual.

| Archivo | Cambio |
|---|---|
| `frontend/src/pages/TableDetailPage.jsx` | Botón "Dejar en la cuenta", seguimiento de los guardados en curso, espera, consulta del total real y navegación |
| `frontend/src/pages/TablesPage.jsx` | Muestra el aviso "Cuenta guardada: $X" que llega desde el detalle de la mesa |

El backend no se tocó. El guardado automático de la Especificación 6 sigue igual y no existe ningún carrito borrador.

---

## 1. Cómo funciona

### El botón
- Va debajo de "Cobrar este pedido", con estilo secundario (`btn-outline`, más pequeño y con borde) para que no se confunda con el cobro.
- Está deshabilitado cuando el panel está vacío o mientras guarda. Mientras guarda dice "Guardando...".

### Al presionarlo
1. **Espera los guardados en curso.** Cada llamada que guarda (agregar producto, +/−, quitar, vaciar) se registra en un conjunto mientras está en curso (`track()`). El botón espera a que terminen todas, y si mientras espera empieza otra, también la espera.
2. **Si algún guardado falló:**
   - no navega;
   - vuelve a pedir al backend la mesa y sus productos, y rehace el panel con lo que realmente quedó guardado;
   - muestra "No se pudo guardar todo en la cuenta: <motivo>. Se muestra lo que quedó guardado."
3. **Si todo salió bien:** pide la mesa al backend y toma su `pendingTotal`, no el total que calcula la pantalla.
4. **Navega a `/mesas`** con el mensaje "Cuenta guardada: $X".
5. **Si falla esa consulta final:** no navega y muestra el error.

### Doble clic
- El botón no escribe nada: solo espera, consulta y navega.
- Una referencia (`savingRef`) bloquea un segundo clic mientras el primero está en curso, así que no hay doble navegación.

### El aviso en Mesas
- La app no tiene un sistema global de notificaciones: cada pantalla muestra sus mensajes en línea, como "✓ Guardado" en Configuración.
- Por eso el mensaje viaja en el estado de navegación (`navigate('/mesas', { state: { notice } })`). `TablesPage` lo muestra en una etiqueta verde durante 3,5 segundos.
- Al mostrarlo, borra el estado de navegación para que el aviso no reaparezca al recargar la página.

### Modo remoto (solo lectura)
El botón solo hace lecturas (`GET /api/tables/{id}` y `GET /api/tables/{id}/items`), que el filtro remoto permite. No genera errores en modo remoto.

---

## 2. Verificación

Probado en Chrome contra el backend y Vite (`npm run dev`), con una copia de la base de prueba que tenía un turno abierto.

| Caso | Resultado | Nota |
|---|---|---|
| 1 Panel vacío | ✅ | Botón deshabilitado |
| 2 Dos productos | ✅ | Acai 9oz + Cookie: aparece "✓ Cuenta guardada: $ 25.000", navega a Mesas y la tarjeta de Mesa 1 muestra $ 25.000 |
| 3 Volver a entrar | ✅ | El panel muestra Acai 9oz ×1 y Cookie ×1, como se dejaron |
| 4 Toques rápidos | ✅ | 5 toques seguidos en "+" de Acai y el botón al instante: espera los 5 guardados y muestra $ 115.000, igual al backend (Acai ×6 + Cookie ×1) |
| 5 Falla al guardar | ✅ | Ver la nota sobre la simulación después de la tabla. Muestra "No se pudo guardar todo en la cuenta: Recurso no encontrado. Se muestra lo que quedó guardado.", no navega y el backend quedó igual (Acai ×6, Cookie ×1) |
| 5b Falla la consulta final | ✅ | Desvié la consulta de la mesa a una mesa inexistente: muestra "Mesa no encontrada" y no navega |
| 6 Doble clic | ✅ | Dos clics seguidos: una sola navegación, un solo aviso ($ 115.000) y nada nuevo en el backend |
| 7 Cobrar este pedido | ✅ | Confirmación, pago y venta #921 en Mesa 1 por $ 115.000 con Acai ×6 y Cookie ×1. La mesa queda en $ 0 y el panel vacío. La ventana del recibo no la revisé en Chrome (ver la nota después de la tabla) |
| 8 Build y lint | ✅ | `npm run build` limpio. El lint da los mismos 5 avisos que ya existían; no agregué ninguno |
| Modo remoto | ✅ | Con el header de Tailscale, `GET /api/tables/1` y `GET /api/tables/1/items` responden 200 |

**Nota sobre la simulación del caso 5:** desvié en el navegador la siguiente escritura de `/items` a una ruta inexistente, así que el backend respondió 404. Un primer intento de simulación quedó colgado por un error mío: aborté la petición antes de enviarla y el navegador no dispara ningún evento en ese caso. En uso real, una petición colgada la corta el `timeout` de 10 s de axios.

**Nota sobre el recibo del caso 7:** en Chrome, `window.open` desde un clic simulado puede quedar bloqueado. Ese código no cambió y ya se probó en Electron.

Captura del panel con productos: "Cobrar este pedido" en negro y debajo "Dejar en la cuenta" con borde, más pequeño.

---

## 3. Observaciones
- **Ya existía:** si se abre `#/mesas/1` directamente en el navegador, la app redirige a Turno mientras carga la sesión. Navegando dentro de la app no ocurre.
- **Sin optimismo:** hoy el detalle de mesa actualiza la pantalla después de que el backend responde, no antes. Por eso, cuando falla un guardado, la pantalla ya coincide con el backend. De todas formas el botón vuelve a cargar el panel desde el backend.

---

## 4. Pendientes (decisión tuya)
1. ¿Commiteo estos cambios en `feature/spec-10` o en una rama nueva `feature/spec-11`?
2. ¿Muevo `spec11.md` a `specs/` en un commit de documentación?
3. Siguen sin commitear `reporte-spec10.md`, `reporte-spec10-jre.md` y este reporte.
