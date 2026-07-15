import React from "react";

// Diálogo de confirmación de marca, reutilizado por QuoteContext (confirm())
// y por cualquier modal de confirmación puntual (ver App.jsx).
export default function ConfirmDialog({
  title = "Confirmar acción",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}) {
  React.useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onCancel?.(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-600 rounded-lg p-5 animate-fade-in shadow-lg">
        <h2 id="confirm-dialog-title" className="text-base font-semibold mb-2 text-gray-900 dark:text-white">{title}</h2>
        {message && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-line">{message}</p>
        )}
        <div className="flex flex-col sm:flex-row justify-end gap-3 text-sm">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-gray-100 dark:bg-gris-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gris-600"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={`px-3 py-1.5 rounded text-white shadow focus:outline-none focus:ring-2 focus:ring-trafico/60 ${
              danger ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
