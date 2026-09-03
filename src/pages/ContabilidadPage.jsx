import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PageHeader from "../components/ui/PageHeader";
import Tabs from "../components/ui/Tabs";
import Button from "../components/ui/Button";
import FacturasTab from "./contabilidad/FacturasTab";
import CarteraTab from "./contabilidad/CarteraTab";
import ClientesTab from "./contabilidad/ClientesTab";
import ImportarTab from "./contabilidad/ImportarTab";
import ConfiguracionTab from "./contabilidad/ConfiguracionTab";
import FacturaModal from "./contabilidad/FacturaModal";
import PagosModal from "./contabilidad/PagosModal";
import { Aviso, Select } from "./contabilidad/ui";
import { listarEmpresas } from "../utils/firebaseCompanies";
import {
  LIMITE_LISTADO,
  listarDocumentos,
  listarPagos,
  listarSaldosIniciales,
  obtenerConfiguracion,
} from "../utils/firebaseContabilidad";
import { liquidarDocumentos } from "../modules/contabilidad/cartera";
import { anioDe, hoyISO } from "../modules/contabilidad/calculos";

// Firebase distingue bien qué falló; el problema es que su mensaje no le dice
// a nadie qué hacer. Estos sí.
function mensajeDeError(e) {
  const codigo = e?.code || "";
  if (codigo === "permission-denied") {
    return "Sin permiso para leer la contabilidad. Falta desplegar las reglas (firebase deploy --only firestore:rules) o darle el rol \"contabilidad\" a tu usuario.";
  }
  if (codigo === "failed-precondition") {
    return "Falta un índice en Firestore para esta consulta. El detalle y el enlace para crearlo están en la consola del navegador.";
  }
  if (codigo === "unavailable") return "Sin conexión con Firestore. Revisa la red y vuelve a intentar.";
  return `No se pudieron cargar los datos contables${codigo ? ` (${codigo})` : ""}.`;
}

export const TABS = [
  { key: "facturas", label: "Facturas" },
  { key: "cartera", label: "Cartera" },
  { key: "clientes", label: "Clientes" },
  { key: "importar", label: "Importar" },
  { key: "config", label: "Configuración" },
];

// El año es el eje de toda la sección: la contabilidad se lleva y se declara
// por año, y traer de una vez las ~340 facturas de todos los años haría lenta
// la pantalla que más se usa. El selector arranca en el año en curso.
const ANIO_ACTUAL = anioDe(hoyISO());

