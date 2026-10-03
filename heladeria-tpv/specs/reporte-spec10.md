# Reporte de la Especificación 10

Rama: `feature/spec-10` (sin push)

| Commit | Contenido |
|---|---|
| `bd930ce` | Parte 1 (contraseña de administrador), Parte 3 (análisis), backend de la Parte 2 (filtro de solo lectura, `/api/meta`, banner), versión 1.1.0 en el pom |
| `a657efc` | Parte 2: un solo origen servido por el backend. Va en un commit aparte para poder revertirlo solo |
| `6ccc4e1` | Documentación: `heladeria-tpv/specs/feature-cambios10.md` |

Para mergear a `main` cuando quieras: `git switch main && git merge feature/spec-10`

---

## 1. Problemas encontrados en el instalador (ninguno lo causa este cambio)

### 1.1 El Java del backend queda abierto al cerrar la app

- **Qué pasa:** al cerrar la app, el proceso Java del backend sigue vivo y ocupa el puerto 8080.
- **Causa:** este PC no tiene `electron/jre`, así que la app usa el Java del sistema. Ese `java` del PATH es un lanzador de Oracle (`C:\Program Files\Common Files\Oracle\Java\javapath\java.exe`) que a su vez abre el Java real (`C:\Program Files\Java\jdk-21\bin\java.exe`). Al cerrar, `killBackend` mata el lanzador; después `taskkill /T` ya no encuentra el árbol de procesos y el Java real queda huérfano.
- **Consecuencia:** en el siguiente arranque, la app se conectaría a ese backend viejo. Justo después de actualizar, sería el backend de la versión anterior.
- **Ya existía en la 1.0.0:** `killBackend` no cambió en este trabajo.
- **Arreglos posibles (falta que elijas uno):**
  1. Correr `taskkill /PID <pid> /T /F` primero y de forma síncrona, antes de matar el lanzador.
  2. Incluir un JRE propio en `electron/jre` (con `jlink`, como dice el README). Así no hay lanzador intermedio.

### 1.2 No se pudo probar la impresión física

- Este PC tiene detenido el servicio de cola de impresión de Windows ("The spooler service is not reachable"). Sin ese servicio, `window.print()` no abre el diálogo.
- No lo activé porque es configuración del sistema.
- Las ventanas de recibo sí abren en el nuevo origen y muestran bien los datos y el logo.

---

## 2. Reporte final de casos

| Caso | Resultado | Nota |
|---|---|---|
| 1-9 Contraseña | ✅ | Verificados por curl y en Chrome; no cambiaron con la Parte 2 |
| 10 Electron funciona igual | ⚠️ | Probado con la app instalada: abrir y cerrar turno, mesa, cobro, recibo, Reimprimir, comprobante de turno, logo, `/soporte/restaurar` y descarga de backup. Esta última responde 200 y abre el diálogo "Guardar como", igual que en la 1.0.0; lo cancelé. Pendientes: el Java que queda vivo y la impresión física (sección 1) |
| 11 Header de Tailscale | ✅ | Contra el backend instalado: los GET dan 200; POST, PUT, anular y `/api/backup` dan 403 |
| 12 Petición local | ✅ | Todos los permisos (crear y borrar cajero, lista de backups) |
| 13 Solo en 127.0.0.1:8080 | ✅ | `netstat`: `127.0.0.1:8080 LISTENING`. Antes escuchaba en `0.0.0.0` |
| 14 Prueba desde otro dispositivo | ⏳ | Te toca a ti (sección 5) |
| 15-20 Análisis | ✅ | Verificados con datos sembrados; no cambiaron |
| 21 Actualización desde 1.0.0 | ✅ | Con copia de la base; además el instalador 1.1.0 actualizó la 1.0.0 instalada en `Desktop\Heladeria TPV` |
| 22 Versión e instalador | ✅ | 1.1.0 en el pom, los dos `package.json` y los lockfiles. `Heladeria TPV Setup 1.1.0.exe` se generó sin errores; solo avisa que falta `electron/jre` |
| `npm run dev` | ✅ | Vite en `127.0.0.1:5173`; el proxy `/api` funciona y no marca las peticiones como remotas |
| Specs 4-9 | ❌ | No existen en disco ni en el historial de git. Si me los pasas, los agrego en otro commit de documentación |

### Tus 5 ajustes
- **127.0.0.1 literal:** se usa en el chequeo de arranque, los `loadURL` de Electron, el proxy de Vite y el host de Vite. No queda ningún `localhost` en el código.
- **Frontend fuera de `app.asar`:** confirmado en el build. El frontend va suelto en `resources/frontend` y `app.asar` solo contiene `main.js` y `package.json`.
- **Almacenamiento del navegador:** el frontend no usa `localStorage`, `sessionStorage`, IndexedDB ni cookies. Al actualizar de 1.0.0 a 1.1.0 no se pierde nada; todo vive en la base SQLite.
- **Ventanas de recibo/Reimprimir:** el `setWindowOpenHandler` ahora abre `http://127.0.0.1:8080/#/...`. Se mantiene el HashRouter.
- **Zona horaria y Partes 1 y 3:** sin cambios.

