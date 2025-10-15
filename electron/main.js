import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    const url = process.env.ELECTRON_START_URL
    // Force hash route root in dev for HashRouter
    const withHash = url && url.includes('#') ? url : `${url}/#/`
    mainWindow.loadURL(withHash)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html')
    // Force hash route root
    mainWindow.loadFile(indexHtml, { hash: '/' })
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.setAppUserModelId('com.ccs.cotizador')

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
