# Seguridad e Inyección de Código

## Problemas identificados y soluciones

### 1. Firebase API Keys Expuestas en GitHub ✅
**Problema:** Las llaves de Firebase estaban hard-coded en `src/firebase.js`.
**Solución:** Movidas a variables de entorno Vite (`VITE_FIREBASE_*`).
- Crea `.env` desde `.env.example` con tus llaves reales.
- `.env` está en `.gitignore` para evitar commits accidentales.
- En producción, configura estas variables en tu hosting (Vercel, Netlify, etc).

### 2. Inyección de HTML/JavaScript en Cotizaciones ✅
**Problema:** `dangerouslySetInnerHTML` en PreviewPage permite XSS si alguien edita secciones con scripts maliciosos.
**Solución:**
- Instalado `dompurify` para sanitizar HTML antes de renderizar.
- `sanitizeHtml()` limpia etiquetas y atributos peligrosos (scripts, iframes, event handlers).
- Se aplica al guardar ediciones y antes de generar PDF.

### 3. Firestore sin Reglas de Seguridad ✅
**Problema:** Base de datos completamente abierta (acceso anónimo).
**Solución:**
- Creado `firestore.rules` con restricción básica: solo usuarios autenticados no-anónimos pueden leer/escribir.
- Publica estas reglas desde Firebase Console antes de desplegar.

### 4. Data Sanitization en Inputs
**Problema:** Datos de usuario (NIT, nombres, etc.) pueden contener caracteres especiales/control.
**Solución existente:**
- `sanitizeNIT()`, `sanitizeText()`, `sanitizePhone()` ya limpian en `firebaseCompanies.js`, `firebaseInventory.js`, etc.

## Checklist de Seguridad

- [ ] Copia `.env.example` → `.env` con tus llaves Firebase reales
- [ ] Verifica `.gitignore` contiene `.env` (protege desde repo local)
- [ ] Publica `firestore.rules` en Firebase Console
- [ ] Activa Google Sign-In en Firebase (si usas login real)
- [ ] Configura env vars en hosting antes de desplegar
- [ ] Revisa variables VITE_REQUIRE_LOGIN, VITE_BOOTSTRAP_ADMIN_EMAIL si requiere login
- [ ] No commits con llaves hardcoded

## Próximas mejoras (opcionales)

1. **Rate Limiting:** Implementar en Cloud Functions para limitar write/reads por usuario.
2. **Validación por Backend:** Ciertas operaciones críticas podrían validarse en Cloud Functions.
3. **Auditoría:** Logs de cambios importantes en Firestore/Storage.
4. **HTTPS + CORS:** Asegurar requests al dominio oficial solo.
5. **2FA:** Para usuarios admin críticos.
