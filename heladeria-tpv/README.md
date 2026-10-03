# Heladeria TPV

Sistema de punto de venta de escritorio para la heladeria. Corre 100% local,
sin internet ni servidores externos. Backend en Spring Boot, frontend en
React, empaquetado como app de escritorio con Electron, y base de datos
SQLite (un solo archivo).

## Estructura

```
heladeria-tpv/
├── backend/    Spring Boot + SQLite (API REST)
├── frontend/   React + Vite (interfaz del TPV)
└── electron/   Cascaron de escritorio (junta todo en un .exe)
```

## Requisitos para desarrollar

- Java 17 o superior
- Maven
- Node.js 18 o superior

## 1. Backend (Spring Boot)

```bash
cd backend
mvn spring-boot:run
```

Queda corriendo en `http://localhost:8080`. El primer arranque crea
automaticamente un usuario administrador con PIN `0000` (cambialo desde la
app apenas entres).

La base de datos SQLite se crea en la carpeta actual como `heladeria.db`
cuando corres asi, en modo desarrollo. En la app empaquetada, se crea en una
carpeta de datos del usuario para que sobreviva actualizaciones.

Para probar los endpoints con Postman/EchoAPI, la URL base es
`http://localhost:8080/api`.

## 2. Frontend (React)

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173` en el navegador. Necesita el backend corriendo
al mismo tiempo (paso anterior).

## 3. Generar el instalador (.exe)

Primero compila el backend a un .jar:

```bash
cd backend
mvn clean package -DskipTests
```

Esto genera `backend/target/heladeria-tpv.jar`.

Luego compila el frontend:

```bash
cd frontend
npm run build
```

Esto genera `frontend/dist/`.

Genera el JRE empaquetado (solo la primera vez, ver "JRE empaquetado" abajo)
y finalmente empaqueta todo con Electron:

```bash
cd electron
npm install
npm run dist
```

El instalador queda en `electron/dist/`. Ese es el archivo que se lleva a la
heladeria e instala una sola vez.

### JRE empaquetado (obligatorio para el instalador)

El instalador incluye su propio Java en `electron/jre/` (queda en
`resources/jre` dentro de la instalacion) y la app usa ese `java.exe`
directamente. No usa el Java del PC: en Windows el `java` del PATH suele
ser el lanzador de Oracle (`javapath\java.exe`), que abre otro proceso y
dejaba el backend abierto al cerrar la app.

`electron/jre/` esta en `.gitignore` (no se sube al repo). Hay que generarlo
una vez en cada maquina donde se construya el instalador, y de nuevo si
cambian las dependencias del backend o la version de Java. Usa el JDK 21:

```bash
# 1. Compilar el backend (genera backend/target/heladeria-tpv.jar)
cd backend && mvn clean package -DskipTests && cd ..

# 2. (Opcional) Ver que modulos necesita el backend
mkdir tmp-jdeps && cd tmp-jdeps
"C:/Program Files/Java/jdk-21/bin/jar" xf ../backend/target/heladeria-tpv.jar
"C:/Program Files/Java/jdk-21/bin/jdeps" --ignore-missing-deps --print-module-deps \
  --multi-release 21 --recursive --class-path "BOOT-INF/lib/*" BOOT-INF/classes
cd .. && rm -rf tmp-jdeps

# 3. Generar el runtime reducido (~50 MB)
rm -rf electron/jre
"C:/Program Files/Java/jdk-21/bin/jlink" \
  --add-modules java.base,java.compiler,java.desktop,java.instrument,java.management,java.net.http,java.prefs,java.rmi,java.scripting,java.security.jgss,java.sql.rowset,jdk.jfr,jdk.unsupported,jdk.localedata,jdk.charsets,jdk.crypto.ec \
  --include-locales=en,es \
  --strip-debug --no-header-files --no-man-pages --compress=zip-6 \
  --output electron/jre
```

La lista de modulos es la salida de `jdeps` mas tres que `jdeps` no detecta
porque se cargan en tiempo de ejecucion: `jdk.localedata` (nombres de dias y
formatos en español), `jdk.charsets` y `jdk.crypto.ec`. Si `jdeps` muestra
un modulo nuevo, agregalo a `--add-modules`.

Sin `electron/jre`, `npm run dist` genera un instalador que no arranca
(muestra "No se encontro el Java incluido en la instalacion"). En desarrollo
(`npm start` en `electron/`) se usa `electron/jre` si existe, si no el Java
del sistema.

## Usuarios y roles

- **ADMIN**: gestiona productos, ve reportes, abre/cierra turno.
- **CAJERO**: vende, cobra, anula ventas, abre/cierra turno.

El login es por PIN numerico, sin usuario ni contraseña de texto.

## Modulos incluidos (Fase 1)

- Ventas para llevar (sin mesas), con catalogo de productos
- Cobro en efectivo (con calculo de cambio y botones de billete),
  Nequi y Rappi
- Anulacion de ventas confirmadas, con trazabilidad de quien anulo
- Turnos de caja (apertura/cierre por fecha y hora, sin montos de dinero)
- Reportes de ventas por metodo de pago, con filtro de rango de fechas
  (hoy, semana, mes, personalizado)
- Barra en vivo de ventas del turno actual, desglosada por metodo de pago

## Pendiente para una Fase 2 (no incluido ahora)

- Inventario de insumos con descuento automatico por receta
- IVA / impuestos desglosados
- Combos y descuentos
- Backup/restauracion de la base de datos desde la interfaz
