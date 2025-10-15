// Preload in CommonJS to avoid ESM issues when packed
const { contextBridge } = require('electron')

try {
  contextBridge.exposeInMainWorld('appInfo', {
    env: process.env.NODE_ENV || 'production',
  })
} catch (e) {
  // no-op
}
