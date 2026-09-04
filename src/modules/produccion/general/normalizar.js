import { UNIDAD_POR_DEFECTO } from "./catalogos";
import { camposClienteFicha } from "../../../utils/clienteVinculo";
import { camposCotizacionFicha } from "../../../utils/documentoVinculo";

// Normalización de la ficha básica. Es el equivalente al `calcular.js` de las
// demás líneas: aquí no hay medidas que derivar, pero sí una lista de ítems que
// hay que limpiar antes de guardar (filas vacías del formulario, cantidades que
// llegan como texto, unidades sin normalizar).

const toIso = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

// Los ítems sin descripción son filas en blanco del formulario: se descartan.
export function normalizarItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((it) => ({
      descripcion:   (it?.descripcion || "").trim(),
      categoria:     (it?.categoria || "").trim().toUpperCase(),
      referencia:    (it?.referencia || "").trim(),
      cantidad:      Number(it?.cantidad) || 0,
      unidad:        (it?.unidad || UNIDAD_POR_DEFECTO).trim().toUpperCase(),
      observaciones: (it?.observaciones || "").trim(),
    }))
    .filter((it) => it.descripcion);
}

export function totalUnidades(items) {
  return normalizarItems(items).reduce((sum, it) => sum + it.cantidad, 0);
}

// Categorías presentes en la orden, sin repetir. Se guardan en el documento
// para poder filtrar por ellas sin recorrer los ítems de cada ficha.
export function categoriasDe(items) {
  return [...new Set(normalizarItems(items).map((it) => it.categoria).filter(Boolean))];
}

// Payload compartido por crear/actualizar, para que una ficha editada quede
// exactamente con la misma forma que una recién creada.
export function construirFichaGeneral(input = {}) {
  const items = normalizarItems(input.items);
  return {
    numeroOrdenCompra: (input.numeroOrdenCompra || "").trim(),
    // Detalle libre de la ficha ("Zona 3", "Muelle 7"): lo que distingue dos
    // fichas iguales del mismo pedido. Ver fichas/IdentificacionFicha.
    nombreFicha:       (input.nombreFicha || "").trim(),
    // Cliente: nombre + vínculo a `empresas/{id}` (la misma base del
    // cotizador). Ver utils/clienteVinculo.js.
    ...camposClienteFicha(input),
    // Cotización de la que salió el pedido, cuando la hay. Opcional: la ficha
    // se guarda igual sin ella. Ver utils/documentoVinculo.js.
    ...camposCotizacionFicha(input),
    responsable:       (input.responsable || "").trim(),
    fechaOrden:        toIso(input.fechaOrden),
    fechaEntrega:      toIso(input.fechaEntrega),
    items,
    categorias:        categoriasDe(items),
    cantidad:          totalUnidades(items),
    observaciones:     (input.observaciones || "").trim(),
  };
}
