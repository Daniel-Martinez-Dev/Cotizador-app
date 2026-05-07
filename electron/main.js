import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import http from 'node:http'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

function startStaticServer() {
  const distDir = path.join(__dirname, '..', 'dist')
  return new Promise((resolve) => {
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

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Puerto ocupado por otra instancia — reusarlo
        resolve(49821)
      } else {
        // Fallback a puerto aleatorio
        server.listen(0, '127.0.0.1', () => {
          staticServer = server
          resolve(server.address()?.port)
        })
      }
    })

    server.listen(49821, '127.0.0.1', () => {
      staticServer = server
      resolve(49821)
    })
  })
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

app.whenReady().then(async () => {
  await createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  if (staticServer) {
    staticServer.close()
    staticServer = null
  }
})
