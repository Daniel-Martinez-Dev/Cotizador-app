const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const http = require('node:http')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
function getIconPath() {
  try {
    if (isDev) {
      const devIcon = path.join(__dirname, '..', 'src', 'assets', 'imagenes', 'logo.png')
      if (fs.existsSync(devIcon)) return devIcon
    }
    const assetsDir = path.join(__dirname, '..', 'dist', 'assets')
    const files = fs.readdirSync(assetsDir)
    const iconFile = files.find(f => /^logo-.*\.(png|ico|icns)$/i.test(f))
    if (iconFile) return path.join(assetsDir, iconFile)
  } catch {}
  return undefined
}

const isDev = !!process.env.ELECTRON_START_URL
let staticServer = null

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.html': return 'text/html'
    case '.js': return 'text/javascript'
    case '.css': return 'text/css'
    case '.json': return 'application/json'
    case '.png': return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.svg': return 'image/svg+xml'
    case '.ico': return 'image/x-icon'
    case '.webp': return 'image/webp'
    case '.ttf': return 'font/ttf'
    case '.woff': return 'font/woff'
    case '.woff2': return 'font/woff2'
    default: return 'application/octet-stream'
  }
}

// El navegador guarda IndexedDB y localStorage por *origen*, y ahí es justo
// donde Firebase Auth deja la sesión iniciada. Con `listen(0)` el sistema daba
// un puerto distinto en cada arranque, o sea un origen nuevo cada vez
// (http://127.0.0.1:53412, luego :61180, ...), y la app abría sin sesión: al
// cerrarla tocaba volver a iniciar sesión siempre. Con puerto fijo el origen no
// cambia y la sesión sobrevive. La lista es solo plan B por si otro programa
// tiene el puerto ocupado; el primero es el que se usa en la práctica.
const PUERTOS_APP = [47821, 47822, 47823, 47824, 47825]

function startStaticServer() {
  const distDir = path.join(__dirname, '..', 'dist')
  // Al reabrir la ventana (macOS) el servidor ya está escuchando: hay que
  // reutilizar su puerto, no levantar otro, o el origen cambiaría.
  if (staticServer) return Promise.resolve(staticServer.address().port)

  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url ?? '/', `http://${req.headers.host}`)
    let pathname = decodeURIComponent(reqUrl.pathname)

    if (pathname === '/') pathname = '/index.html'
    const filePath = path.join(distDir, pathname.replace(/^\//, ''))
    const hasExt = path.extname(filePath) !== ''

    const serveFile = (finalPath) => {
      fs.readFile(finalPath, (err, data) => {
        if (err) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        res.writeHead(200, { 'Content-Type': getMimeType(finalPath) })
        res.end(data)
      })
    }

    if (hasExt && fs.existsSync(filePath)) {
      serveFile(filePath)
      return
    }

    serveFile(path.join(distDir, 'index.html'))
  })

  const escuchar = (indice) => new Promise((resolve, reject) => {
    const onError = (err) => {
      // Puerto ocupado por otro programa: se prueba el siguiente de la lista.
      if (err && err.code === 'EADDRINUSE' && indice + 1 < PUERTOS_APP.length) {
        resolve(escuchar(indice + 1))
        return
      }
      reject(err)
    }
    server.once('error', onError)
    server.listen(PUERTOS_APP[indice], '127.0.0.1', () => {
      server.removeListener('error', onError)
      staticServer = server
      resolve(PUERTOS_APP[indice])
    })
  })

  return escuchar(0)
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      nativeWindowOpen: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Ventanas internas generadas por la propia app — no navegan a ningún sitio
    // externo, así que el filtro de hosts no aplica:
    //   · about:blank → plan B de impresión de las fichas de producción: normal-
    //     mente se imprimen desde un iframe oculto (sin abrir ninguna ventana),
    //     pero si eso falla FichaImpresionShell cae a window.open('', '_blank').
    //   · blob:/data: → vista previa de los PDF generados en el cliente.
    // Sin esta excepción el handler las denegaba, window.open devolvía null y
    // no se podía imprimir ni ver ningún PDF desde el escritorio.
    if (!url || url === 'about:blank' || url.startsWith('blob:') || url.startsWith('data:')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
          },
        },
      }
    }

    const allowedHosts = [
      'accounts.google.com',
      'apis.google.com',
    ]
    try {
      const target = new URL(url)
      const host = target.host.toLowerCase()
      const isAllowed =
        allowedHosts.includes(host) ||
        host.endsWith('.google.com') ||
        host.endsWith('.firebaseapp.com') ||
        host.endsWith('.googleapis.com')

      if (isAllowed) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 520,
            height: 720,
            parent: mainWindow,
            modal: true,
            webPreferences: {
              contextIsolation: true,
              nodeIntegration: false,
              nativeWindowOpen: true,
            },
          },
        }
      }
    } catch {}
    return { action: 'deny' }
  })

  if (isDev) {
    const url = process.env.ELECTRON_START_URL
    // Force hash route root in dev for HashRouter
    const withHash = url && url.includes('#') ? url : `${url}/#/`
    mainWindow.loadURL(withHash)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const port = await startStaticServer()
    const url = `http://127.0.0.1:${port}/#/`
    mainWindow.loadURL(url)
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.setAppUserModelId('com.ccs.cotizador')

// Una sola instancia: dos copias abiertas se pelearían por el puerto fijo y la
// segunda terminaría en otro origen, es decir sin la sesión iniciada. Si
// alguien vuelve a abrir la app, se trae al frente la ventana que ya existe.
const tieneInstanciaUnica = app.requestSingleInstanceLock()

if (!tieneInstanciaUnica) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(async () => {
    await createWindow()

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  if (staticServer) {
    staticServer.close()
    staticServer = null
  }
})
