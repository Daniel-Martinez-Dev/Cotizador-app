// src/context/QuoteContext.jsx

import { createContext, useContext, useState } from "react";

const QuoteContext = createContext();

export function useQuote() {
  return useContext(QuoteContext);
}

export function QuoteProvider({ children }) {
  const [quoteData, setQuoteData] = useState({});
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null); // ✅ nueva línea

  return (
    <QuoteContext.Provider
      value={{
        quoteData,
        setQuoteData,
        imagenSeleccionada,        // ✅ nueva línea
        setImagenSeleccionada      // ✅ nueva línea
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
}
