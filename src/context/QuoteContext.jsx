// src/context/QuoteContext.jsx

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { cargarProductos } from '../utils/firebaseProductos';
import { useAuth } from './AuthContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const QuoteContext = createContext();

export function useQuote() {
  return useContext(QuoteContext);
}

export function QuoteProvider({ children }) {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [quoteData, setQuoteData] = useState({});
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null); // backward compat (single)
  const [imagenesSeleccionadas, setImagenesSeleccionadas] = useState([]); // nuevas múltiples
  // Nuevo modelo empresas/contactos
  const [empresas, setEmpresas] = useState([]); // cache empresas
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
  const [contactoSeleccionado, setContactoSeleccionado] = useState(null);
  const [matricesOverride, setMatricesOverride] = useState({}); // matrices modificadas desde panel
  const [extrasOverride, setExtrasOverride] = useState({}); // extras modificados
  const [productosOverride, setProductosOverride] = useState({}); // doc completo por etiqueta
  const [resetToken, setResetToken] = useState(null); // dispara reinicio del formulario

  const [productosDB, setProductosDB] = useState([]); // catálogo desde Firestore
  const [productosLoading, setProductosLoading] = useState(true);

  // Carga productos desde Firestore y puebla los overrides de precios/extras
  const recargarProductos = useCallback(async () => {
    setProductosLoading(true);
    try {
      const lista = await cargarProductos();
      if (lista) {
        setProductosDB(lista);
        // Poblar matricesOverride con datos de Firestore
        const mOverride = {};
        const eOverride = {};
        const pOverride = {};
        lista.forEach(p => {
          if (!p.etiqueta) return;
          if (p.matriz) mOverride[p.etiqueta] = p.matriz;
          if (p.extras?.length > 0) eOverride[p.etiqueta] = p.extras;
          pOverride[p.etiqueta] = p; // doc completo para precios especiales
        });
        setMatricesOverride(mOverride);
        setExtrasOverride(eOverride);
        setProductosOverride(pOverride);
      }
    } catch (e) {
      console.error('Error cargando catálogo de productos:', e);
    } finally {
      setProductosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isLoggedIn) recargarProductos();
  }, [authLoading, isLoggedIn, recargarProductos]);

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
      productosOverride,
      resetToken, setResetToken,
      productosDB, productosLoading, recargarProductos,
      confirm
    }}>
      {children}
      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          onCancel={() => handleConfirm(false)}
          onConfirm={() => handleConfirm(true)}
        />
      )}
    </QuoteContext.Provider>
  );
}
