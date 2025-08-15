// src/context/QuoteContext.jsx

import { createContext, useContext, useState } from "react";

const QuoteContext = createContext();

export function useQuote() {
  return useContext(QuoteContext);
}

export function QuoteProvider({ children }) {
  const [quoteData, setQuoteData] = useState({});
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [clientes, setClientes] = useState([]); // listado cacheado
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null); // objeto cliente activo

  return (
    <QuoteContext.Provider
      value={{
        quoteData,
        setQuoteData,
  imagenSeleccionada,
  setImagenSeleccionada,
  clientes,
  setClientes,
  clienteSeleccionado,
  setClienteSeleccionado
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
}
