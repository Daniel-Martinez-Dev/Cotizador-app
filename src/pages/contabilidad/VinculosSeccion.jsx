import React from "react";
import Badge from "../../components/ui/Badge";
import Combobox from "../../components/ui/Combobox";
import { Aviso, Campo, Seccion, claseControl } from "./ui";
import { useListaCacheada } from "../../utils/listaCacheada";
import { listaCotizaciones, listaFichas } from "../../utils/listasVinculo";
import {
  agregarFichaAFactura,
  claveFicha,
  etiquetaCotizacion,
  etiquetaFicha,
  quitarFichaDeFactura,
  sinCotizacion,
  vinculoDesdeCotizacion,
} from "../../utils/documentoVinculo";

// De dónde salió esta factura: la cotización que el cliente aprobó y las fichas
// de fabricación que se le entregaron. Todo opcional — el libro viejo se
// importó sin nada de esto y sigue cuadrando igual (ver utils/documentoVinculo.js).
//
// Es lo que permite responder las dos preguntas que hoy se contestan de
// memoria: "esta factura, ¿de qué cotización salió?" y "¿qué se fabricó por
// ella?". La flecha va desde la factura porque una factura cobra varias fichas
// —las de un mismo pedido, ver produccion/ordenesAgrupar.js— y porque la ficha
// no puede saber de dinero: la lee planta.

// Las dos listas se pintan con lo último que se leyó y se refrescan por detrás:
// el modal se abre y se cierra muchas veces seguidas al registrar las facturas
// del día, y son las mismas que usa el selector de la ficha (ver
// utils/listasVinculo.js). La sección se degrada sola —un aviso en vez del
// selector— cuando quien factura no tiene permiso de leer producción, y la
// factura se guarda igual.

const fechaCorta = (f) => {
  try {
    return f ? new Date(f).toLocaleDateString("es-CO") : "";
  } catch {
    return "";
  }
};

// Chip de un vínculo puesto, con su botón de quitar.
function Vinculo({ titulo, detalle, onQuitar }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-md border border-gray-200 dark:border-gris-600 bg-gray-50 dark:bg-gris-800 pl-2.5 pr-1 py-1 text-xs">
      <span className="min-w-0 truncate">
        <strong className="font-semibold text-gray-900 dark:text-white">{titulo}</strong>
        {detalle && <span className="ml-1.5 text-gray-500 dark:text-gray-400">{detalle}</span>}
      </span>
      <button
        type="button"
        onClick={onQuitar}
        aria-label={`Quitar ${titulo}`}
        title="Quitar el vínculo. No borra nada, solo deja de relacionarlo con esta factura."
        className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gris-700"
      >
        ×
      </button>
    </span>
  );
}

