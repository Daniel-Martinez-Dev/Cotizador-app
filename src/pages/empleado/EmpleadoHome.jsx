import React from "react";
import { Link } from "react-router-dom";
import { FaIndustry, FaBoxes, FaExclamationTriangle, FaChevronRight } from "react-icons/fa";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { listarTodasFichasProduccion } from "../../utils/firebaseFichas";
import { listarItemsInventario } from "../../utils/firebaseInventory";
import { puedeAlmacen } from "../../utils/roles";

export default function EmpleadoHome() {
  const { profile, user, hasRole } = useAuth();
  // El inventario ni se consulta si la persona no es de almacén: las reglas se
  // lo negarían y el resumen se llenaría de errores en pantalla.
  const conAlmacen = puedeAlmacen(hasRole);
  const [loading, setLoading] = React.useState(true);
  const [enProduccion, setEnProduccion] = React.useState(0);
  const [bajoStock, setBajoStock] = React.useState(0);

  React.useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [fichas, items] = await Promise.all([
          listarTodasFichasProduccion(),
          conAlmacen ? listarItemsInventario() : Promise.resolve([]),
        ]);
        if (!activo) return;
        setEnProduccion(fichas.filter((f) => f.estado === "en_produccion").length);
        setBajoStock(
          items.filter((i) => Number(i.stockMinimo || 0) > 0 && Number(i.stockActual || 0) < Number(i.stockMinimo || 0)).length
        );
      } catch (e) {
        console.error(e);
        toast.error("No se pudo cargar el resumen");
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, [conAlmacen]);

  const nombre = profile?.firstName || profile?.displayName || user?.email || "";

  return (
    <div className="pt-4 space-y-4">
      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Hola,</div>
        <h1 className="text-lg font-semibold truncate">{nombre}</h1>
      </div>

      <div className={`grid gap-3 ${conAlmacen ? "grid-cols-2" : "grid-cols-1"}`}>
        <div className="rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 px-3 py-3">
          <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">En producción</div>
          <div className="text-2xl font-bold mt-0.5">{loading ? "…" : enProduccion}</div>
        </div>
        {conAlmacen && (
          <div className="rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 px-3 py-3">
            <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-1">
              {bajoStock > 0 && <FaExclamationTriangle className="text-amber-500" />} Stock bajo
            </div>
            <div className={`text-2xl font-bold mt-0.5 ${bajoStock > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {loading ? "…" : bajoStock}
            </div>
          </div>
        )}
      </div>

      <Link
        to="/planta/produccion"
        className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 px-4 py-4 active:scale-[0.99] transition"
      >
        <span className="h-11 w-11 rounded-lg bg-blue-600/10 text-blue-700 dark:text-blue-400 flex items-center justify-center text-lg shrink-0">
          <FaIndustry />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">Producción</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Fichas de fabricación, notas y estado</div>
        </div>
        <FaChevronRight className="text-gray-400 text-xs" />
      </Link>

      {conAlmacen && (
        <Link
          to="/planta/inventario"
          className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 px-4 py-4 active:scale-[0.99] transition"
        >
          <span className="h-11 w-11 rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0">
            <FaBoxes />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">Materia prima</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Catálogo, entradas y salidas del almacén</div>
          </div>
          <FaChevronRight className="text-gray-400 text-xs" />
        </Link>
      )}
    </div>
  );
}
