import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Using relative base ensures assets load when opened via file:// in Electron
export default defineConfig({
  base: './',
  plugins: [react()]
})