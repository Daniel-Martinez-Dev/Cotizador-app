// Selección de varias órdenes para firmarlas y cerrarlas de una vez.
//
// Un mismo pedido casi nunca es una sola ficha: son la puerta, el sello y el
// abrigo del mismo andén, cada uno con su orden de producción. Alistarlos es un
// solo acto y se entregan en el mismo camión, así que firmar uno por uno
// obligaba a escribir tres veces la misma gente, la misma fecha, las mismas
// placas y a subir tres veces las mismas fotos.
//
// La clave lleva el tipo por delante porque la lista mezcla las seis
// colecciones: dos fichas de productos distintos podrían compartir id.

export const claveFicha = (f) => `${f?.tipo || ""}:${f?.id}`;

// Vuelca en memoria lo que devolvió el lote, para que la lista refleje el
// cambio sin recargar las seis colecciones. Cada resultado trae el parche del
// documento (estado, firmas, entrega) y la entrada del historial.
export function aplicarResultadosLote(fichas, resultados) {
  if (!resultados?.length) return fichas;
  const porClave = new Map(resultados.map((r) => [r.clave, r]));
  return fichas.map((f) => {
    const r = porClave.get(claveFicha(f));
    if (!r) return f;
    return {
      ...f,
      ...r.parche,
      notas: r.nota ? [...(f.notas || []), r.nota] : f.notas,
    };
  });
}

// Las órdenes ya entregadas no entran en un lote: volver a firmarlas sería
// corregir evidencia cerrada, y eso se hace de a una desde el detalle.
export const fichasAbiertas = (fichas) => (fichas || []).filter((f) => f.estado !== "entregado");
