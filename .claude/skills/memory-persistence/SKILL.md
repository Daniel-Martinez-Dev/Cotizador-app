---
name: memory-persistence
description: Strategies for maintaining context, knowledge, and decisions across Claude Code sessions using the memory system.
origin: ECC
---

# Memory Persistence

Guía para mantener contexto relevante entre sesiones de Claude Code.

## When to Activate

- Iniciando una nueva sesión después de trabajo previo
- Aprendiste algo importante sobre el proyecto o el usuario
- Se tomó una decisión de arquitectura relevante
- El usuario corrigió un comportamiento que no debes repetir
- Completaste una fase importante del proyecto

## Tipos de Memoria

### 1. User Memory — Quién es el usuario

Guarda cuando aprendes sobre el rol, preferencias o nivel del usuario:

```
Ejemplos a guardar:
- "El usuario prefiere español en todos los mensajes"
- "El usuario es el dueño del negocio, no un desarrollador"
- "Al usuario le molesta el uso excesivo de emojis"
- "El usuario prefiere respuestas cortas y directas"
```

### 2. Feedback Memory — Cómo trabajar

Guarda correcciones Y validaciones:

```
Correcciones (guardar siempre):
- "No uses TypeScript — este proyecto es JavaScript puro"
- "No crees archivos README.md sin que lo pidan"
- "Los botones deben decir 'Guardar' no 'Save'"

Validaciones (también guardar):
- "El usuario aprobó el patrón Context + Reducer para state management"
- "Al usuario le gustó la estructura de carpetas propuesta"
```

### 3. Project Memory — Estado del proyecto

```
Ejemplos a guardar:
- "El módulo de inventario está en desarrollo activo"
- "Se decidió usar JSON file como DB (no SQLite) por simplicidad"
- "La versión actual es Electron 28 + React 18 + Vite"
- "Se congela el merge de features después del 2026-05-01"
```

## Cuándo Guardar

```
Guarda INMEDIATAMENTE cuando:
✓ El usuario corrige algo que hiciste
✓ El usuario confirma un enfoque no obvio
✓ Aprendes datos técnicos del stack actual
✓ Se toma una decisión de diseño importante
✓ El usuario menciona preferencias explícitas

NO guardes:
✗ Patrones de código (están en el código)
✗ Historia de commits (está en git)
✗ Trabajo en progreso de la sesión actual
✗ Lo que ya está documentado en CLAUDE.md
```

## Cómo Recuperar Memoria

Al inicio de sesión, si la tarea es relevante:
1. Lee `~/.claude/projects/[project]/memory/MEMORY.md`
2. Lee los archivos específicos relevantes para la tarea
3. Verifica que la memoria sigue siendo válida (el código puede haber cambiado)

## Estructura de Archivos de Memoria

```markdown
---
name: preferencias-usuario
description: Preferencias de trabajo y comunicación del usuario del Cotizador
type: user
---

El usuario es el dueño de una empresa de servicios y usa el cotizador
para su negocio diario. No es desarrollador. Prefiere:
- Mensajes en español siempre
- Explicaciones simples sin jerga técnica
- Respuestas cortas y directas
```

## Reglas de Oro

- **Actúa sobre la memoria, no solo la guardes** — úsala en futuras sesiones
- **Verifica antes de recomendar** — el código puede haber cambiado desde que guardaste
- **Actualiza memorias obsoletas** — mejor borrar que dejar información incorrecta
- **Guarda el "por qué"**, no solo el "qué" — el contexto importa para casos edge
