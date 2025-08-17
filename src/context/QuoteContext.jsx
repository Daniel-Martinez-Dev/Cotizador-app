// src/context/QuoteContext.jsx

import { createContext, useContext, useState, useCallback } from "react";

const QuoteContext = createContext();

export function useQuote() {
  return useContext(QuoteContext);
}

export function QuoteProvider({ children }) {
  const [quoteData, setQuoteData] = useState({});
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null); // backward compat (single)
  const [imagenesSeleccionadas, setImagenesSeleccionadas] = useState([]); // nuevas múltiples
  // Nuevo modelo empresas/contactos
  const [empresas, setEmpresas] = useState([]); // cache empresas
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
  const [contactoSeleccionado, setContactoSeleccionado] = useState(null);
  const [matricesOverride, setMatricesOverride] = useState({}); // matrices modificadas desde panel
  const [extrasOverride, setExtrasOverride] = useState({}); // extras modificados
  const [resetToken, setResetToken] = useState(null); // dispara reinicio del formulario

  const [confirmState, setConfirmState] = useState(null); // {message, resolve}

  const confirm = useCallback((message)=> new Promise(resolve=>{
    setConfirmState({ message, resolve });
  }), []);

  const handleConfirm = (val)=>{
    if(confirmState){ confirmState.resolve(val); setConfirmState(null); }
  };

  return (
    <QuoteContext.Provider value={{
      quoteData, setQuoteData,
      imagenSeleccionada, setImagenSeleccionada,
      imagenesSeleccionadas, setImagenesSeleccionadas,
  empresas, setEmpresas,
  empresaSeleccionada, setEmpresaSeleccionada,
  contactoSeleccionado, setContactoSeleccionado,
      matricesOverride, setMatricesOverride,
      extrasOverride, setExtrasOverride,
      resetToken, setResetToken,
      confirm
    }}>
      {children}
      {confirmState && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>handleConfirm(false)} />
          <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-600 rounded-lg p-5 animate-fade-in shadow-lg">
            <h2 className="text-base font-semibold mb-2 text-gray-900 dark:text-white">Confirmar acción</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-line">{confirmState.message}</p>
            <div className="flex justify-end gap-3 text-sm">
              <button onClick={()=>handleConfirm(false)} className="px-3 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-gray-100 dark:bg-gris-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gris-600">Cancelar</button>
              <button onClick={()=>handleConfirm(true)} className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-white shadow focus:outline-none focus:ring-2 focus:ring-trafico/60">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </QuoteContext.Provider>
  );
}
