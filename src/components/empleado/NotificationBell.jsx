import React from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { suscribirNotificaciones, marcarNotificacionLeida } from "../../utils/firebaseNotificaciones";
import { FICHA_TIPOS } from "../../utils/firebaseFichas";

function formatRelativo(ts) {
  const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : null);
  if (!d) return "";
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  return d.toLocaleDateString("es-CO");
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const seenIds = React.useRef(null); // null = aún no cargó la primera vez

  React.useEffect(() => {
    if (!user?.uid) return undefined;
    const unsub = suscribirNotificaciones((docs) => {
      if (seenIds.current === null) {
        seenIds.current = new Set(docs.map((d) => d.id));
      } else {
        const nuevas = docs.filter((d) => !seenIds.current.has(d.id));
        for (const n of nuevas) {
          toast(`${n.tipoLabel || "Ficha"} de ${n.cliente || "cliente"} pasó a producción`, { icon: "🔔" });
          seenIds.current.add(n.id);
        }
      }
      setItems(docs);
    });
    return unsub;
  }, [user?.uid]);

  const unread = items.filter((n) => !(n.leidoPor || []).includes(user?.uid)).length;

  const handleOpen = () => setOpen((v) => !v);

  const handleClickItem = async (n) => {
    setOpen(false);
    if (user?.uid) marcarNotificacionLeida(n.id, user.uid).catch(() => {});
    const tipoValido = FICHA_TIPOS[n.fichaTipo] ? n.fichaTipo : null;
    if (tipoValido && n.fichaId) navigate(`/planta/produccion/${tipoValido}/${n.fichaId}`);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notificaciones"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800 text-gray-700 dark:text-gray-200"
      >
        <FaBell className="text-sm" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center font-semibold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Cerrar notificaciones" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto z-50 rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 shadow-xl">
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gris-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Notificaciones
            </div>
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400">Sin notificaciones</div>
            ) : (
              items.map((n) => {
                const leida = (n.leidoPor || []).includes(user?.uid);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClickItem(n)}
                    className={`w-full text-left px-3 py-2.5 border-b border-gray-50 dark:border-gris-700/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gris-700/50 ${
                      leida ? "opacity-60" : ""
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-800 dark:text-gray-100">
                      {n.tipoLabel || "Ficha"} · OP #{n.ordenProduccion ?? "—"}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {n.cliente || "Sin cliente"} pasó a producción
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{formatRelativo(n.createdAt)}</div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