### Estado de este PC después de las pruebas
- La app 1.1.0 quedó instalada en `C:\Users\Administrator\Desktop\Heladeria TPV`.
- Quedaron datos de prueba en `%APPDATA%\heladeria-tpv`: cajero "Ana", producto "Acai 9oz", "Mesa 1", el logo, un turno abierto y cerrado, y una venta.
- La copia previa de esa carpeta está en el scratchpad de la sesión: `...\scratchpad\appdata-backup\heladeria-tpv`.

---

## 3. Parte 1: contraseña de administrador

### Backend
- **Dependencia:** solo `spring-security-crypto` (BCrypt). No se activa ningún filtro de Spring Security.
- **Hash en `BusinessSettings`:** campo `adminPasswordHash` con `@JsonIgnore`, así que nunca sale en un GET. En su lugar se expone `adminPasswordSet` (true/false).
- **`PUT /api/settings/admin-password` con `{ currentPassword, newPassword }`:** crea la contraseña si no existe, o la cambia exigiendo la actual. Mínimo 4 caracteres (puede ser un PIN).
- **`POST /api/settings/admin-password/reset` con `{ confirmacion: "RESTABLECER" }`:** borra el hash. Se usa desde `/soporte/restaurar`.
- **`POST /api/orders/{id}/anular` ahora recibe `{ motivo, password }`.** Valida en este orden:
  1. Hay contraseña configurada; si no, 409 "Configura la contraseña de administrador en Configuración".
  2. No hay un bloqueo activo; si lo hay, 429.
  3. La contraseña es correcta; si no, 403 "Contraseña incorrecta".
  4. El motivo no está vacío.
  5. La orden es del turno abierto.
- **Límite de intentos:** 5 fallos seguidos bloquean por 5 minutos. El contador vive en memoria y las constantes están en `AdminPasswordService`. Para pruebas se puede reducir con `-Dadmin.lock-seconds=10`.
- **Auditoría:** se agregó `anuladaPor` (el cajero del turno abierto). La fecha y hora de anulación ya existían en `voidedAt` y se exponen como `anuladaEn`.
- **Se eliminó `POST /api/orders/{id}/void`:** permitía anular sin contraseña ni motivo, y el frontend no lo usaba.
- **Logs:** las contraseñas nunca se registran. Lo verifiqué buscándolas en el log.

### Frontend
- **Configuración:** sección "Contraseña de administrador" para crearla o cambiarla (al cambiar pide la actual y la repetición).
- **Modal de anulación:** nuevo campo de contraseña. Confirmar queda deshabilitado si falta el motivo o la contraseña. Si la contraseña es incorrecta, el error aparece dentro del modal y el modal sigue abierto.
- **Sin contraseña configurada:** el botón Anular muestra un aviso con un botón "Ir a Configuración" en vez de abrir el modal.
- **"Ventas del periodo":** las filas anuladas muestran debajo el motivo, la fecha y hora de anulación y el cajero.
- **`/soporte/restaurar`:** nueva sección "Restablecer contraseña de administrador" con doble confirmación (botón y luego escribir RESTABLECER).

---

## 4. Parte 3: panel de análisis (offline)

### Backend: `GET /api/insights`
- Solo cuenta órdenes CONFIRMADO; las anuladas quedan fuera de todos los cálculos.
- Zona horaria fija America/Bogota. La app hace `TimeZone.setDefault` al arrancar. Las fechas se guardan en SQLite como milisegundos, así que en este PC (UTC-5) no cambia nada y en un PC con otra zona queda correcto.
- El rango base son los últimos 30 días completos, sin contar hoy.
- Con menos de 14 días con ventas, `hasEnoughData = false` y no se generan alertas ni recomendaciones.
- Los umbrales están todos en `InsightsThresholds.java`.
- Se crea el índice `idx_orders_created_at` al arrancar (`CREATE INDEX IF NOT EXISTS`, no destructivo).
- Qué devuelve:
  - **peakHours:** las 24 horas con su promedio de órdenes y de monto por día con ventas. Las 3 horas con más monto quedan marcadas como `peak`.
  - **weekdayStats:** el mismo cálculo por día de la semana.
  - **LOW_SALES_TODAY:** solo si hay turno abierto hace al menos 2 h. Compara lo vendido hoy hasta ahora con el promedio de los mismos días de la semana anteriores, a la misma hora. Toma hasta 4 semanas y exige mínimo 3. Alerta si va por debajo del 60 %.
  - **PRODUCT_DROP:** compara las unidades de los últimos 7 días con los 7 anteriores. Alerta si antes vendía al menos 5 y la caída es del 40 % o más.
  - **COMBO:** los 3 pares de productos que más aparecen juntos en un pedido, con mínimo 5 pedidos.
  - **DEAD_PRODUCT:** productos disponibles sin ventas en los últimos 14 días.
  - **VALLEY_PROMO:** la franja de 2 horas más floja dentro del horario normal de ventas.
  - Máximo 3 alertas y 5 recomendaciones.

