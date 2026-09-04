import React from "react";
import { claveFicha } from "./loteFichas";

// Selección múltiple de órdenes sobre una lista ya filtrada.
//
// `modo` es el interruptor de "estoy escogiendo": en el celular las tarjetas
// son enlaces al detalle, así que hasta que no se entra en modo selección un
// toque abre la orden, como siempre. En el escritorio no hace falta y se puede
// dejar encendido.
export default function useSeleccionFichas(visibles, { modoInicial = false } = {}) {
  const [claves, setClaves] = React.useState(() => new Set());
  const [modo, setModo] = React.useState(modoInicial);

  // Una ficha que dejó de estar en la lista —cambió el filtro, o pasó a otro
  // estado tras firmarla— no puede seguir seleccionada: el lote actuaría sobre
  // algo que ya no se ve.
  React.useEffect(() => {
    setClaves((prev) => {
      if (prev.size === 0) return prev;
      const vivas = new Set(visibles.map(claveFicha));
      const siguiente = new Set([...prev].filter((k) => vivas.has(k)));
      return siguiente.size === prev.size ? prev : siguiente;
    });
  }, [visibles]);

  const alternar = React.useCallback((ficha) => {
    setClaves((prev) => {
      const clave = claveFicha(ficha);
      const siguiente = new Set(prev);
      if (siguiente.has(clave)) siguiente.delete(clave);
      else siguiente.add(clave);
      return siguiente;
    });
  }, []);

  // Marcar de una vez todas las fichas de una orden de compra. Es todo o nada
  // a propósito: media orden marcada es la forma de despachar media orden.
  const alternarVarias = React.useCallback((fichas) => {
    const lista = fichas || [];
    if (lista.length === 0) return;
    setClaves((prev) => {
      const llaves = lista.map(claveFicha);
      const siguiente = new Set(prev);
      if (llaves.every((k) => prev.has(k))) llaves.forEach((k) => siguiente.delete(k));
      else llaves.forEach((k) => siguiente.add(k));
      return siguiente;
    });
  }, []);

  const limpiar = React.useCallback(() => setClaves(new Set()), []);

  const todas = React.useCallback(() => {
    setClaves(new Set(visibles.map(claveFicha)));
  }, [visibles]);

  const seleccionadas = React.useMemo(
    () => visibles.filter((f) => claves.has(claveFicha(f))),
    [visibles, claves]
  );

  const estaSeleccionada = React.useCallback(
    (ficha) => claves.has(claveFicha(ficha)),
    [claves]
  );

  // Salir del modo selección vacía lo escogido: dejar marcas invisibles sería
  // la forma de firmar sin querer una orden que ya no se ve marcada.
  const cambiarModo = React.useCallback((valor) => {
    setModo(valor);
    if (!valor) setClaves(new Set());
  }, []);

  // Un grupo cuenta como seleccionado solo cuando lo están todas sus fichas.
  const estanSeleccionadas = React.useCallback(
    (fichas) => (fichas || []).length > 0 && fichas.every((f) => claves.has(claveFicha(f))),
    [claves]
  );

  return {
    modo, setModo: cambiarModo, seleccionadas, estaSeleccionada, estanSeleccionadas,
    alternar, alternarVarias, limpiar, todas,
  };
}
