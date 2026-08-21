import React from "react";
import toast from "react-hot-toast";
import { FaPlus, FaTimes, FaUserEdit } from "react-icons/fa";
import { listAllUsers } from "../../utils/firebaseUsers";
import { useAuth } from "../../context/AuthContext";
import { claveNombre, normalizarPersonasFirma } from "../../utils/firmasFicha";

// Quiénes firman una etapa de la ficha. Firma más de una persona casi siempre
// —alistar y empacar un pedido es trabajo de varios— así que es selección
// múltiple, no un desplegable.
//
// Quién puede poner el nombre de quién:
//
//   · Los empleados de planta salen todos en la lista y cualquiera puede
//     firmar por otro — el turno trabaja junto y lo registra uno solo.
//   · El nombre de alguien de producción o administración NO lo pone nadie más:
//     solo aparece para su propio dueño, con su sesión abierta. Por eso quien
//     registra se ve a sí mismo aunque no sea de planta, y a nadie más de fuera
//     de planta.
//   · En planta también trabaja gente sin cuenta en la app, así que además se
//     puede escribir un nombre a mano. Esos quedan con uid vacío (ver
//     normalizarPersonasFirma) — pero escribir el nombre de un usuario de
//     producción tampoco vale: se rechaza al agregarlo.
//
// Al marcar a alguien se copia también la firma que dibujó en su perfil (ver
// PerfilPage), que es la que sale impresa sobre su línea en la ficha. Quien no
// la tenga dibujada firma a mano sobre el papel, como siempre.

const nombreDe = (u) => u.displayName || u.email || u.id;

const firmanteDe = (u) => ({ uid: u.id, nombre: nombreDe(u), firma: u.firmaDataUrl || "" });

const esEmpleado = (u) => Array.isArray(u.roles) && u.roles.includes("empleado");

const claveDe = (p) => p.uid || p.nombre;

export default function PersonasFirmaPicker({ personas, onChange, disabled }) {
  const { user } = useAuth();
  const [staff, setStaff] = React.useState([]);
  // Nombres del resto del staff (producción/administración, sin contar al
  // propio usuario): no se pueden firmar por ellos, ni marcándolos ni
  // escribiéndolos.
  const [ajenos, setAjenos] = React.useState([]);
  const [cargando, setCargando] = React.useState(true);
  const [nombreLibre, setNombreLibre] = React.useState("");

  React.useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const todos = await listAllUsers();
        if (!activo) return;
        const activos = todos.filter((u) => u.status === "active");
        const planta = activos.filter(esEmpleado);
        const yo = activos.find((u) => u.id === user?.uid);
        // Quien registra sin ser de planta se agrega a la lista: es el único
        // que puede firmar con su nombre.
        const firmables = yo && !esEmpleado(yo) ? [...planta, yo] : planta;
        setStaff(firmables.sort((a, b) => nombreDe(a).localeCompare(nombreDe(b))));
        setAjenos(
          activos
            .filter((u) => !esEmpleado(u) && u.id !== user?.uid)
            .map((u) => nombreDe(u))
        );
      } catch (e) {
        console.error(e);
        // No bloquea: si el directorio no carga, los nombres se escriben a mano.
        toast.error("No se pudo cargar la lista de empleados");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, [user?.uid]);

  const seleccionados = React.useMemo(
    () => new Set(personas.filter((p) => p.uid).map((p) => p.uid)),
    [personas]
  );

  // Firmantes sin casilla en la lista: los escritos a mano y los que vienen de
  // una firma anterior con alguien que hoy no aparece —otro de producción, o un
  // empleado dado de baja—. Se pintan como fichas aparte para que nadie cuente
  // como firmante sin verse en pantalla.
  const sinCasilla = React.useMemo(() => {
    if (cargando) return personas.filter((p) => !p.uid);
    const enLista = new Set(staff.map((u) => u.id));
    return personas.filter((p) => !p.uid || !enLista.has(p.uid));
  }, [personas, staff, cargando]);

  const alternarUsuario = (u) => {
    const uid = u.id;
    onChange(
      seleccionados.has(uid)
        ? personas.filter((p) => p.uid !== uid)
        : normalizarPersonasFirma([...personas, firmanteDe(u)])
    );
  };

  const agregarLibre = () => {
    const limpio = nombreLibre.trim();
    if (!limpio) return;

    // Escribir a mano el nombre de alguien de producción es firmar por él.
    const ajeno = ajenos.find((n) => claveNombre(n) === claveNombre(limpio));
    if (ajeno) {
      toast.error(`${ajeno} tiene que firmar desde su propia cuenta`);
      return;
    }

    const siguiente = normalizarPersonasFirma([...personas, { uid: "", nombre: limpio }]);
    if (siguiente.length === personas.length) {
      toast("Esa persona ya está en la lista");
    } else {
      onChange(siguiente);
    }
    setNombreLibre("");
  };

  const quitar = (persona) => onChange(personas.filter((p) => claveDe(p) !== claveDe(persona)));

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
                {u.firmaDataUrl && (
                  <img
                    src={u.firmaDataUrl}
                    alt=""
                    title="Firma esta ficha con su firma dibujada"
                    className="ml-auto h-5 w-auto max-w-[70px] object-contain shrink-0 dark:invert"
                  />
                )}
                {u.id === user?.uid && !esEmpleado(u) && (
                  <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-gray-400">Tú</span>
                )}
              </label>
            );
          })}
          {staff.length === 0 && (
            <div className="text-xs text-gray-400 py-2">
              No hay empleados de planta registrados. Escribe los nombres abajo.
            </div>
          )}
        </div>
      )}

      {sinCasilla.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sinCasilla.map((p) => (
            <span
              key={claveDe(p)}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-gray-100 dark:bg-gris-700 text-xs"
            >
              <FaUserEdit className="text-[10px] opacity-60" />
              {p.nombre}
              <button
                type="button"
                onClick={() => quitar(p)}
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
