---
name: frontend-patterns
description: Frontend development patterns for React, Electron, state management, performance optimization, and UI best practices.
origin: ECC
---

# Frontend Development Patterns

Modern frontend patterns for React, Electron, and performant user interfaces.

## When to Activate

- Building React components (composition, props, rendering)
- Managing state (useState, useReducer, Context)
- Optimizing performance (memoization, code splitting)
- Working with forms (validation, controlled inputs)
- Building Electron-specific UI patterns

## Component Patterns

### Composition Over Inheritance

```jsx
// GOOD: Component composition
function Card({ children, variant = 'default' }) {
  return <div className={`card card-${variant}`}>{children}</div>
}

function CardHeader({ children }) {
  return <div className="card-header">{children}</div>
}

function CardBody({ children }) {
  return <div className="card-body">{children}</div>
}

// Usage
<Card>
  <CardHeader>Cotización #001</CardHeader>
  <CardBody>Detalles del producto</CardBody>
</Card>
```

### Custom Hooks

```jsx
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue)
  const toggle = useCallback(() => setValue(v => !v), [])
  return [value, toggle]
}

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}
```

### State Management (Context + Reducer)

```jsx
const CotizadorContext = createContext(undefined)

function cotizadorReducer(state, action) {
  switch (action.type) {
    case 'SET_ITEMS': return { ...state, items: action.payload }
    case 'ADD_ITEM': return { ...state, items: [...state.items, action.payload] }
    case 'REMOVE_ITEM': return { ...state, items: state.items.filter(i => i.id !== action.payload) }
    case 'SET_LOADING': return { ...state, loading: action.payload }
    default: return state
  }
}

export function CotizadorProvider({ children }) {
  const [state, dispatch] = useReducer(cotizadorReducer, {
    items: [],
    loading: false
  })
  return (
    <CotizadorContext.Provider value={{ state, dispatch }}>
      {children}
    </CotizadorContext.Provider>
  )
}

export function useCotizador() {
  const context = useContext(CotizadorContext)
  if (!context) throw new Error('useCotizador must be used within CotizadorProvider')
  return context
}
```

## Performance Optimization

### Memoization

```jsx
const itemsTotal = useMemo(() =>
  items.reduce((sum, item) => sum + item.precio * item.cantidad, 0),
  [items]
)

const handleSearch = useCallback((query) => {
  setSearchQuery(query)
}, [])

export const ItemRow = React.memo(({ item, onRemove }) => (
  <tr>
    <td>{item.nombre}</td>
    <td>{item.precio}</td>
    <td>
      <button onClick={() => onRemove(item.id)}>Eliminar</button>
    </td>
  </tr>
))
```

## Form Handling

### Controlled Form with Validation

```jsx
export function ItemForm({ onSubmit }) {
  const [formData, setFormData] = useState({ nombre: '', precio: '', cantidad: 1 })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const newErrors = {}
    if (!formData.nombre.trim()) newErrors.nombre = 'Nombre requerido'
    if (!formData.precio || isNaN(formData.precio)) newErrors.precio = 'Precio inválido'
    if (formData.cantidad < 1) newErrors.cantidad = 'Cantidad mínima: 1'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.nombre}
        onChange={e => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
        placeholder="Nombre del producto"
      />
      {errors.nombre && <span className="error">{errors.nombre}</span>}
      <button type="submit">Agregar</button>
    </form>
  )
}
```

## Error Boundary

```jsx
export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Algo salió mal</h2>
          <button onClick={() => this.setState({ hasError: false })}>Reintentar</button>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Recuerda**: Mantén los componentes pequeños, enfocados y reutilizables.
