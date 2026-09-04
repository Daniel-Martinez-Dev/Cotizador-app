import React from "react";

// Una lista que se lee de la red pero se pinta al instante con lo último que se
// leyó, y se refresca por detrás.
//
// Nace de los selectores que vinculan documentos entre sí (ver
// documentoVinculo.js): el de cotizaciones se monta cada vez que se cambia de
// pestaña en Producción, y el de fichas cada vez que se abre el formulario de
// una factura — muchas veces seguidas al registrar las del día. Volver a pedir
// trescientas cabeceras en cada montaje es caro en el celular de planta y en
// los datos del que factura desde la calle.
//
// Cachear a secas tampoco servía: quien acaba de guardar una cotización y
// entra a crear la ficha no la encontraba en la lista hasta recargar la app.
// Por eso se sirve lo viejo y se pide lo nuevo a la vez: la lista aparece
// llena y se completa sola un segundo después.
//
// Una petición en curso se comparte en vez de duplicarse: dos selectores
// montados a la vez —la cotización de la ficha y la de la factura— piden lo
// mismo.
export function crearListaCacheada(cargar) {
  let ultima = null;
  let enVuelo = null;

  return {
    // Lo último que se leyó bien, o null si todavía no se ha leído nada.
    ultima: () => ultima,

    // Un fallo no deja rastro: la próxima vez se vuelve a intentar contra la
    // red, y lo que ya se había leído bien se conserva.
    refrescar() {
      if (!enVuelo) {
        enVuelo = cargar().then(
          (datos) => { ultima = datos; enVuelo = null; return datos; },
          (error) => { enVuelo = null; throw error; }
        );
      }
      return enVuelo;
    },

    // Para las pruebas y para cuando el usuario cambia de cuenta: lo leído con
    // los permisos de otro no vale.
    olvidar() { ultima = null; enVuelo = null; },
  };
}

// Estado de una lista cacheada para un componente: qué pintar, si todavía se
// está leyendo por primera vez y si la lectura falló.
//
// `cargando` es solo la primera vez: mientras se refresca por detrás ya hay
// algo que mostrar y decir "cargando…" encima de una lista llena confunde.
// `error` tampoco tapa lo que se pudo leer antes: se avisa, pero con la lista
// vieja puesta, que sirve más que una caja vacía.
export function useListaCacheada(lista) {
  const [datos, setDatos] = React.useState(() => lista.ultima() || []);
  const [cargando, setCargando] = React.useState(() => lista.ultima() === null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let vigente = true;
    lista.refrescar()
      .then((frescos) => {
        if (!vigente) return;
        setDatos(frescos);
        setError(false);
      })
      .catch((e) => {
        console.error("No se pudo leer la lista", e);
        if (vigente) setError(true);
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [lista]);

  return { datos, cargando, error };
}
