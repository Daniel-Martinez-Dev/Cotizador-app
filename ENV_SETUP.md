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
  apiKey: "AIza...",                    ← Copia esto
  authDomain: "....firebaseapp.com",    ← Y esto
  projectId: "...",                     ← Y esto
  storageBucket: "....firebasestorage.app",
  messagingSenderId: "...",
  appId: "1:...:web:...",
  measurementId: "G-..."
};
```

Los valores reales se copian de la consola, no de este documento: aquí no se
escriben para que el repositorio no los cargue.

### 3. Rellena tu `.env` local
Abre `.env` (que acabas de crear) y completa así:

```env
# Firebase (client config) — pega aquí los valores de tu consola
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Auth — así va la app interna: login obligatorio y sin sesiones anónimas.
# Solo el cotizador público se compila al revés, y para eso está el script
# "build:public", que pone los flags él mismo. No los cambies a mano aquí.
VITE_REQUIRE_LOGIN=true
VITE_ANON_AUTH=false
VITE_BOOTSTRAP_ADMIN_EMAIL=
VITE_ADMIN_EMAIL=
VITE_ENABLE_PRODUCCION=true
VITE_ENABLE_INVENTARIO=true

# Cloudinary — sin esto no se pueden subir imágenes (fotos de producto, foto de
# perfil y registro fotográfico de las fichas). El preset debe ser "unsigned";
# el API Secret de Cloudinary NUNCA va aquí.
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
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
✅ El API Secret de Cloudinary no se usa en la app y no debe estar en el `.env`

Sobre la llave de Firebase: no es un secreto. Identifica el proyecto y viaja en
el JavaScript de cualquier app web de Firebase, así que quien abra la app puede
leerla. Lo que protege los datos son las reglas de Firestore y el login
obligatorio, no ocultarla. Aun así no se escribe en el repositorio, y conviene
restringirla por dominio desde Google Cloud Console (APIs y servicios →
Credenciales → restricción por referente HTTP).

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