export default function ContabilidadPage() {
  const [tab, setTab] = React.useState("facturas");
  const [anio, setAnio] = React.useState(ANIO_ACTUAL);
  const [cargando, setCargando] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [documentos, setDocumentos] = React.useState([]);
  const [pagos, setPagos] = React.useState([]);
  const [saldosIniciales, setSaldosIniciales] = React.useState([]);
  const [empresas, setEmpresas] = React.useState([]);
  const [config, setConfig] = React.useState(null);

  // Documento abierto en el formulario y documento al que se le están viendo
  // los abonos. Viven aquí y no en la pestaña porque desde Cartera también se
  // abre una factura, y sería el mismo modal duplicado.
  const [editando, setEditando] = React.useState(null);
  const [viendoPagos, setViendoPagos] = React.useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const cargar = React.useCallback(async (anioPedido) => {
    setCargando(true);
    setError(null);
    try {
      const [docs, abonos, saldos, cfg, emps] = await Promise.all([
        listarDocumentos({ anio: anioPedido }),
        listarPagos({ anio: anioPedido }),
        listarSaldosIniciales(),
        obtenerConfiguracion(),
        listarEmpresas(),
      ]);
      setDocumentos(docs);
      setPagos(abonos);
      setSaldosIniciales(saldos);
      setConfig(cfg);
      setEmpresas(emps);
      if (docs.length >= LIMITE_LISTADO) {
        toast(`Se muestran las primeras ${LIMITE_LISTADO} facturas de ${anioPedido}.`, { icon: "⚠️" });
      }
    } catch (e) {
      console.error("No se pudo cargar la contabilidad", e);
      setError(e);
      toast.error(mensajeDeError(e), { duration: 8000 });
    } finally {
      setCargando(false);
    }
  }, []);

  React.useEffect(() => { cargar(anio); }, [anio, cargar]);

  // El botón "Facturar" del historial de cotizaciones llega aquí con la
  // cotización en el estado de la navegación. Se abre el formulario ya
  // precargado y se limpia el estado, para que un F5 no lo vuelva a abrir.
  React.useEffect(() => {
    const borrador = location.state?.facturarCotizacion;
    if (!borrador) return;
    setTab("facturas");
    setEditando({ modo: "nueva", datos: borrador });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  // Una sola liquidación para toda la sección: Facturas, Cartera y el modal de
  // abonos miran exactamente las mismas cifras. Es lo que el Excel no lograba,
  // con su columna de saldo, su hoja de estado de cuenta y su dinámica
  // contándose por separado.
  const liquidados = React.useMemo(
    () => liquidarDocumentos(documentos, pagos, hoyISO()),
    [documentos, pagos]
  );

  const saldosDelAnio = React.useMemo(
    () => saldosIniciales.filter((s) => !s.anio || s.anio < anio),
    [saldosIniciales, anio]
  );

  // Facturas que no cuelgan de ninguna empresa. Va como contador en la pestaña
  // Clientes porque, mientras haya alguna, la cartera de ese cliente está
  // partida en dos y ningún saldo de esta sección es del todo cierto.
  const sinVincular = React.useMemo(
    () => documentos.filter((d) => !d.empresaId).length,
    [documentos]
  );

  const recargar = () => cargar(anio);

  const tabs = React.useMemo(
    () => TABS.map((t) => (t.key === "clientes" && sinVincular ? { ...t, badge: sinVincular, badgeTone: "warning" } : t)),
    [sinVincular]
  );

  const comunes = { liquidados, documentos, pagos, empresas, config, cargando, anio, recargar };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10">
      <PageHeader
        section="/contabilidad"
        actions={
          /* En el teléfono la fila de acciones ocupa el ancho completo: el año
             y "Refrescar" se reparten arriba y "Nueva factura" queda sola
             abajo, que es la acción a la que se viene. Amontonadas en una sola
             línea, las tres quedaban de menos de un centímetro. */
          <div className="w-full sm:w-auto grid grid-cols-[1fr_auto] sm:flex sm:items-center gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <label className="text-xs text-gray-500 dark:text-gray-400 shrink-0" htmlFor="anio-contable">Año</label>
              {/* El ancho va en el contenedor y no en el <select>: la clase
                  w-full del control y una w-24 encima compiten en la misma
                  especificidad y gana la que Tailwind emita de última. */}
              <div className="w-full sm:w-24">
                <Select
                  id="anio-contable"
                  value={anio}
                  onChange={(e) => setAnio(Number(e.target.value))}
                >
                  {Array.from({ length: 8 }, (_, i) => ANIO_ACTUAL - i).map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </Select>
              </div>
            </div>
            <Button variant="secondary" onClick={recargar} disabled={cargando}>
              {cargando ? "Cargando…" : "Refrescar"}
            </Button>
            <Button
              variant="primary"
              onClick={() => setEditando({ modo: "nueva", datos: null })}
              className="col-span-2 sm:col-auto"
            >
              Nueva factura
            </Button>
          </div>
        }
      />

      {error && (
        <Aviso
          tono="malo"
          titulo={mensajeDeError(error)}
          className="mb-4"
          acciones={<Button variant="secondary" size="sm" onClick={recargar}>Reintentar</Button>}
        >
          <span className="font-mono break-all opacity-80">
            {error.code ? `${error.code}: ` : ""}{error.message}
          </span>
        </Aviso>
      )}

      {/* La barra de pestañas se queda arriba: en una tabla de 300 filas, tener
          que subir hasta el principio para cambiar de vista era el paso que más
          se repetía. `top-14` y no `top-0` porque el header de la app es fijo y
          mide h-14: debajo quedaría tapada. */}
      <div className="sticky top-14 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 bg-white/95 dark:bg-gris-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-gris-900/80">
        <Tabs items={tabs} active={tab} onChange={setTab} variant="boxed" deslizable />
      </div>

      <div className="mt-5">
        {tab === "facturas" && (
          <FacturasTab
            {...comunes}
            onEditar={(doc) => setEditando({ modo: "editar", datos: doc })}
            onVerPagos={(doc) => setViendoPagos(doc)}
            onNueva={() => setEditando({ modo: "nueva", datos: null })}
          />
        )}
        {tab === "cartera" && (
          <CarteraTab
            {...comunes}
            saldosIniciales={saldosDelAnio}
            onEditar={(doc) => setEditando({ modo: "editar", datos: doc })}
            onVerPagos={(doc) => setViendoPagos(doc)}
          />
        )}
        {tab === "clientes" && (
          <ClientesTab
            {...comunes}
            onEditar={(doc) => setEditando({ modo: "editar", datos: doc })}
            onVerPagos={(doc) => setViendoPagos(doc)}
          />
        )}
        {tab === "importar" && <ImportarTab {...comunes} onImportado={recargar} />}
        {tab === "config" && <ConfiguracionTab config={config} onGuardado={recargar} />}
      </div>

      {editando && (
        <FacturaModal
          modo={editando.modo}
          documento={editando.datos}
          empresas={empresas}
          documentos={liquidados}
          config={config}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); recargar(); }}
        />
      )}

      {viendoPagos && (
        <PagosModal
          documento={liquidados.find((d) => d.id === viendoPagos.id) || viendoPagos}
          config={config}
          onCerrar={() => setViendoPagos(null)}
          onCambio={recargar}
        />
      )}
    </div>
  );
}
