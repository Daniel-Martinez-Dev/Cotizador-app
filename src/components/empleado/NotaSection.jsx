import React from "react";
import toast from "react-hot-toast";
import { FaPlus } from "react-icons/fa";
import { ordenarNotasDesc } from "../fichas/notasFicha";
import NotaItem from "../fichas/NotaItem";

// Historial de la ficha en el panel de planta: notas escritas a mano y cambios
// de estado, en una sola lista (ver firebaseFichas.js — ambos van al mismo
// arreglo `notas`).
export default function NotaSection({ notas, onAdd }) {
  const [texto, setTexto] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const historial = React.useMemo(() => ordenarNotasDesc(notas), [notas]);

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
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Historial y notas
      </div>

      {historial.length === 0 ? (
        <div className="text-xs text-gray-400 mb-3">Sin movimientos registrados todavía.</div>
      ) : (
        <ul className="space-y-2.5 mb-3 max-h-56 overflow-y-auto text-xs">
          {historial.map((n, idx) => <NotaItem key={idx} nota={n} />)}
        </ul>
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
