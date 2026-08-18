import React from "react";
import toast from "react-hot-toast";
import { FaPlus, FaTimes, FaUserEdit } from "react-icons/fa";
import { listAllUsers } from "../../utils/firebaseUsers";
import { normalizarPersonasFirma } from "../../utils/firmasFicha";

// Quiénes firman una etapa de la ficha. Firma más de una persona casi siempre
// —alistar y empacar un pedido es trabajo de varios— así que es selección
// múltiple, no un desplegable.
//
// La lista sale del directorio de usuarios, pero en planta trabaja gente sin
// cuenta en la app: por eso además se puede escribir un nombre a mano. Esos
// quedan guardados con uid vacío (ver normalizarPersonasFirma); lo que importa
// es el nombre, que es lo que se imprime en la ficha.

const nombreDe = (u) => u.displayName || u.email || u.id;

export default function PersonasFirmaPicker({ personas, onChange, disabled }) {
  const [staff, setStaff] = React.useState([]);
  const [cargando, setCargando] = React.useState(true);
  const [nombreLibre, setNombreLibre] = React.useState("");

  React.useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const todos = await listAllUsers();
        if (!activo) return;
        setStaff(
          todos
            .filter((u) => u.status === "active")
            .sort((a, b) => nombreDe(a).localeCompare(nombreDe(b)))
        );
      } catch (e) {
        console.error(e);
        // No bloquea: si el directorio no carga, los nombres se escriben a mano.
        toast.error("No se pudo cargar la lista de usuarios");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  const seleccionados = React.useMemo(
    () => new Set(personas.filter((p) => p.uid).map((p) => p.uid)),
    [personas]
  );
  const libres = personas.filter((p) => !p.uid);

  const alternarUsuario = (u) => {
    const uid = u.id;
    onChange(
      seleccionados.has(uid)
        ? personas.filter((p) => p.uid !== uid)
        : normalizarPersonasFirma([...personas, { uid, nombre: nombreDe(u) }])
    );
  };

  const agregarLibre = () => {
    const limpio = nombreLibre.trim();
    if (!limpio) return;
    const siguiente = normalizarPersonasFirma([...personas, { uid: "", nombre: limpio }]);
    if (siguiente.length === personas.length) {
      toast("Esa persona ya está en la lista");
    } else {
      onChange(siguiente);
    }
    setNombreLibre("");
  };

  const quitarLibre = (nombre) => onChange(personas.filter((p) => p.uid || p.nombre !== nombre));

  return (
    <div className="space-y-2">
      {cargando ? (
        <div className="text-xs opacity-60 py-3 text-center">Cargando personal…</div>
      ) : (
        <div className="space-y-1.5 max-h-44 overflow-y-auto">
          {staff.map((u) => {
            const marcado = seleccionados.has(u.id);
            return (
              <label
                key={u.id}
                className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm border ${
                  marcado
                    ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/25"
                    : "border-transparent bg-gray-50 dark:bg-gris-700/50"
                } ${disabled ? "opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  disabled={disabled}
                  onChange={() => alternarUsuario(u)}
                  className="h-4 w-4 shrink-0"
                />
                <span className="truncate">{nombreDe(u)}</span>
              </label>
            );
          })}
          {staff.length === 0 && (
            <div className="text-xs text-gray-400 py-2">No hay usuarios activos en el directorio.</div>
          )}
        </div>
      )}

      {libres.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {libres.map((p) => (
            <span
              key={p.nombre}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-gray-100 dark:bg-gris-700 text-xs"
            >
              <FaUserEdit className="text-[10px] opacity-60" />
              {p.nombre}
              <button
                type="button"
                onClick={() => quitarLibre(p.nombre)}
                disabled={disabled}
                title={`Quitar a ${p.nombre}`}
                className="h-4 w-4 rounded-full bg-gray-300 dark:bg-gris-500 text-white flex items-center justify-center disabled:opacity-40"
              >
                <FaTimes className="text-[8px]" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={nombreLibre}
          onChange={(e) => setNombreLibre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); agregarLibre(); }
          }}
          disabled={disabled}
          placeholder="Otra persona (nombre y apellido)…"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm"
        />
        <button
          type="button"
          onClick={agregarLibre}
          disabled={disabled || !nombreLibre.trim()}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg bg-gray-800 dark:bg-gris-600 text-white text-xs font-medium disabled:opacity-40"
        >
          <FaPlus className="text-[10px]" /> Agregar
        </button>
      </div>
    </div>
  );
}
