import React from "react";
import toast from "react-hot-toast";
import { FaPlus } from "react-icons/fa";

function fmtFechaNota(ts) {
  const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : null);
  if (!d) return "";
  return d.toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function NotaSection({ notas, onAdd }) {
  const [texto, setTexto] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const notasOrdenadas = React.useMemo(() => {
    const list = Array.isArray(notas) ? notas.slice() : [];
    return list.sort((a, b) => {
      const ta = a?.fecha?.toMillis ? a.fecha.toMillis() : (a?.fecha?.seconds || 0) * 1000;
      const tb = b?.fecha?.toMillis ? b.fecha.toMillis() : (b?.fecha?.seconds || 0) * 1000;
      return tb - ta;
    });
  }, [notas]);

  const handleAdd = async () => {
    const val = texto.trim();
    if (!val) return;
    setSaving(true);
    try {
      await onAdd(val);
      setTexto("");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo agregar la nota");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 p-3">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Notas</div>

      {notasOrdenadas.length === 0 ? (
        <div className="text-xs text-gray-400 mb-3">Sin notas todavía.</div>
      ) : (
        <div className="space-y-2 mb-3 max-h-56 overflow-y-auto">
          {notasOrdenadas.map((n, idx) => (
            <div key={idx} className="rounded-lg bg-gray-50 dark:bg-gris-700/60 px-2.5 py-2 text-xs">
              <div className="text-gray-800 dark:text-gray-100 whitespace-pre-line">{n.texto}</div>
              <div className="text-[10px] text-gray-400 mt-1">
                {n.autorNombre || "—"} · {fmtFechaNota(n.fecha)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          placeholder="Agregar una nota…"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm resize-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !texto.trim()}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium"
        >
          <FaPlus className="text-[10px]" /> Agregar
        </button>
      </div>
    </div>
  );
}
