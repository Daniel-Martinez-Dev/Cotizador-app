import { defineConfig } from 'vitest/config'

// Las pruebas de las reglas de Firestore hablan con el emulador, no con el
// navegador: entorno node y sin los plugins de la app. Se lanzan con
// `npm run test:rules`, que levanta el emulador alrededor.
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.js'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
  },
})
