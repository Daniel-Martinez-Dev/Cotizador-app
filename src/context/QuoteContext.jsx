// src/context/QuoteContext.jsx

import { createContext, useContext, useState } from "react";

const QuoteContext = createContext();

export function useQuote() {
  return useContext(QuoteContext);
}

export function QuoteProvider({ children }) {
  const [quoteData, setQuoteData] = useState({});
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null); // backward compat (single)
  const [imagenesSeleccionadas, setImagenesSeleccionadas] = useState([]); // nuevas múltiples
  const [clientes, setClientes] = useState([]); // listado cacheado
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null); // objeto cliente activo
  const [matricesOverride, setMatricesOverride] = useState({}); // matrices modificadas desde panel
  const [extrasOverride, setExtrasOverride] = useState({}); // extras modificados

  return (
    <QuoteContext.Provider
      value={{
        quoteData,
        setQuoteData,
  imagenSeleccionada,
  setImagenSeleccionada,
  imagenesSeleccionadas,
  setImagenesSeleccionadas,
  clientes,
  setClientes,
  clienteSeleccionado,
  setClienteSeleccionado,
  matricesOverride,
  setMatricesOverride,
  extrasOverride,
  setExtrasOverride
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
}