export default function VinculosSeccion({ form, onCambio }) {
  const cotizaciones = useListaCacheada(listaCotizaciones);
  const fichas = useListaCacheada(listaFichas);
  const [buscaCotizacion, setBuscaCotizacion] = React.useState("");
  const [buscaFicha, setBuscaFicha] = React.useState("");

  const puestas = React.useMemo(() => form.fichas || [], [form.fichas]);
  const yaPuesta = React.useMemo(() => new Set(puestas.map(claveFicha)), [puestas]);

  // Las del mismo cliente primero: con cientos en la lista, el orden es lo que
  // hace corta la búsqueda.
  const propio = String(form.empresaId || "");

  const opcionesCotizacion = React.useMemo(() => {
    const lista = propio
      ? [...cotizaciones.datos].sort((a, b) => (b.empresaId === propio) - (a.empresaId === propio))
      : cotizaciones.datos;
    return lista.map((c) => ({
      id: c.id,
      label: c.numero ? `N.º ${c.numero}` : "Sin número",
      sublabel: [c.nombreCliente, fechaCorta(c.fecha), c.estadoSeguimiento].filter(Boolean).join(" · "),
      data: c,
    }));
  }, [cotizaciones.datos, propio]);

  const opcionesFicha = React.useMemo(() => {
    const libres = fichas.datos.filter((f) => !yaPuesta.has(claveFicha(f)));
    const lista = propio
      ? [...libres].sort((a, b) => (b.clienteId === propio) - (a.clienteId === propio))
      : libres;
    return lista.map((f) => ({
      id: `${f.tipo}:${f.id}`,
      label: etiquetaFicha({ codigo: f.codigoFicha, ordenProduccion: f.ordenProduccion }),
      sublabel: [f.cliente, f.tipoLabel, f.nombreFicha, f.numeroOrdenCompra && `OC ${f.numeroOrdenCompra}`]
        .filter(Boolean).join(" · "),
      data: f,
    }));
  }, [fichas.datos, yaPuesta, propio]);

  const elegirCotizacion = (op) => {
    setBuscaCotizacion("");
    onCambio(vinculoDesdeCotizacion(op.data));
  };

  const agregarFicha = (op) => {
    setBuscaFicha("");
    onCambio({ fichas: agregarFichaAFactura(puestas, op.data) });
  };

  return (
    <Seccion
      titulo="Vínculos"
      descripcion="De qué cotización salió y qué fichas cubre. Opcional: la factura se guarda igual sin ellos."
    >
      <div className="grid gap-4">
        <Campo
          label="Cotización"
          hint={form.origen === "cotizacion" ? "Esta factura se creó desde la cotización." : undefined}
        >
          {form.cotizacionId ? (
            <div>
              <Vinculo
                titulo={etiquetaCotizacion(form)}
                detalle={cotizaciones.datos.find((c) => c.id === form.cotizacionId)?.nombreCliente || ""}
                onQuitar={() => onCambio(sinCotizacion())}
              />
            </div>
          ) : cotizaciones.error ? (
            <Aviso tono="aviso">
              No se pudo leer el historial de cotizaciones. La factura se guarda igual, sin vínculo.
            </Aviso>
          ) : (
            <Combobox
              value={buscaCotizacion}
              onChange={setBuscaCotizacion}
              onSelect={elegirCotizacion}
              options={opcionesCotizacion}
              disabled={cotizaciones.cargando}
              placeholder={cotizaciones.cargando ? "Cargando cotizaciones…" : "Buscar por número o cliente"}
              inputClassName={claseControl}
              emptyText="Ninguna cotización con ese número o cliente"
            />
          )}
        </Campo>

        <Campo
          label="Fichas de fabricación"
          hint="Una factura puede cubrir varias fichas del mismo pedido."
        >
          {fichas.error ? (
            <Aviso tono="aviso">
              No se pudieron leer las fichas de producción. La factura se guarda igual, sin vínculo.
            </Aviso>
          ) : (
            <Combobox
              value={buscaFicha}
              onChange={setBuscaFicha}
              onSelect={agregarFicha}
              options={opcionesFicha}
              disabled={fichas.cargando}
              placeholder={fichas.cargando ? "Cargando fichas…" : "Buscar por código, cliente u orden de compra"}
              inputClassName={claseControl}
              emptyText="Ninguna ficha con ese código o cliente"
            />
          )}

          {puestas.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {puestas.map((ref) => (
                <Vinculo
                  key={claveFicha(ref)}
                  titulo={etiquetaFicha(ref)}
                  detalle={[ref.cliente, ref.nombre].filter(Boolean).join(" · ")}
                  onQuitar={() => onCambio({ fichas: quitarFichaDeFactura(puestas, ref) })}
                />
              ))}
            </div>
          )}
        </Campo>
      </div>
    </Seccion>
  );
}

// Insignia para la cabecera del modal y para el listado: cuántas fichas cubre.
export function FichasBadge({ documento }) {
  const cuantas = (documento?.fichas || []).length;
  if (!cuantas) return null;
  return (
    <Badge tone="neutral">
      {cuantas} ficha{cuantas === 1 ? "" : "s"}
    </Badge>
  );
}
