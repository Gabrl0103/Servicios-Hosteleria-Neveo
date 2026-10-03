const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const { spawn, spawnSync, execFileSync } = require('child_process')
const http = require('http')
const fs = require('fs')
const { pathToFileURL } = require('url')

let backendProcess = null
let mainWindow = null
// true solo si esta instancia arranco un backend: evita que una segunda
// instancia (o un arranque fallido) cierre el backend de otra.
let startedBackend = false

const isDev = !app.isPackaged
const BACKEND_PORT = 8080
// 127.0.0.1 literal, nunca "localhost": en Windows puede resolver a IPv6 (::1)
// y el backend escucha solo en IPv4.
const BACKEND_ORIGIN = `http://127.0.0.1:${BACKEND_PORT}`
const BACKEND_URL = `${BACKEND_ORIGIN}/api/products`
// En produccion el backend sirve tambien la interfaz (un solo origen, igual
// que el acceso remoto por Tailscale). En desarrollo se usa Vite.
const APP_ORIGIN = isDev ? 'http://127.0.0.1:5173' : BACKEND_ORIGIN

function getAppDataDir() {
  // Carpeta persistente del usuario, fuera de la carpeta de instalacion,
  // para que la base de datos sobreviva actualizaciones y reinstalaciones.
  const dir = path.join(app.getPath('appData'), 'heladeria-tpv')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getJavaExecutable() {
  // JRE propio generado con jlink (ver README): en produccion en resources/jre,
  // en desarrollo en electron/jre. Se usa ese java.exe directo; el "java" del
  // PATH en Windows suele ser el lanzador de Oracle (javapath), que abre otro
  // proceso hijo y deja el backend huerfano al cerrar la app.
  const exe = process.platform === 'win32' ? 'java.exe' : 'java'
  const jreDir = isDev ? path.join(__dirname, 'jre') : path.join(process.resourcesPath, 'jre')
  const bundledJava = path.join(jreDir, 'bin', exe)
  if (fs.existsSync(bundledJava)) {
    return bundledJava
  }
  if (isDev) {
    return 'java'
  }
  throw new Error(`No se encontro el Java incluido en la instalacion: ${bundledJava}`)
}

function getJarPath() {
  if (isDev) {
    return path.join(__dirname, '..', 'backend', 'target', 'heladeria-tpv.jar')
  }
  return path.join(process.resourcesPath, 'backend', 'heladeria-tpv.jar')
}

function getFrontendDir() {
  // Archivos sueltos en resources/frontend (extraResources, fuera de app.asar):
  // Java no puede leer dentro de un .asar.
  return path.join(process.resourcesPath, 'frontend')
}

// ---------------------------------------------------------------------------
// Procesos y puerto (Windows)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// PIDs con un socket TCP IPv4 en escucha en el puerto. No depende del idioma
// de Windows: en escucha, la direccion remota es siempre 0.0.0.0:0.
function findListeningPids(port) {
  if (process.platform !== 'win32') return []
  let out = ''
  try {
    out = execFileSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8', windowsHide: true })
  } catch (_) {
    return []
  }
  const pids = new Set()
  for (const line of out.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/)
    if (cols.length >= 5 && cols[0] === 'TCP' && cols[1].endsWith(`:${port}`) && cols[2] === '0.0.0.0:0') {
      const pid = Number(cols[4])
      if (pid > 0) pids.add(pid)
    }
  }
  return [...pids]
}

function describeProcess(pid) {
  try {
    const out = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `$p = Get-CimInstance Win32_Process -Filter "ProcessId=${Number(pid)}"; if ($p) { $p.Name; $p.CommandLine }`,
      ],
      { encoding: 'utf8', windowsHide: true, timeout: 15000 }
    )
    const [name = '', ...rest] = out.split(/\r?\n/)
    return { name: name.trim(), commandLine: rest.join(' ').trim() }
  } catch (_) {
    return { name: '', commandLine: '' }
  }
}

// Backend de esta app (cualquier version): java ejecutando heladeria-tpv.jar.
function isOurBackend(info) {
  return /^javaw?\.exe$/i.test(info.name) && info.commandLine.includes('heladeria-tpv.jar')
}

function killProcessTree(pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
  } else {
    try {
      process.kill(pid)
    } catch (_) {}
  }
}

/**
 * Antes de arrancar: si el puerto esta ocupado por un backend huerfano de
 * esta app, se cierra; si lo ocupa otro programa, no se conecta en silencio
 * a el y se muestra un error claro.
 */
