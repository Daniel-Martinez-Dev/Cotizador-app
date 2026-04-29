---
name: continuous-learning
description: Automatically extract reusable patterns from Claude Code sessions and save them as learned skills or memories for future use.
origin: ECC
---

# Continuous Learning

Extrae patrones reutilizables de las sesiones de trabajo y los convierte en conocimiento persistente.

## When to Activate

- Al finalizar una sesión de trabajo productiva
- Cuando resolviste un problema no obvio
- Cuando el usuario corrigió tu enfoque de forma significativa
- Cuando encontraste una solución elegante a un patrón recurrente
- Al completar una feature compleja

## Cómo Funciona

Al final de cada sesión evalúa:

```
1. ¿Hubo correcciones del usuario? → feedback memory
2. ¿Se tomaron decisiones de arquitectura? → project memory
3. ¿Se resolvió un problema complejo con una técnica específica? → learned pattern
4. ¿Se encontró un workaround para una limitación? → feedback memory
5. ¿Se estableció una convención nueva? → coding-standards update
```

## Patrones a Detectar

### Resolución de Errores

```
Si resolviste un error específico de Electron/Vite/React
→ Documenta la causa y la solución en memory
```

### Correcciones del Usuario

```
Si el usuario dijo:
- "No, hazlo así..." → feedback memory
- "Eso está mal porque..." → feedback memory con el "por qué"
- "Perfecto, así está bien" (después de un enfoque no obvio) → feedback memory positivo
```

### Patrones del Proyecto

```
Si descubriste:
- Una convención que se usa en el codebase
- Una estructura de datos recurrente
- Un componente que se reutiliza de cierta manera
→ coding-standards memory o project memory
```

### Workarounds Específicos

```
Si encontraste:
- Un bug de Electron que requiere un fix específico
- Una incompatibilidad entre librerías
- Un comportamiento inesperado del sistema
→ feedback memory con contexto del bug
```

## Evaluación de Sesión

Al final de una sesión de 10+ mensajes, pregúntate:

```
¿Qué aprendí que no sabía al inicio?
├── Sobre el usuario/proyecto → project o user memory
├── Sobre el código/arquitectura → project memory  
├── Sobre qué NO hacer → feedback memory
└── Sobre qué SÍ funciona bien → feedback memory positivo

¿Hay algo que olvidaré en la próxima sesión?
└── Si sí → guárdalo en memoria
```

## Umbrales de Extracción

| Patrón | Extraer cuando... |
|--------|-------------------|
| Corrección del usuario | Siempre |
| Decisión de arquitectura | Siempre |
| Solución a error recurrente | Si apareció 2+ veces |
| Convención de código | Si aplica a múltiples archivos |
| Workaround de librería | Si puede reaparecer |
| Preferencia del usuario | Si no estaba documentada |

## Comandos Relacionados

- Guarda patterns con la herramienta Write en `~/.claude/projects/[project]/memory/`
- Actualiza `MEMORY.md` con un pointer al nuevo archivo
- Para patterns globales, guarda en `~/.claude/projects/[global]/memory/` si existe

## Regla de Oro

> Solo guarda lo que sería **sorprendente u no obvio** para ti en la próxima sesión. Si puedes derivarlo leyendo el código o git log, no lo guardes.
