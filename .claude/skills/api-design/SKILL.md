---
name: api-design
description: REST API design patterns including resource naming, status codes, pagination, filtering, error responses, and versioning for production APIs.
origin: ECC
---

# API Design Patterns

Conventions and best practices for designing consistent, developer-friendly REST APIs.

## When to Activate

- Designing new API endpoints or IPC channels
- Reviewing existing API contracts
- Adding pagination, filtering, or sorting
- Implementing error handling for APIs
- Planning API versioning strategy

## Resource Design

### URL Structure

```
# Resources are nouns, plural, lowercase, kebab-case
GET    /api/v1/cotizaciones
GET    /api/v1/cotizaciones/:id
POST   /api/v1/cotizaciones
PUT    /api/v1/cotizaciones/:id
PATCH  /api/v1/cotizaciones/:id
DELETE /api/v1/cotizaciones/:id

# Sub-resources for relationships
GET    /api/v1/cotizaciones/:id/items
GET    /api/v1/clientes/:id/cotizaciones

# Actions that don't map to CRUD
POST   /api/v1/cotizaciones/:id/aprobar
POST   /api/v1/cotizaciones/:id/exportar-pdf
```

### Naming Rules

```
# GOOD
/api/v1/cotizaciones             # plural
/api/v1/items-cotizacion         # kebab-case
/api/v1/cotizaciones?estado=pendiente  # filtros via query params

# BAD
/api/v1/getCotizacion            # verb en URL
/api/v1/cotizacion               # singular
/api/v1/cotizaciones/123/getItems  # verb en sub-resource
```

## HTTP Status Codes

```
# Success
200 OK          — GET, PUT, PATCH (con body)
201 Created     — POST (incluir Location header)
204 No Content  — DELETE, PUT (sin body)

# Client Errors
400 Bad Request     — validación fallida, JSON malformado
401 Unauthorized    — falta autenticación
403 Forbidden       — autenticado pero sin permisos
404 Not Found       — recurso no existe
409 Conflict        — duplicado, conflicto de estado
422 Unprocessable   — JSON válido pero datos inválidos
429 Too Many Requests — rate limit

# Server Errors
500 Internal Server Error — fallo inesperado (no exponer detalles)
```

## Response Format

### Success Response

```json
{
  "data": {
    "id": "1234",
    "cliente": "Empresa ABC",
    "total": 1500.00,
    "estado": "pendiente",
    "fecha": "2026-04-28T10:30:00Z"
  }
}
```

### Collection Response (con Paginación)

```json
{
  "data": [
    { "id": "1234", "cliente": "Empresa ABC", "total": 1500.00 },
    { "id": "1235", "cliente": "Empresa XYZ", "total": 2300.00 }
  ],
  "meta": {
    "total": 142,
    "page": 1,
    "per_page": 20,
    "total_pages": 8
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "validation_error",
    "message": "La solicitud tiene errores de validación",
    "details": [
      {
        "field": "precio",
        "message": "Debe ser un número positivo",
        "code": "invalid_format"
      }
    ]
  }
}
```

## Pagination

### Offset-Based (Simple)

```
GET /api/v1/cotizaciones?page=2&per_page=20

# Implementación
items.slice((page - 1) * per_page, page * per_page)
```

### Filtering & Sorting

```
# Filtros simples
GET /api/v1/cotizaciones?estado=pendiente&cliente=ABC

# Sorting (- = descendente)
GET /api/v1/cotizaciones?sort=-fecha

# Múltiples campos
GET /api/v1/cotizaciones?sort=-fecha,cliente
```

## API Design Checklist

Antes de implementar un endpoint:

- [ ] URL sigue convenciones (plural, kebab-case, sin verbos)
- [ ] Método HTTP correcto (GET para lecturas, POST para creación)
- [ ] Códigos de estado apropiados
- [ ] Input validado con esquema
- [ ] Respuesta de error en formato estándar
- [ ] Paginación en endpoints de lista
- [ ] No se exponen detalles internos en errores
- [ ] Nomenclatura consistente con endpoints existentes
