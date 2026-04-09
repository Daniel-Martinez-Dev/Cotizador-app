# AI Coding Agent Guide for Cotizador App

This project is a React + Vite web app with optional Electron desktop packaging. It generates PDF quotes and persists data in Firebase Firestore. Routing uses `HashRouter` due to Electron. Images for product previews/PDF are preloaded as base64.

## Dev Workflows
- Web dev: `npm install` then `npm run dev` (Vite).
- Desktop dev: `npm run dev:desktop` (Vite on 5174 + Electron waiting via `wait-on`).
- Preview build: `npm run preview`.
- Web build: `npm run build`.
- Electron run after build: `npm run electron:prod`.
- Windows installer: `npm run build:desktop` (electron-builder).

## Architecture & Data Flow
- Context: `QuoteProvider` in `src/context/QuoteContext.jsx` holds `quoteData`, company/contact selections, pricing overrides, and a `confirm()` helper.
- Quoting: `src/pages/CotizadorApp.jsx` builds products, computes item prices + extras, and sets `quoteData`. It then navigates to preview.
- Preview/PDF: `src/pages/PreviewPage.jsx` derives HTML sections via `src/utils/htmlSections.js`, lets users edit them, selects images, and calls `generarPDFReact()`.
- Persistence: `generarPDFReact()` saves new quotes to Firestore (`src/utils/firebaseQuotes.js`) and obtains sequence numbers via `src/utils/quoteNumberFirebase.js`.
- Desktop: `electron/main.js` loads `/#/` in dev and `dist/index.html` in prod; `preload.js` exposes `appInfo.env`.

## Pricing & Products
- Catalog: `src/data/catalogoProductos.js` centralizes product definitions: `tipoCalculo`, `requiereMedidas`, `extrasKey`, `descripcionGeneral`, `especificacionesHTML`, `lineaTabla`, optional `getPrecioBase()`.
- Matrices & factors: `src/data/precios.js` holds `priceMatrices`, `matrizPanamericana`, `CLIENTE_FACTORES`, and default `EXTRAS_POR_DEFECTO`/`EXTRAS_UNIVERSALES`.
- Item pricing: use `getPrecioProducto(producto, { matricesOverride })` for base and adjusted prices. Rounding uses 5,000 steps; adjustments via `ajusteTipo` + `ajusteValor`. Avoid duplicating logic.
- Extras: use `getExtrasPorTipo(etiqueta, extrasOverride)`. Per-item extras have quantity in `extrasCantidades`; personalized extras live in `extrasPersonalizados` + `extrasPersonalizadosCant`.
- Special cases: Thermofilm auto-adds MAX BULLET rows in `generarSeccionesHTML()`; Sello de Andén uses component pricing; Panamericana matrix for Divisiones Térmicas.

## Firebase Conventions
- Config: `src/firebase.js` initializes app, Firestore, and anonymous auth; always `await waitForAuth()` before reads/writes; handle `getAuthError()` for missing anonymous auth.
- Collections: `empresas` with `contactos` subcollection; `cotizaciones`; config docs in `config_matrices/global` and `config_extras/global`; quote counter in `consecutivos/cotizacion`.
- NIT handling: sanitize with `sanitizeNIT()` pattern in `src/utils/firebaseCompanies.js` (strip quotes/spaces). Prefer helpers in that module for CRUD.
- Quote save: `guardarCotizacionEnFirebase()` strips any stale `numero` from payload; numbers come from `getNextQuoteNumber()` transactions.

## PDF Generation
- Engine: `@react-pdf/renderer` in `src/utils/pdfReact.jsx`, with layout and theme from `src/utils/pdfTheme.js`.
- HTML → PDF: `src/utils/htmlSections.js` generates `descripcionHTML`, `especificacionesHTML`, `tablaHTML`, `condicionesHTML`, `terminosHTML`. Parsing/formatting via `src/utils/htmlToReactPDFParser.jsx`.
- Images: select a principal and up to 2 extras; images are optimized with `src/utils/pdfImageCompression.js` before embedding.
- Filename: `CT#<numero>_<Producto>_<Empresa>_<dd-mm-aaaa>.pdf`.

## UI & Routing
- Tailwind with dark mode `class` (`tailwind.config.js`); theme toggle persisted in `localStorage` in `App.jsx`.
- Routing is `HashRouter`; Electron forces `/#/` in dev and `hash: '/'` for prod.

## Overrides & Admin
- Pricing overrides UI: `src/pages/ProductsPage.jsx` loads/saves matrices/extras via `src/utils/pricingConfigFirebase.js`. Use `guardarMatricesConfig()` / `guardarExtrasConfig()` to persist.
- Companies/Contacts admin: `src/pages/CompaniesPage.jsx` manages `empresas` and `contactos` with CRUD helpers.
- History: `src/pages/HistorialPage.jsx` lists quotes, filters, updates follow-up status and notes.

## Practical Examples
- Adding a product: extend `PRODUCT_CATALOG` with `tipoCalculo` and `especificacionesHTML`, update `priceMatrices`/`EXTRAS_POR_DEFECTO` as needed.
- Computing a price: call `getPrecioProducto(prod, { matricesOverride })` and compute extras subtotal with `getExtrasPorTipo()`; keep rounding and adjustments consistent.
- Persisting quotes: call `generarPDFReact(cotizacion, estaEditando)`; it handles saving, numbering, image optimization, and download.

Keep changes minimal and aligned with these modules; avoid bypassing helpers for pricing, Firestore, or PDF. Ask if any area is unclear (e.g., new product types, matrix formats, or Firestore rules).