---
name: token-optimization
description: Strategies to optimize token consumption, manage context window efficiently, and reduce costs in Claude Code sessions.
origin: ECC
---

# Token Optimization

Strategies for keeping sessions efficient and context lean.

## When to Activate

- Context window está cerca del límite
- Sesión lleva muchos turnos sin compactar
- Trabajando en archivos grandes
- Antes de agregar nuevos agentes o skills
- Revisando overhead de herramientas

## Principios de Optimización

### 1. Lecturas Quirúrgicas

```
# En vez de leer archivos completos:
- Usa Grep para buscar símbolos específicos
- Lee solo las líneas relevantes (offset + limit)
- Prefiere Glob para encontrar archivos antes de leer
```

### 2. Compactación Proactiva

Ejecuta `/compact` cuando:
- Llevas más de 20 mensajes en la sesión
- Has completado una feature o bug fix
- Antes de iniciar una tarea grande

### 3. Contexto Mínimo Necesario

```javascript
// BAD: Leer todo el archivo para cambiar una función
// GOOD: Grep la función -> Read solo esas líneas -> Edit

// BAD: Explorar todo el proyecto antes de empezar
// GOOD: Ir directo al archivo/componente relevante
```

### 4. Subagentes para Tareas Independientes

Delega a agentes especializados en vez de acumular contexto:
- Exploración de código → Explore agent
- Búsqueda en repo → Grep/Glob directo
- Preguntas sobre Claude Code → claude-code-guide agent

## Auditoría de Overhead

### Componentes que consumen tokens

| Componente | Costo estimado | Acción |
|------------|---------------|--------|
| Cada skill activo | ~200-800 tokens | Activar solo los necesarios |
| Cada archivo leído | Variable | Leer parcialmente |
| Historial de conversación | Crece linealmente | Compactar regularmente |
| Resultados de búsqueda largos | Alto | Limitar con head_limit |

### Señales de que el contexto es pesado

- Claude tarda más en responder
- Respuestas menos precisas o "olvida" instrucciones anteriores
- Más de 15,000 tokens en contexto activo

## Estrategias por Escenario

### Refactoring de archivos grandes

```
1. Grep para entender estructura general
2. Read solo las secciones a modificar
3. Edit quirúrgico (no Write completo)
4. Compact antes de pasar al siguiente archivo
```

### Feature compleja multi-archivo

```
1. Plan primero (usa /plan o diseña en texto)
2. Implementa archivo por archivo
3. Compact después de cada archivo completado
4. No leas archivos que no vas a modificar
```

### Debug de errores

```
1. Lee solo el stack trace / archivo del error
2. Grep para encontrar la función problemática
3. Read solo esas líneas
4. No explores el proyecto entero
```

## Reglas de Oro

- **No leas archivos que no vas a editar**
- **Compact después de completar cada tarea discreta**
- **Prefiere Grep sobre Read para búsquedas**
- **Usa head_limit en búsquedas que pueden devolver mucho**
- **Un subagente para exploración = contexto principal protegido**
