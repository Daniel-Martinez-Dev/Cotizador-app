// Datos que hereda una ficha nueva creada dentro de un pedido (una orden de
// compra que ya tiene otras fichas, ver produccion/ordenesAgrupar.js).
//
// La agrupación se sostiene sobre lo que el usuario teclee en "N.° orden de
// compra": si al sumar la tercera línea del pedido hay que volver a escribirla,
// tarde o temprano se escribe distinto y esa ficha se queda suelta en el
// tablero. Por eso el formulario abre con la OC, el cliente y las fechas del
// pedido ya puestas — el mismo cliente y la misma entrega, que es lo que ya
// pasaba de todas formas.
//
// Solo se copian los campos que el formulario destino tiene: las seis líneas de
// producto comparten identificación y cliente, pero no todas manejan fecha de
// entrega, por ejemplo.
export function conPrefillOrden(inicial, prefill) {
  if (!prefill) return inicial;
  const form = { ...inicial };
  for (const [campo, valor] of Object.entries(prefill)) {
    if (!(campo in inicial)) continue;
    if (valor === "" || valor == null) continue;
    form[campo] = valor;
  }
  return form;
}
