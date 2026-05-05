# Configuración de Variables de Entorno

## 🚀 Pasos Rápidos

### 1. Copia el archivo de plantilla
```bash
cp .env.example .env
```

### 2. Obtén tus credenciales de Firebase Console
- Ve a [Firebase Console](https://console.firebase.google.com)
- Selecciona tu proyecto "cotizadorccs-38398"
- Ve a **Configuración del Proyecto** (engranaje arriba a la izquierda)
- En la pestaña **General**, desplázate hasta "Tus apps"
- Busca tu app web y haz clic en el icono `</>`
- Verás un código como este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBFIrsU54TWKOXZCLAn5eUyAib3McHhBeY",        ← Copia esto
  authDomain: "cotizadorccs-38398.firebaseapp.com",         ← Y esto
  projectId: "cotizadorccs-38398",                          ← Y esto
  storageBucket: "cotizadorccs-38398.firebasestorage.app",  ← Etc...
  messagingSenderId: "635864265146",
  appId: "1:635864265146:web:81160bb537d67792f06d83",
  measurementId: "G-LSJQ1Q47ZV"
};
```

### 3. Rellena tu `.env` local
Abre `.env` (que acabas de crear) y completa así:

```env
# Firebase (client config)
VITE_FIREBASE_API_KEY=AIzaSyBFIrsU54TWKOXZCLAn5eUyAib3McHhBeY
VITE_FIREBASE_AUTH_DOMAIN=cotizadorccs-38398.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cotizadorccs-38398
VITE_FIREBASE_STORAGE_BUCKET=cotizadorccs-38398.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=635864265146
VITE_FIREBASE_APP_ID=1:635864265146:web:81160bb537d67792f06d83
VITE_FIREBASE_MEASUREMENT_ID=G-LSJQ1Q47ZV

# Auth / feature flags (deja así por defecto)
VITE_REQUIRE_LOGIN=false
VITE_ANON_AUTH=true
VITE_BOOTSTRAP_ADMIN_EMAIL=
VITE_ENABLE_PRODUCCION=true
VITE_ENABLE_INVENTARIO=true
```

### 4. Reinicia tu servidor Vite
```bash
npm run dev
```

El error desaparecerá una vez tengas `.env` completo.

---

## ⚠️ Seguridad Importante

✅ `.env` está en `.gitignore` (no será commitado)
✅ `.env.example` no tiene valores (está en Git como referencia)
✅ Nunca compartas tu `.env` con nadie

---

## 📝 Para Otros Desarrolladores

Si alguien más clona el repo:
```bash
git clone ...
cp .env.example .env    # ← El archivo .env estará vacío
# Luego rellena los valores de Firebase como se muestra arriba
npm install
npm run dev
```
