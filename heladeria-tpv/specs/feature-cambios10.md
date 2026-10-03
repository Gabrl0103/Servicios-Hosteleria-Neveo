Especificación 10: Contraseña de administrador, acceso remoto con Tailscale y panel de análisis
Contexto

Continuación de los specs anteriores. La versión 1.0.0 ya está instalada en la heladería con datos reales. Esta especificación prepara la versión 1.1.0 con tres cambios independientes entre sí:

Pedir una contraseña de administrador para anular ventas (hoy la anulación solo pide motivo).
Permitir ver la app y los reportes desde fuera de la heladería usando Tailscale (solo lectura), sin desplegar nada en la nube.
Un panel de análisis con funciones "inteligentes" calculadas localmente (horas pico, alertas de baja venta, recomendaciones), sin IA externa y sin internet.

El rediseño visual de la UI NO forma parte de este spec (se hará aparte). Mantener los componentes nuevos simples y con estilos mínimos para que el rediseño los pueda adaptar fácil.

Por qué
Anular una venta afecta la caja; una contraseña evita anulaciones por error o por curiosidad. Como la app no tiene login (decisión de diseño con dos operadores de confianza), esta contraseña es una barrera práctica, no seguridad fuerte contra alguien con acceso al archivo .db.
El dueño necesita ver cómo va el negocio y dar soporte sin ir presencialmente, sin perder la ventaja de que la app funciona 100% local y sin depender de internet para cobrar.
Los datos ya existen (ventas, productos, horas); sacarles análisis básico no requiere servicios externos.
Parte 1: Contraseña de administrador para anular ventas

Una sola contraseña de administrador (no una por cajero). Se mantiene sin cambios: la anulación es soft-delete, con motivo obligatorio, y solo para ventas del turno abierto (Especificación 8).

Backend
Agregar solo la dependencia spring-security-crypto (para BCryptPasswordEncoder). NO agregar Spring Security completo: no debe activarse ningún filtro de autenticación.
En BusinessSettings agregar adminPasswordHash (String, nullable). El hash NUNCA se devuelve en ningún GET (usar @JsonIgnore o no incluirlo en el DTO). Exponer en su lugar un boolean adminPasswordSet.
PUT /api/settings/admin-password con { currentPassword, newPassword }: si ya existe contraseña, exigir currentPassword correcta; si no existe, crearla. Mínimo 4 caracteres, sin restricciones de formato (puede ser un PIN numérico).
POST /api/orders/{id}/anular ahora recibe { motivo, password }. Orden de validación: (a) existe contraseña configurada, si no → 409 "Configura la contraseña de administrador en Configuración"; (b) contraseña correcta, si no → 403 "Contraseña incorrecta"; (c) motivo no vacío; (d) la orden es del turno abierto.
Límite de intentos simple, en memoria: 5 contraseñas incorrectas seguidas bloquean los intentos por 5 minutos (mensaje claro al usuario). Constantes en un solo lugar.
Auditoría: la orden debe guardar anuladaEn (fecha y hora) y anuladaPor (nombre del cajero del turno activo). Verificar primero cuáles de estos campos ya existen en Order (la Especificación 8 pedía anuladaEn, pero la implementación solo confirmó motivoAnulacion) y agregar solo los que falten.
Nunca registrar contraseñas en logs.
Restablecer contraseña olvidada: en la ruta de soporte existente (/soporte/restaurar) agregar una sección "Restablecer contraseña de administrador" con doble confirmación (escribir "RESTABLECER"). Borra el hash; la app vuelve a pedir configurar una nueva.
Frontend
En Configuración: sección "Contraseña de administrador" (crear / cambiar; al cambiar pide la actual).
Modal de anulación (en ReportsPage.jsx): agregar campo de contraseña (type="password") además del motivo. Botón de confirmar deshabilitado si falta alguno. Si la contraseña es incorrecta, mostrar el error dentro del modal sin cerrarlo.
Si no hay contraseña configurada, el botón "Anular" muestra un aviso para configurarla en Configuración, en vez de abrir el modal.
No se crea pantalla nueva de "Anuladas". El historial vive en la tabla "Ventas del periodo": las filas anuladas (ya tachadas y con badge) muestran además, en texto pequeño, el motivo, la fecha/hora de anulación y el cajero.
Parte 2: Acceso remoto con Tailscale (solo lectura)

Objetivo: abrir la app desde un navegador (celular o laptop del dueño) a través de la red privada de Tailscale para ver reportes y análisis, sin exponer nada a internet ni a la red local de la heladería. El soporte remoto del PC (escritorio remoto) es un paso manual, ver sección "Pasos manuales".

Paso 0: investigar antes de cambiar

