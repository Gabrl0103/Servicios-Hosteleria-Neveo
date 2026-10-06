# Especificación 13: Confirmación con resumen al cerrar el turno

## Contexto

Continuación de los specs anteriores. En la pantalla Turno, "Cerrar turno" cierra la caja de inmediato y abre el comprobante de cierre. Esta especificación se implementa dentro de la versión 1.2.0, en la rama `feature/rediseno-ui` (Especificación 12), sobre la pantalla Turno rediseñada y usando el componente de modal del nuevo sistema de diseño. Si por algún motivo se hiciera antes del rediseño, usar el modal existente de la app y migrarlo después.

## Por qué

Un clic por error cierra la caja, y cerrar el turno tiene consecuencias que hoy no se pueden deshacer desde la app: no hay forma de reabrirlo y, según la Especificación 8, las ventas de un turno cerrado ya no se pueden anular. Una confirmación con el resumen del turno evita cierres accidentales y deja ver los números antes de cerrar.

---

## Cambio en el frontend

1. Al presionar "Cerrar turno" NO se cierra nada: se abre un modal de confirmación.
2. El modal muestra:
   - Título "Cerrar turno" (tipografía de títulos del diseño).
   - Cajero y hora de apertura del turno.
   - Resumen del turno: cantidad de ventas y total vendido (el total destacado), más el desglose por método de pago (efectivo, Nequi, Rappi, etc.).
   - Un aviso: "Al cerrar el turno ya no podrás anular las ventas de este turno."
   - Dos botones: "Cancelar" (secundario) y "Confirmar cierre" (principal).
3. El resumen se carga al abrir el modal desde el endpoint de resumen del turno que ya usan "Cuadre actual" y el comprobante de cierre. No recalcular totales en el frontend.
4. Las ventas anuladas no cuentan en el resumen (el endpoint ya las excluye).
5. Si el turno no tiene ventas, el resumen muestra $ 0 y el cierre se permite igual.
6. "Confirmar cierre" ejecuta el cierre existente y conserva el flujo de siempre: se abre el comprobante de cierre y la pantalla vuelve a "Abrir turno".
7. "Cancelar", la tecla Escape o un clic fuera del modal lo cierran sin cambiar nada: el turno sigue abierto y no se genera comprobante.
8. El foco inicial del modal queda en "Cancelar" (no en "Confirmar cierre"), para que un Enter accidental no cierre el turno.
9. Mientras se cierra, "Confirmar cierre" queda deshabilitado y dice "Cerrando..." para evitar un doble clic. Si el cierre falla, mostrar el error dentro del modal y dejarlo abierto con el turno todavía abierto.
10. Si `/api/meta` indica modo remoto (solo lectura), el botón "Cerrar turno" queda deshabilitado, para no llegar a un 403 después de ver el resumen.

## Mesas con cuenta pendiente

No se hace nada. Las cuentas de las mesas (incluidas las de los dueños del negocio) son independientes del turno: el modal no las menciona ni bloquea el cierre, y siguen guardadas después de cerrar.

## Backend

Idealmente ninguno. Antes de implementar, verificar si el endpoint de resumen del turno ya devuelve el cajero, la hora de apertura, la cantidad de ventas, el total y el desglose por método de pago. Si falta algún dato, agregarlo a ese mismo endpoint de lectura (GET), sin tocar la lógica de cierre ni las reglas de anulación.

---

## Casos a verificar explícitamente

1. Presionar "Cerrar turno" abre el modal con el resumen; el turno sigue abierto.
2. El resumen coincide con "Cuadre actual" (ventas, total y métodos de pago) y excluye las anuladas.
3. Cancelar, Escape y clic fuera cierran el modal sin cambios: turno abierto y sin comprobante.
4. Confirmar cierra el turno, abre el comprobante de cierre con los mismos números que mostró el resumen y la pantalla vuelve a "Abrir turno".
5. Doble clic en "Confirmar cierre": se cierra una sola vez y se abre un solo comprobante.
6. Turno sin ventas: el resumen muestra $ 0 y permite cerrar.
7. Con mesas con cuenta pendiente: el modal no las menciona ni bloquea, y tras el cierre las cuentas siguen intactas en Mesas.
8. Simular una falla del backend al cerrar: aparece el error dentro del modal y el turno sigue abierto.
9. Modo remoto simulado (header de Tailscale): el botón "Cerrar turno" aparece deshabilitado.
10. El foco inicial está en "Cancelar" y Enter no confirma el cierre.
11. `npm run build` corre limpio y no se agregan errores de lint nuevos. Probar el flujo completo con el instalador generado.

## Criterio de terminado

- "Cerrar turno" siempre pasa por el modal de confirmación con el resumen del turno.
- El cierre solo ocurre al presionar "Confirmar cierre" y el flujo posterior es el de siempre.
- Las mesas con cuenta pendiente no afectan el modal ni el cierre.
- Los 11 casos de verificación pasan correctamente.

---

## Notas para Claude Code

- No cambiar la lógica de cierre del turno ni las reglas de anulación: solo se agrega el paso de confirmación.
- Revisar si hay más de un lugar desde el que se puede cerrar el turno (por ejemplo desde Cuadre de caja o la barra superior) y reportarlo antes de implementar: la confirmación debe aplicar a todos.
- Reutilizar el componente de modal del sistema de diseño de la Especificación 12; si ya existe un modal de confirmación genérico (como el del cobro), reutilizarlo en lugar de crear otro.
- Mantener el código simple, sin librerías nuevas.
