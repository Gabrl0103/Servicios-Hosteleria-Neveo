const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')
const fs = require('fs')
const { pathToFileURL } = require('url')

let backendProcess = null
let mainWindow = null

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
  // En produccion se incluye un JRE empaquetado dentro de resources/jre.
  // En desarrollo se usa el java instalado en el sistema (JAVA_HOME o PATH).
  if (isDev) {
    return 'java'
  }
  const bundledJava = path.join(
    process.resourcesPath,
    'jre',
    process.platform === 'win32' ? 'bin/java.exe' : 'bin/java'
  )
  return fs.existsSync(bundledJava) ? bundledJava : 'java'
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

    backendProcess = spawn(javaExecutable, args, {
      env: { ...process.env, APP_DATA_DIR: getAppDataDir() },
    })

    backendProcess.stdout.on('data', (data) => {
      console.log(`[backend] ${data}`)
    })

    backendProcess.stderr.on('data', (data) => {
      console.error(`[backend] ${data}`)
    })

    backendProcess.on('error', (err) => {
      reject(err)
    })

    backendProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`El backend termino con codigo ${code}`)
      }
    })

    waitForBackend(resolve, reject)
  })
}

function waitForBackend(resolve, reject, attemptsLeft = 60) {
  if (attemptsLeft <= 0) {
    reject(new Error('El backend no respondio a tiempo'))
    return
  }

  http
    .get(BACKEND_URL, () => resolve())
    .on('error', () => {
      setTimeout(() => waitForBackend(resolve, reject, attemptsLeft - 1), 500)
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

app.whenReady().then(async () => {
  try {
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

function killBackend() {
  if (!backendProcess) return
  const pid = backendProcess.pid
  backendProcess = null
  try {
    process.kill(pid)
  } catch (_) {}
  // Ensure the whole process tree is gone on Windows
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
  }
}

app.on('window-all-closed', () => {
  killBackend()
  app.quit()
})

app.on('before-quit', () => {
  killBackend()
})
