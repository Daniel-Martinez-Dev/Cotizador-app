import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const MANIFEST_URL = 'https://cotizadorccs-38398.web.app/updates/latest.json';

export async function checkForUpdate() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) return;

    const { version, url } = await res.json();
    if (!version || !url) return;

    const { bundle } = await CapacitorUpdater.current();
    if (bundle.version === version) return;

    console.log(`[OTA] Descargando versión ${version}...`);
    const newBundle = await CapacitorUpdater.download({ url, version });
    await CapacitorUpdater.set(newBundle);
    // La app se reinicia automáticamente con la nueva versión
  } catch (e) {
    console.error('[OTA] Error en actualización:', e);
  }
}
