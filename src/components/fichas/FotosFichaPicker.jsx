import React from "react";
import toast from "react-hot-toast";
import { FaCamera, FaTrash, FaLock } from "react-icons/fa";
import { MAX_FOTOS } from "../../utils/fotosFicha";

// Registro fotográfico de una etapa de la ficha (alistado, entrega…).
//
// Las fotos elegidas viven aquí como File + preview local y se avisan al padre
// con `onArchivos`: la subida a Storage ocurre al confirmar el formulario, no
// al elegirlas, para no dejar basura en el bucket si el usuario cancela.
//
// `onQuitarExistente` solo llega cuando quien está mirando puede corregir la
// evidencia (producción/admin). Para el empleado no llega, y las fotos ya
// guardadas se ven pero no se tocan.

export default function FotosFichaPicker({
  existentes = [],
  onArchivos,
  onQuitarExistente,
  disabled,
  ayuda = "Se reducen automáticamente antes de subirlas.",
}) {
  const [nuevas, setNuevas] = React.useState([]);

  // Las previews son object URLs: hay que soltarlas al desmontar o se filtra
  // memoria. Va contra un ref y no contra `nuevas` porque un efecto con esa
  // dependencia revocaría, en cada foto añadida, las previews de las anteriores
  // —que siguen en pantalla— y quedarían en blanco.
  const nuevasRef = React.useRef([]);
  React.useEffect(() => { nuevasRef.current = nuevas; }, [nuevas]);
  React.useEffect(() => () => nuevasRef.current.forEach((n) => URL.revokeObjectURL(n.preview)), []);

  const total = existentes.length + nuevas.length;

  const actualizar = (siguiente) => {
    setNuevas(siguiente);
    onArchivos?.(siguiente.map((n) => n.file));
  };

  const agregarArchivos = (e) => {
    const elegidos = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (elegidos.length === 0) return;
    const cupo = MAX_FOTOS - total;
    if (cupo <= 0) return toast.error(`Máximo ${MAX_FOTOS} fotos`);
    if (elegidos.length > cupo) toast(`Solo caben ${cupo} foto(s) más`);
    actualizar([
      ...nuevas,
      ...elegidos.slice(0, cupo).map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
  };

  const quitarNueva = (idx) => {
    URL.revokeObjectURL(nuevas[idx].preview);
    actualizar(nuevas.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Registro fotográfico</span>
        <span className="text-[11px] text-gray-400">{total}/{MAX_FOTOS}</span>
      </div>

      {total > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-2">
          {existentes.map((f, i) => (
            <Miniatura
              key={f.path}
              src={f.url}
              onQuitar={onQuitarExistente ? () => onQuitarExistente(i) : null}
              disabled={disabled}
            />
          ))}
          {nuevas.map((n, i) => (
            <Miniatura key={n.preview} src={n.preview} onQuitar={() => quitarNueva(i)} disabled={disabled} />
          ))}
        </div>
      )}

      <label className={`flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed text-xs font-medium transition ${
        total >= MAX_FOTOS || disabled
          ? "border-gray-200 dark:border-gris-700 text-gray-300 dark:text-gris-500 cursor-default"
          : "border-gray-300 dark:border-gris-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gris-700 cursor-pointer"
      }`}>
        <FaCamera /> Tomar o elegir fotos
        {/* Sin `capture`: con ese atributo Android abre la cámara
            directamente y deja fuera las fotos ya tomadas en galería. */}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={total >= MAX_FOTOS || disabled}
          onChange={agregarArchivos}
          className="hidden"
        />
      </label>
      <div className="text-[10px] text-gray-400 mt-1">{ayuda}</div>
    </div>
  );
}

function Miniatura({ src, onQuitar, disabled }) {
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gris-600">
      <img src={src} alt="" className="h-full w-full object-cover" />
      {onQuitar ? (
        <button
          type="button"
          onClick={onQuitar}
          disabled={disabled}
          title="Quitar foto"
          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-40"
        >
          <FaTrash className="text-[9px]" />
        </button>
      ) : (
        <span
          title="Evidencia ya guardada: no se puede borrar"
          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/50 text-white flex items-center justify-center"
        >
          <FaLock className="text-[8px]" />
        </span>
      )}
    </div>
  );
}