### Frontend
- Ruta `/analisis` y enlace "Análisis" en el NavBar, con un punto rojo cuando hay alertas. Consulta `/api/insights` al abrir la app y cada 15 minutos.
- Tarjetas:
  - **Alertas:** muestra "Todo en orden" cuando no hay ninguna.
  - **Ventas por hora:** el mismo gráfico SVG de Reportes; los helpers se movieron a `utils/chartGeometry.js`, sin librerías nuevas.
  - **Productos más vendidos:** usa el endpoint de resumen existente.
  - **Ideas y recomendaciones.**
- Cuando no hay datos suficientes muestra "Aún no hay suficientes datos para analizar".

### Script de pruebas
`scripts/seed-insights-test.py` siembra datos solo en una copia de la base. No entra en el instalador y se niega a correr sobre la base real de AppData.

```
py scripts/seed-insights-test.py RUTA/heladeria.db --today low
py scripts/seed-insights-test.py RUTA/heladeria.db --today normal
```

---

## 5. Parte 2: acceso remoto con Tailscale (solo lectura)

### Objetivo
Que el dueño pueda abrir la app desde su celular o laptop, fuera de la heladería, para **ver** reportes y análisis sin poder modificar nada. Todo a través de la red privada de Tailscale, sin publicar nada en internet y sin abrir la app a la red local del local.

### Cómo funciona
```
Celular del dueño ──(red privada Tailscale)──> PC heladería
                                                 │
                                       tailscale serve (proxy)
                                                 │
                                       backend 127.0.0.1:8080
                                       (sirve la app + la API)
                                                 ▲
                                       Electron (local)
```

### Paso 0: cómo funcionaba antes
- Electron cargaba el frontend como archivo (`file://`, con `loadFile`), y lo mismo las ventanas de recibo.
- La URL de la API estaba fija: `http://localhost:8080/api` en `api/client.js` y `api/backup.js`.
- Se usaba HashRouter (se mantiene).
- No existía proxy en Vite (el spec decía "mantener el proxy actual").
- El backend escuchaba en `0.0.0.0:8080`, es decir, abierto a la red local de la heladería.

### Cambios (commit `a657efc`)
1. `server.address=127.0.0.1`: el backend solo acepta conexiones del propio PC.
2. Electron le pasa al backend `--spring.web.resources.static-locations=file:///.../resources/frontend/`. Esa carpeta va suelta en `extraResources`, no dentro de `app.asar`.
3. El frontend usa rutas relativas (`/api`). Vite corre en `127.0.0.1:5173` con proxy de `/api` a `127.0.0.1:8080`.
4. Electron carga `http://127.0.0.1:8080/`, y las ventanas de recibo y Reimprimir cargan `http://127.0.0.1:8080/#/...`.

### Filtro de solo lectura (commit `bd930ce`)
- Una petición es remota si trae `Tailscale-User-Login` o `X-Forwarded-For`. En ese caso solo se permite GET, todo lo demás da 403 "Acceso remoto de solo lectura", y `/api/backup/**` queda bloqueado por completo.
- Verifiqué en la documentación y en el código fuente de Tailscale que `tailscale serve`:
  - borra los headers `Tailscale-User-*` que mande el cliente y los vuelve a poner con la identidad real, así que no se pueden falsificar desde la tailnet;
  - siempre pone `X-Forwarded-For`, incluso para dispositivos "tagged".
- Electron no manda esos headers y conserva todos los permisos.
- `GET /api/meta` devuelve `{ remote: true/false }`, y cuando es true el frontend muestra el banner "Modo remoto (solo lectura)".

### Pasos manuales (una sola vez)
1. Instalar Tailscale en el PC de la heladería y en el celular o laptop del dueño, con la misma cuenta.
2. En el PC, en una consola como administrador: `tailscale serve --bg 8080`.
3. Desde el celular, abrir la URL que muestra Tailscale (`https://<pc>.<tu-red>.ts.net`). Debe cargar la app con el banner de solo lectura (caso 14).
4. Para soporte remoto del escritorio (ver la pantalla del PC) se usa otra herramienta.

### Limitaciones
- Cualquier persona que agregues a tu red de Tailscale puede ver los reportes. No puede modificar nada, pero sí ver ventas.
- **No usar `tailscale funnel`:** ese comando publica en internet. El filtro igual bloquearía las escrituras, pero los reportes quedarían visibles para cualquiera.
- Si el PC está apagado o sin internet, el acceso remoto no funciona. El cobro local sigue funcionando normal.

---

## 6. Otros cambios que debes conocer
- Nuevas respuestas de error: 429 para el bloqueo por intentos, 400 para un cuerpo de petición inválido, y 404 para un recurso inexistente (antes era 500).
- Versión 1.1.0 en `backend/pom.xml`, `frontend/package.json`, `electron/package.json` y los lockfiles.
- El lint del frontend da los mismos 5 errores y 1 aviso que ya existían; no agregué ninguno.
