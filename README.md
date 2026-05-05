# Cotizador App

Aplicación web para generación de cotizaciones personalizadas con lógica por tipo de producto y cliente.

## Instalación

```bash
npm install
npm run dev

```

## Variables de entorno

Copia el archivo `.env.example` a `.env` y completa los valores de Firebase y flags.

## Reglas de Firestore

El archivo `firestore.rules` incluye una base restrictiva (solo usuarios autenticados no anónimos). Publica estas reglas en Firebase desde la consola o CLI antes de desplegar.