Reportar primero (sin modificar) cómo funciona hoy en producción:

¿Electron carga el frontend desde archivos (file://) o desde un servidor?
¿Cómo define el frontend la URL base de la API? (¿http://localhost:8080 escrita fija?)
¿Se usa HashRouter? (debe mantenerse).
Cambios
Un solo origen: que el backend Spring Boot sirva el build del frontend (carpeta static) y que el frontend llame a la API con rutas relativas (/api/...). En producción Electron carga ese mismo origen (http://127.0.0.1:8080). En desarrollo (Vite) se mantiene el proxy actual. Electron debe seguir funcionando igual, incluyendo la ventana de recibo y "Reimprimir".
El backend sigue escuchando solo en 127.0.0.1 (verificar/forzar server.address). No se abre a la red del local. El acceso remoto lo da tailscale serve (paso manual), que publica el puerto 8080 únicamente dentro de la red privada de Tailscale.
Modo solo lectura para accesos remotos: un filtro (OncePerRequestFilter) que detecta las peticiones remotas por los headers de identidad que tailscale serve agrega a las peticiones de la tailnet (confirmar el nombre exacto y que no se pueden falsificar desde el cliente, en la documentación vigente de Tailscale). Para peticiones remotas:
Permitir solo GET. Cualquier POST/PUT/PATCH/DELETE → 403 "Acceso remoto de solo lectura".
Bloquear por completo /api/backup/** (incluye la descarga de la base de datos).
Las peticiones locales (sin esos headers, como las de Electron) no cambian en nada.
GET /api/meta devuelve { remote: true|false } según el criterio anterior. El frontend muestra un banner discreto "Modo remoto (solo lectura)" cuando remote es true. No hace falta ocultar botones: los intentos de escritura reciben el 403 y se muestra el mensaje.
Si no se puede verificar de forma confiable el mecanismo de headers, NO improvisar: dejar el acceso remoto sin el filtro de solo lectura, documentar la limitación y avisar (la red privada de Tailscale más la contraseña de administrador siguen protegiendo la anulación).
Parte 3: Panel de análisis (offline, sin IA externa)

Todo se calcula en el backend con consultas sobre los datos existentes, sin librerías de machine learning y sin llamadas a internet. Las "ideas" son mensajes con plantillas de texto rellenadas con los datos reales (no hay modelo de lenguaje).

Reglas generales
Solo órdenes CONFIRMADO (excluir siempre las anuladas).
Zona horaria fija America/Bogota para agrupar por hora y para los límites de día (ya hubo un bug por usar UTC en filtros de fecha después de las 7 pm).
Rango base: últimos 30 días completos, sin contar hoy.
Si hay menos de 14 días con ventas, hasEnoughData = false y el panel muestra "Aún no hay suficientes datos para analizar" en vez de alertas o recomendaciones (evita falsos avisos en una instalación nueva).
Umbrales como constantes en un solo archivo (no se configuran desde la UI).
Revisar que exista índice sobre la fecha de la orden; agregarlo si falta.
Backend: GET /api/insights

Servicio simple (InsightsService, funciones sencillas, sin estructuras complicadas) que devuelve:

{
  "hasEnoughData": true,
  "peakHours":   [{ "hour": 15, "avgOrders": 4.2, "avgAmount": 61000 }],
  "weekdayStats":[{ "weekday": 1, "avgAmount": 540000 }],
  "alerts":      [{ "type": "LOW_SALES_TODAY", "message": "..." }],
  "recommendations": [{ "type": "COMBO", "message": "..." }]
}
Horas pico: por cada hora 0-23, promedio de órdenes y monto por día (dividiendo entre los días con ventas del rango). Marcar las 3 horas más altas como "pico". weekdayStats igual, por día de la semana.
Alerta LOW_SALES_TODAY: solo si hay turno abierto y han pasado al menos 2 horas desde su apertura. Compara el monto acumulado de hoy con el promedio, a la misma hora, de los últimos días con la misma semana-día (hasta 4 semanas, mínimo 3 de ellas). Si es menor al 60%, alerta con el porcentaje.
Alerta PRODUCT_DROP: unidades vendidas de un producto en los últimos 7 días vs los 7 anteriores; si los anteriores fueron al menos 5 unidades y la caída es de 40% o más, alerta.
Recomendación COMBO: pares de productos que aparecen juntos en el mismo pedido; mostrar los 3 pares más frecuentes con mínimo 5 pedidos. Ej: "Acai 9oz y Cookie se piden juntos en 12 pedidos del último mes: ¿armar un combo?".
Recomendación DEAD_PRODUCT: productos del menú sin ninguna venta en los últimos 14 días. Ej: "X no se vende hace 14 días: ¿promocionarlo o sacarlo del menú?".
Recomendación VALLEY_PROMO: la franja de 2 horas consecutivas con menos ventas, dentro del rango de horas en que normalmente hay ventas. Ej: "Tu franja más floja es 3-5 pm: ¿probar una promoción ahí?".
Máximo 3 alertas y 5 recomendaciones en total.
Frontend
Nueva ruta /analisis y enlace "Análisis" en el NavBar. Un punto indicador junto al enlace cuando hay alertas activas (consultar /api/insights al abrir la app y cada 15 minutos).
Pantalla con: tarjeta "Alertas" (si no hay: "Todo en orden"), gráfico de barras de ventas por hora (usar la librería de gráficos que ya usa Reportes, no agregar otra), top de productos (reutilizar el endpoint existente de productos más vendidos) y lista "Ideas y recomendaciones".
Manejar el estado hasEnoughData = false.
Al ser solo GET, esta pantalla funciona también en modo remoto.
Casos a verificar explícitamente

Contraseña

Sin contraseña configurada, intentar anular muestra el aviso y no anula.
Crear la contraseña en Configuración; cambiarla exigiendo la actual; con la actual incorrecta se rechaza.
Anular con contraseña correcta y motivo: queda anulada y la fila muestra motivo, fecha/hora y cajero.
Contraseña incorrecta: 403, no se anula y el modal sigue abierto con el error.
5 fallos seguidos bloquean por 5 minutos; pasado el tiempo vuelve a funcionar (probar con la constante reducida).
Llamar el endpoint directamente sin password o con una incorrecta es rechazado.
Ningún GET devuelve el hash de la contraseña.
Restablecer desde la ruta de soporte: la app vuelve a pedir configurar una nueva.
La regla de turno cerrado sigue vigente.

Acceso remoto 10. Build empaquetado de Electron funciona igual que antes (cobro, recibo, Reimprimir, mesas). 11. Simular una petición remota con curl agregando el header de identidad de Tailscale: GET de reportes funciona, POST devuelve 403, /api/backup/** devuelve 403. 12. Una petición sin ese header (local) conserva todos los permisos. 13. El backend solo escucha en 127.0.0.1:8080 (confirmar con netstat). 14. (Lo prueba Gabs a mano) Abrir la URL de Tailscale desde otro dispositivo carga la app y muestra el banner de solo lectura.

Análisis 15. Con base de datos vacía o menos de 14 días de ventas: hasEnoughData=false y ninguna alerta. 16. Con datos de prueba sembrados (script solo para pruebas, que no se incluye en producción): horas pico y promedios coinciden con un cálculo manual en SQL. 17. La alerta de ventas bajas se dispara con datos sembrados bajos y NO se dispara con datos normales. 18. Las ventas anuladas no entran en ningún cálculo. 19. Una venta a las 8 pm hora de Colombia cuenta en la hora 20 y en el día correcto. 20. Con datos sembrados aparecen los mensajes de COMBO, DEAD_PRODUCT, VALLEY_PROMO y PRODUCT_DROP.

Actualización 21. Con una copia de la base de datos de la versión 1.0.0 (con ventas): al arrancar la versión nueva no se pierde ningún dato y las columnas nuevas quedan creadas. 22. package.json en versión 1.1.0 y el instalador se genera sin errores.

Criterio de terminado
Anular una venta exige contraseña de administrador; el motivo, fecha/hora y cajero quedan visibles en "Ventas del periodo".
La app se puede abrir desde un navegador remoto vía Tailscale en modo solo lectura, y Electron sigue funcionando igual.
Existe la pantalla /analisis con horas pico, alertas y recomendaciones calculadas localmente, sin falsos avisos en instalaciones nuevas.
Los 22 casos pasan correctamente (el 14 lo confirma Gabs a mano).
mvn spring-boot:run y npm run build corren limpio.
Notas para Claude Code
Mantener todo simple: funciones y servicios sencillos, sin librerías de machine learning ni dependencias nuevas salvo spring-security-crypto.
Hacer el Paso 0 de la Parte 2 y reportar antes de cambiar cómo carga Electron el frontend: es el cambio con más riesgo de romper lo que ya funciona.
La base de datos de producción tiene datos reales: los cambios de esquema (adminPasswordHash, anuladaEn, anuladaPor, índices) deben aplicarse sin borrar la base. Verificar el ddl-auto actual y probar la migración con una copia (caso 21). Nunca asumir que se puede "borrar heladeria.db".
Recordar la diferencia de rutas: mvn spring-boot:run usa backend/heladeria.db, Electron usa %APPDATA%\heladeria-tpv\heladeria.db.
No tocar el diseño visual existente más allá de lo necesario para los componentes nuevos.