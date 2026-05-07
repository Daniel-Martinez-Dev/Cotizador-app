// Feature flags controlled via Vite env vars.
// Convention: default true unless explicitly set to "false".

function envTrue(name, defaultValue = true) {
  const raw = import.meta.env?.[name];
  if (raw == null) return defaultValue;
  return String(raw).toLowerCase() !== "false";
}

export const REQUIRE_LOGIN = envTrue("VITE_REQUIRE_LOGIN", true);
export const ENABLE_PRODUCCION = envTrue("VITE_ENABLE_PRODUCCION", true);
export const ENABLE_INVENTARIO = envTrue("VITE_ENABLE_INVENTARIO", true);

/** Email del administrador con acceso total (incluyendo /produccion). */
export const ADMIN_EMAIL = (import.meta.env?.VITE_ADMIN_EMAIL ?? "").trim().toLowerCase();
