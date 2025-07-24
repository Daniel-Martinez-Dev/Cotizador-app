# 📁 Estructura del Proyecto Cotizador App

_Este archivo documenta la estructura base del proyecto al momento de implementación del guardado en Firebase y generación de PDFs._

---

## 🗂 src

```
📁 src
├── 📁 components
│   └── Preview.jsx
├── 📁 context
│   └── QuoteContext.jsx
├── 📁 data
│   └── precios.js
├── 📁 pages
│   ├── HistorialPage.jsx
│   └── PreviewPage.jsx
├── 📁 utils
│   ├── firebaseQuotes.js          ← Guarda cotización en Firebase
│   ├── pdf.js                     ← Genera el PDF y guarda la cotización
│   ├── quoteNumber.js            ← Generador local de número de cotización
│   └── quoteNumberFirebase.js    ← Generador desde Firebase (consecutivo)
├── App.jsx
├── firebase.js                   ← Configuración de Firebase
├── index.css
├── main.jsx
├── Router.jsx                    ← Archivo donde defines las rutas
```

---

## ✅ Buenas prácticas aplicadas

- Separación clara por responsabilidades (`components`, `context`, `pages`, `utils`)
- Firebase y lógica encapsulada por módulo
- Rutas centralizadas en `Router.jsx`
- Toasts para feedback de usuario
- Preparado para escalar a nuevas funciones como autenticación, historial, exportaciones, etc.

---

_Última actualización: julio 2025_