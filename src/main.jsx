import { Buffer } from 'buffer';
if (!globalThis.Buffer) globalThis.Buffer = Buffer;

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { cargarImagenesBase64 } from "./data/imagenesPorProducto";
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { checkForUpdate } from './utils/otaUpdater';

if (Capacitor.isNativePlatform()) {
  CapacitorUpdater.notifyAppReady();
}

cargarImagenesBase64().then(() => {
  checkForUpdate().catch(() => {});

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
