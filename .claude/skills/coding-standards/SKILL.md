---
name: coding-standards
description: Cross-project coding standards covering naming, readability, immutability, error handling, and quality review for JavaScript/React/Electron.
origin: ECC
---

# Coding Standards & Best Practices

Baseline cross-project coding conventions for the Cotizador app.

## Principios Clave

1. **Readability First** — El código se lee más de lo que se escribe
2. **KISS** — Solución más simple que funcione sin sobre-ingeniería
3. **DRY** — Extrae lógica común, evita duplicación
4. **YAGNI** — Construye solo lo que se necesita ahora

## Inmutabilidad (No negociable)

```javascript
// GOOD: spread operators para actualizaciones
const updatedItem = { ...item, precio: nuevoP recio }
const updatedItems = [...items, newItem]
const filteredItems = items.filter(i => i.id !== idToRemove)

// BAD: mutación directa
item.precio = nuevoPrecio
items.push(newItem)
```

## Naming Conventions

```javascript
// Variables: camelCase descriptivo
const totalCotizacion = items.reduce(...)    // GOOD
const t = items.reduce(...)                   // BAD

// Funciones: verbo-sustantivo
function calcularDescuento(subtotal, pct) {} // GOOD
function descuento(s, p) {}                  // BAD

// Componentes React: PascalCase
function CotizacionCard({ cotizacion }) {}   // GOOD

// Hooks: prefijo 'use'
function useCotizaciones() {}               // GOOD

// Constantes: UPPER_SNAKE_CASE
const MAX_ITEMS_POR_COTIZACION = 100
const IVA_DEFAULT = 0.19
```

## Type Safety (sin TypeScript)

```javascript
// Validar en boundaries del sistema
function crearCotizacion({ cliente, items, descuento = 0 }) {
  if (typeof cliente !== 'string' || !cliente.trim()) {
    throw new Error('Cliente debe ser un string no vacío')
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Debe incluir al menos un item')
  }
  if (typeof descuento !== 'number' || descuento < 0 || descuento > 100) {
    throw new Error('Descuento debe ser entre 0 y 100')
  }
}

// Valores por defecto siempre explícitos
function calcularTotal({ subtotal, descuento = 0, iva = 0.19 } = {}) {
  return subtotal * (1 - descuento / 100) * (1 + iva)
}
```

## Error Handling

```javascript
// Wrap async con try-catch
async function guardarCotizacion(data) {
  try {
    const result = await db.save(data)
    return result
  } catch (error) {
    console.error('Error guardando cotización:', error.message)
    throw new Error(`No se pudo guardar: ${error.message}`)
  }
}

// En componentes React — manejo visual
const [error, setError] = useState(null)

const handleSubmit = async (data) => {
  setError(null)
  try {
    await crearCotizacion(data)
  } catch (err) {
    setError(err.message)
  }
}
```

## File Organization

```
src/
├── components/       # Componentes React reutilizables
│   ├── CotizacionCard/
│   │   └── index.jsx
│   └── ItemTable/
│       └── index.jsx
├── pages/            # Vistas/pantallas principales
│   ├── NuevaCotizacion.jsx
│   └── ListaCotizaciones.jsx
├── hooks/            # Custom hooks
│   ├── useCotizaciones.js
│   └── useClientes.js
├── services/         # Lógica de negocio
│   └── CotizacionService.js
└── utils/            # Utilidades puras
    ├── calculos.js
    └── formateo.js
```

## Code Quality Checklist

Antes de considerar una tarea completa:

- [ ] No hay `console.log` de debug en producción
- [ ] Funciones tienen un solo propósito claro
- [ ] No hay valores hardcodeados (usar constantes)
- [ ] Strings de usuario en español
- [ ] Manejo de errores en operaciones async
- [ ] Componentes < 150 líneas (dividir si es mayor)
- [ ] Nombres descriptivos (sin abreviaciones oscuras)