async function ensurePortFree() {
  const pids = findListeningPids(BACKEND_PORT)
  if (pids.length === 0) return

  const foreign = []
  for (const pid of pids) {
    const info = describeProcess(pid)
    if (isOurBackend(info)) {
      console.log(`Cerrando backend anterior que seguia abierto (PID ${pid})`)
      killProcessTree(pid)
    } else {
      foreign.push(`${info.name || 'programa desconocido'} (PID ${pid})`)
    }
  }
  if (foreign.length > 0) {
    throw new Error(
      `El puerto ${BACKEND_PORT} ya esta en uso por otro programa: ${foreign.join(', ')}.\n` +
        'Cierra ese programa (o reinicia el equipo) y vuelve a abrir la aplicacion.'
    )
  }

  for (let i = 0; i < 20 && findListeningPids(BACKEND_PORT).length > 0; i++) {
    await sleep(250)
  }
  if (findListeningPids(BACKEND_PORT).length > 0) {
    throw new Error(`No se pudo liberar el puerto ${BACKEND_PORT}. Reinicia el equipo y vuelve a intentar.`)
  }
}

// ---------------------------------------------------------------------------

function startBackend() {
  return new Promise((resolve, reject) => {
    const javaExecutable = getJavaExecutable()
    const jarPath = getJarPath()

    if (!fs.existsSync(jarPath)) {
      reject(new Error(`No se encontro el archivo del backend en: ${jarPath}`))
      return
    }

    const args = ['-jar', jarPath]
    if (!isDev) {
      const frontendUrl = pathToFileURL(getFrontendDir()).href + '/'
      args.push(`--spring.web.resources.static-locations=${frontendUrl}`)
    }

    let settled = false
    const done = (fn) => (value) => {
      if (!settled) {
        settled = true
        fn(value)
      }
    }
    resolve = done(resolve)
    reject = done(reject)

    backendProcess = spawn(javaExecutable, args, {
      env: { ...process.env, APP_DATA_DIR: getAppDataDir() },
      windowsHide: true,
    })
    startedBackend = true

    backendProcess.stdout.on('data', (data) => {
      console.log(`[backend] ${data}`)
    })

    backendProcess.stderr.on('data', (data) => {
      console.error(`[backend] ${data}`)
    })

    backendProcess.on('error', (err) => {
      reject(err)
    })

    const child = backendProcess
    child.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`El backend termino con codigo ${code}`)
      }
      // Si el backend se cae durante el arranque, no se acepta la respuesta
      // de otro proceso en el mismo puerto.
      reject(new Error(`El backend se cerro durante el arranque (codigo ${code})`))
    })

    waitForBackend(child, resolve, reject)
  })
}

function waitForBackend(child, resolve, reject, attemptsLeft = 60) {
  if (attemptsLeft <= 0) {
    reject(new Error('El backend no respondio a tiempo'))
    return
  }

  http
    .get(BACKEND_URL, (res) => {
      res.resume()
      if (child.exitCode === null) resolve()
    })
    .on('error', () => {
      setTimeout(() => waitForBackend(child, resolve, reject, attemptsLeft - 1), 500)
    })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.setMenuBarVisibility(false)

  mainWindow.loadURL(`${APP_ORIGIN}/`)

  mainWindow.webContents.setWindowOpenHandler(({ url, features }) => {
    const width = parseInt((features.match(/width=(\d+)/) || [])[1]) || 420
    const height = parseInt((features.match(/height=(\d+)/) || [])[1]) || 720
    const parsed = new URL(url, APP_ORIGIN)
    const hash = parsed.hash || parsed.pathname
    const child = new BrowserWindow({
      width,
      height,
      parent: mainWindow,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    })
    child.setMenuBarVisibility(false)
    // Recibo / Reimprimir: mismo origen que la ventana principal, con HashRouter.
    child.loadURL(`${APP_ORIGIN}/#${hash.replace(/^#/, '')}`)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Una sola instancia: abrir la app de nuevo enfoca la ventana existente
// en vez de arrancar (y luego cerrar) un segundo backend.
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    try {
      await ensurePortFree()
      await startBackend()
      createWindow()
    } catch (err) {
      dialog.showErrorBox(
        'No se pudo iniciar la aplicacion',
        `Ocurrio un problema arrancando el sistema:\n${err.message}`
      )
      app.quit()
    }
  })
}

function killBackend() {
  if (!startedBackend) return
  if (backendProcess) {
    const pid = backendProcess.pid
    backendProcess = null
    // Sincrono y con /T: cierra java.exe y cualquier proceso hijo antes de salir.
    killProcessTree(pid)
  }
  // Respaldo: si un backend de esta app sigue escuchando en el puerto, cerrarlo.
  for (const pid of findListeningPids(BACKEND_PORT)) {
    if (isOurBackend(describeProcess(pid))) {
      killProcessTree(pid)
    }
  }
}

app.on('window-all-closed', () => {
  killBackend()
  app.quit()
})

app.on('before-quit', () => {
  killBackend()
})
