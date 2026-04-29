---
name: backend-patterns
description: Backend architecture patterns, data persistence, file I/O, and Electron IPC for Node.js/Electron apps.
origin: ECC
---

# Backend Development Patterns

Backend architecture patterns para aplicaciones Electron con Node.js.

## When to Activate

- Diseñando lógica de negocio en el proceso main de Electron
- Implementando persistencia de datos (JSON, SQLite, archivos)
- Manejando IPC entre main y renderer
- Implementando validación y manejo de errores
- Creando utilidades de exportación (PDF, Excel)

## Electron IPC Pattern

### Main Process (main.js)

```javascript
const { ipcMain } = require('electron')

// Registro centralizado de handlers
function registerIpcHandlers(db) {
  ipcMain.handle('cotizacion:crear', async (event, data) => {
    try {
      const cotizacion = await CotizacionService.create(db, data)
      return { success: true, data: cotizacion }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('cotizacion:listar', async (event, filtros) => {
    try {
      const cotizaciones = await CotizacionService.findAll(db, filtros)
      return { success: true, data: cotizaciones }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('cotizacion:eliminar', async (event, id) => {
    try {
      await CotizacionService.delete(db, id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}

module.exports = { registerIpcHandlers }
```

### Renderer Process (uso desde React)

```javascript
const { ipcRenderer } = window.require('electron')

// Wrapper para usar desde React
export async function crearCotizacion(data) {
  const result = await ipcRenderer.invoke('cotizacion:crear', data)
  if (!result.success) throw new Error(result.error)
  return result.data
}

export async function listarCotizaciones(filtros = {}) {
  const result = await ipcRenderer.invoke('cotizacion:listar', filtros)
  if (!result.success) throw new Error(result.error)
  return result.data
}
```

## Service Layer Pattern

```javascript
// services/CotizacionService.js
class CotizacionService {
  static async create(db, data) {
    const { cliente, items, descuento = 0, notas = '' } = data

    if (!cliente) throw new Error('Cliente requerido')
    if (!items || items.length === 0) throw new Error('Debe incluir al menos un item')

    const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
    const total = subtotal * (1 - descuento / 100)

    const cotizacion = {
      id: Date.now().toString(),
      cliente,
      items,
      subtotal,
      descuento,
      total,
      notas,
      fecha: new Date().toISOString(),
      estado: 'pendiente'
    }

    db.cotizaciones.push(cotizacion)
    await db.save()

    return cotizacion
  }

  static async findAll(db, filtros = {}) {
    let resultados = [...db.cotizaciones]

    if (filtros.estado) {
      resultados = resultados.filter(c => c.estado === filtros.estado)
    }
    if (filtros.cliente) {
      resultados = resultados.filter(c =>
        c.cliente.toLowerCase().includes(filtros.cliente.toLowerCase())
      )
    }

    return resultados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  }

  static async delete(db, id) {
    const index = db.cotizaciones.findIndex(c => c.id === id)
    if (index === -1) throw new Error('Cotización no encontrada')
    db.cotizaciones.splice(index, 1)
    await db.save()
  }
}

module.exports = CotizacionService
```

## Persistencia de Datos (JSON File)

```javascript
// db/JsonDatabase.js
const fs = require('fs').promises
const path = require('path')
const { app } = require('electron')

class JsonDatabase {
  constructor(filename = 'database.json') {
    this.filePath = path.join(app.getPath('userData'), filename)
    this.data = { cotizaciones: [], clientes: [], productos: [] }
  }

  async load() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8')
      this.data = JSON.parse(raw)
    } catch {
      // Primera vez - usar datos vacíos
      await this.save()
    }
    return this
  }

  async save() {
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
  }

  get cotizaciones() { return this.data.cotizaciones }
  get clientes() { return this.data.clientes }
  get productos() { return this.data.productos }
}

module.exports = JsonDatabase
```

## Error Handling

```javascript
// Errores operacionales (esperados)
class AppError extends Error {
  constructor(message, code = 'APP_ERROR') {
    super(message)
    this.code = code
    this.isOperational = true
  }
}

// Handler global en main process
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

// Retry con backoff
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 500))
    }
  }
}
```

**Recuerda**: Separa la lógica de negocio del proceso de Electron para facilitar pruebas y mantenimiento.
