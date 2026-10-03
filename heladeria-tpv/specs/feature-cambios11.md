Contexto

Continuación de los specs anteriores. Desde la Especificación 6 (guardado automático) cada producto que se toca en TableDetailPage.jsx se suma de inmediato al pendiente de la mesa en el backend, y el botón "Agregar sin pagar" fue eliminado porque quedó sin función: ya no existe un carrito borrador que confirmar.

Por qué

Los dueños y el equipo usan las mesas para llevar la cuenta de lo que se consume sin pagar. Eso ya funciona con el guardado automático, pero al no haber un botón de cierre, quien opera no tiene una confirmación visible de que la cuenta quedó guardada y puede dudar. Este spec NO vuelve al modo borrador: solo agrega una confirmación visible, sin cambiar el comportamiento de fondo.

Cambio en el frontend: src/pages/TableDetailPage.jsx
Agregar un botón secundario "Dejar en la cuenta" en el panel derecho ("Pedido actual"), cerca de "Cobrar este pedido" pero con menos peso visual (que no se confunda con el cobro).
El botón está deshabilitado cuando el panel está vacío (no hay nada que dejar en la cuenta).
Al presionarlo:
Esperar a que terminen las llamadas al backend que estén en curso (agregar, sumar/restar, quitar). No navegar con un guardado a medias.
Volver a pedir el estado real de la mesa al backend y tomar el pendingTotal de esa respuesta (no del estado local), para que el monto mostrado sea el que realmente quedó guardado.
Mostrar el mensaje "Cuenta guardada: $X" con ese monto, usando el mismo patrón de notificaciones ya usado en el resto de la app.
Navegar a la pantalla de Mesas (/mesas). Si la notificación es propia de cada pantalla, pasar el mensaje por el estado de navegación o mostrarlo en la misma pantalla durante aproximadamente 1 segundo antes de navegar (decisión de Claude Code según el patrón existente).
Si algún guardado pendiente falla, o la consulta al backend falla, no navegar: mostrar el error y dejar al usuario en la mesa con lo que el backend tiene realmente.
Presionar el botón dos veces seguidas no debe duplicar nada (el botón no hace ninguna escritura nueva; solo espera, consulta y navega).
Sin cambios
Backend: ningún cambio. El botón no crea endpoints nuevos ni escribe nada.
El guardado automático de cada producto sigue igual, sin carrito borrador.
"Cobrar este pedido" y el botón "Mesas" siguen igual.
En modo remoto (solo lectura) el botón no genera ningún error, porque solo hace lecturas.
Casos a verificar explícitamente
Con el panel vacío, el botón aparece deshabilitado.
Agregar 2 productos y presionar el botón: aparece "Cuenta guardada: $X" con el monto correcto y se navega a Mesas. La tarjeta de esa mesa muestra el mismo monto.
Volver a entrar a la mesa: los productos siguen en el panel, tal como se dejaron.
Tocar varios productos rápido y presionar el botón de inmediato: espera a que terminen los guardados y el monto mostrado coincide con el total real.
Simular una falla del backend al guardar: el botón muestra el error y no navega.
Presionar el botón dos veces seguidas: no se duplica nada ni se rompe la navegación.
"Cobrar este pedido" sigue funcionando igual (confirmación, pago, recibo, mesa en cero).
npm run build corre limpio y no se agregan errores de lint nuevos.
Criterio de terminado
En el detalle de mesa existe el botón "Dejar en la cuenta", deshabilitado con el panel vacío.
Al presionarlo se muestra "Cuenta guardada: $X" con el monto real del backend y se vuelve a Mesas.
El comportamiento de guardado automático no cambió y no existe ningún estado de borrador.
Los 8 casos de verificación pasan correctamente.
Notas para Claude Code
No reintroducir un carrito borrador ni un paso de "confirmar" para guardar: el guardado automático de la Especificación 6 se mantiene tal cual.
Revisar cómo se llevan hoy las llamadas en curso (actualización visual inmediata con reversión si falla) para que el botón espere a las pendientes de forma simple, por ejemplo con un contador de operaciones en curso.
Mantener el código simple, sin librerías nuevas