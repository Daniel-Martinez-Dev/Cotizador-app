import React from "react";
import toast from "react-hot-toast";
import { FaFileInvoiceDollar, FaClipboardList } from "react-icons/fa";
import { historialCliente } from "../../utils/firebaseClienteVinculo";
import { useAuth } from "../../context/AuthContext";
import EstadoBadge from "../fichas/EstadoBadge";
import { codigoFicha as codigoDeFicha } from "../../utils/codigoFicha";
import { fmtDate } from "../../utils/fichaFormat";
import { formatearPesos } from "../../utils/formatos";

// Las dos caras de un mismo cliente: lo que se le cotizó y lo que se le está
// fabricando. Es la vista que justifica el vínculo — antes había que buscar el
// nombre a mano en cada módulo, con la esperanza de que estuviera escrito igual.
export default function HistorialCliente({ empresa }) {
  const { hasRole, user } = useAuth();
  const [datos, setDatos] = React.useState(null);
  const [cargando, setCargando] = React.useState(true);

  React.useEffect(() => {
    let vigente = true;
    setCargando(true);
    // Las reglas solo dejan a un admin leer cotizaciones ajenas; los demás
    // consultan las suyas (ver firebaseClienteVinculo.js).
    const uid = hasRole("admin") ? null : user?.uid || null;
    historialCliente(empresa.id, { uid })
      .then((r) => { if (vigente) setDatos(r); })
      .catch((e) => { console.error(e); if (vigente) toast.error("Error cargando el historial del cliente"); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa.id]);

  if (cargando) return <div className="px-4 pb-4 text-xs opacity-70">Cargando historial…</div>;
  if (!datos) return null;

  const { fichas, cotizaciones } = datos;

  return (
    <div className="px-4 pb-4 grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
      <div className="rounded border border-gray-200 dark:border-gris-700 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gris-700 font-semibold">
          <FaClipboardList className="text-gray-400" /> Fichas de fabricación ({fichas.length})
        </div>
        {fichas.length === 0 ? (
          <div className="px-3 py-2 opacity-70">Ninguna ficha vinculada todavía</div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gris-700">
            {fichas.map((f) => (
              <li key={`${f.tipo}-${f.id}`} className="px-3 py-2 flex items-center gap-2">
                <span className="font-mono">{codigoDeFicha(f, f.tipo)}</span>
                <span className="truncate opacity-70">{f.tipoLabel}</span>
                <EstadoBadge estado={f.estado} className="ml-auto shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded border border-gray-200 dark:border-gris-700 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gris-700 font-semibold">
          <FaFileInvoiceDollar className="text-gray-400" /> Cotizaciones ({cotizaciones.length})
        </div>
        {cotizaciones.length === 0 ? (
          <div className="px-3 py-2 opacity-70">Ninguna cotización vinculada todavía</div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gris-700">
            {cotizaciones.map((c) => (
              <li key={c.id} className="px-3 py-2 flex items-center gap-2">
                <span className="font-mono">{c.numero || "—"}</span>
                <span className="opacity-70">{fmtDate(c.timestamp?.toDate?.())}</span>
                <span className="ml-auto shrink-0 font-medium">{formatearPesos(c.total || 0)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
