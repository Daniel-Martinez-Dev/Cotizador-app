---
name: verification-loop
description: Systematic verification workflow to ensure code changes work correctly before declaring a task complete. Covers testing, edge cases, and regression checks.
origin: ECC
---

# Verification Loop

Flujo sistemático de verificación para asegurar que los cambios funcionan antes de declarar una tarea completa.

## When to Activate

- Después de implementar una feature nueva
- Después de corregir un bug
- Antes de reportar una tarea como completada
- Cuando hay cambios en lógica de negocio crítica (cálculos, precios, IVA)
- Cuando hay cambios que afectan múltiples componentes

## El Loop de Verificación

```
Implementar → Verificar → Encontrar Problema → Corregir → Re-verificar → ✓ Completo
```

### Paso 1: Verificación Estática

```javascript
// 1. Revisa que no hay errores obvios
- ¿Los imports están correctos?
- ¿Los nombres de variables son correctos?
- ¿Las funciones se llaman con los parámetros correctos?
- ¿Hay console.log de debug que remover?
```

### Paso 2: Verificación de Lógica de Negocio

Para el Cotizador, siempre verifica:

```javascript
// Cálculos críticos
const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
// ✓ ¿El reduce maneja array vacío? (devuelve 0 con initialValue)
// ✓ ¿precio y cantidad son números? (no strings)
// ✓ ¿El descuento se aplica correctamente?
// ✓ ¿El IVA se calcula sobre el valor correcto?

// Regla: subtotal → aplicar descuento → aplicar IVA
const conDescuento = subtotal * (1 - descuento / 100)
const total = conDescuento * (1 + iva)
```

### Paso 3: Verificación de Edge Cases

```
Para cada función nueva, verifica:
├── Input vacío / null / undefined
├── Array vacío
├── Valor 0 (precio = 0, cantidad = 0)
├── Strings en campos numéricos
├── Valores negativos
└── Valores extremadamente grandes
```

### Paso 4: Verificación de Regresión

```
Cuando cambias una función existente, verifica que:
├── Los usos existentes siguen funcionando
├── No cambiaste la firma de la función sin actualizar todos los llamadores
├── Los datos guardados anteriormente siguen siendo compatibles
└── El estado de React se actualiza como se espera
```

### Paso 5: Verificación Visual (para UI)

```
Para cambios de UI en Electron:
├── ¿El componente se renderiza sin errores?
├── ¿Los datos se muestran correctamente?
├── ¿Los botones/inputs funcionan?
├── ¿Los estados de loading/error se muestran?
├── ¿El layout no se rompe con datos largos?
└── ¿Funciona con lista vacía?
```

## Checklist por Tipo de Cambio

### Feature Nueva

```
- [ ] Funciona el happy path principal
- [ ] Maneja inputs inválidos
- [ ] Muestra errores al usuario de forma clara
- [ ] No rompe funcionalidades existentes
- [ ] Los datos persisten correctamente (si aplica)
- [ ] El estado de la UI es correcto después de la acción
```

### Bug Fix

```
- [ ] El bug original está corregido
- [ ] La corrección no introduce nuevos bugs
- [ ] El caso que causó el bug está cubierto
- [ ] Casos similares también están corregidos (o documentados)
```

### Refactoring

```
- [ ] El comportamiento externo es idéntico
- [ ] Todos los usos de la función/componente siguen funcionando
- [ ] No hay cambios en los datos que se persisten
- [ ] El estado de React se comporta igual
```

## Verificación de IPC (Electron)

```javascript
// Cuando cambias IPC handlers, verifica:
// 1. El handler existe en main.js
ipcMain.handle('cotizacion:crear', ...)

// 2. El invoke en renderer usa el mismo canal
ipcRenderer.invoke('cotizacion:crear', data)

// 3. El formato de respuesta es consistente
// Main siempre debe devolver { success: boolean, data?: any, error?: string }

// 4. El renderer maneja tanto success como error
const result = await ipcRenderer.invoke('cotizacion:crear', data)
if (!result.success) {
  setError(result.error)
  return
}
// usar result.data
```

## Regla de Oro

> No declares una tarea como "completa" hasta haber ejecutado mentalmente el código con al menos 3 casos: el happy path, un input inválido, y un edge case. Si algo falla en cualquiera de los 3, corrige y repite.
