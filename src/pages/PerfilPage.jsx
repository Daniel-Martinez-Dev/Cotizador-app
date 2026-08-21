import React from "react";
import toast from "react-hot-toast";
import {
  FaCamera, FaCheck, FaKey, FaLock, FaPen, FaSignature, FaTrash, FaUser,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import FirmaPad from "../components/perfil/FirmaPad";
import AvatarPerfil from "../components/perfil/AvatarPerfil";
import { authErrorMsg } from "../utils/authErrores";
import { subirFotoPerfil } from "../utils/fotoPerfil";

// "Mi perfil" — lo que cada persona puede cambiar de su propia cuenta: foto,
// nombre, contraseña y firma.
//
// El correo NO se edita: es la credencial con la que se inicia sesión y la
// llave con la que el administrador pre-registra a alguien (usuarios_email).
// Cambiarlo desde aquí dejaría la cuenta sin correspondencia con su registro,
// así que se muestra bloqueado y se cambia por el administrador.
//
// La misma pantalla sirve a la planta ("/planta/perfil") y a la oficina
// ("/perfil"): el perfil es de la persona, no del módulo.

const MIN_PASSWORD = 8;

const inputCls = "mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm disabled:opacity-60";
const labelCls = "text-xs font-medium text-gray-600 dark:text-gray-300";
const cardCls = "rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 p-4 space-y-4";
const tituloCls = "text-sm font-semibold inline-flex items-center gap-2";

// El perfil puede traer los nombres separados (registro propio) o solo el
// displayName (usuario creado por el administrador). Se parte por el primer
// espacio: el resto son apellidos.
function partirNombre(perfil) {
  if (perfil?.firstName || perfil?.lastName) {
    return { nombres: perfil.firstName || "", apellidos: perfil.lastName || "" };
  }
  const partes = (perfil?.displayName || "").trim().split(/\s+/).filter(Boolean);
  return { nombres: partes[0] || "", apellidos: partes.slice(1).join(" ") };
}

export default function PerfilPage() {
  const { user, profile, roles, actualizarMiPerfil, cambiarPassword } = useAuth();

  const [nombres, setNombres] = React.useState("");
  const [apellidos, setApellidos] = React.useState("");
  const [guardandoDatos, setGuardandoDatos] = React.useState(false);
  const [subiendoFoto, setSubiendoFoto] = React.useState(false);

  const [abrirPad, setAbrirPad] = React.useState(false);
  const [guardandoFirma, setGuardandoFirma] = React.useState(false);

  const [passwords, setPasswords] = React.useState({ actual: "", nueva: "", confirmar: "" });
  const [cambiando, setCambiando] = React.useState(false);

  const archivoRef = React.useRef(null);

  // El perfil llega de forma asíncrona (AuthContext lo resuelve después del
  // login), así que los campos se rellenan cuando llega, no al montar.
  React.useEffect(() => {
    const { nombres: n, apellidos: a } = partirNombre(profile);
    setNombres(n);
    setApellidos(a);
  }, [profile?.id, profile?.displayName, profile?.firstName, profile?.lastName]);

  const firma = profile?.firmaDataUrl || "";
  const nombreCompleto = `${nombres.trim()} ${apellidos.trim()}`.trim();
  const sinCambios =
    nombreCompleto === (profile?.displayName || "").trim() || !nombreCompleto;

  const guardarDatos = async () => {
    if (!nombres.trim()) return toast.error("Escribe tu nombre");
    setGuardandoDatos(true);
    try {
      await actualizarMiPerfil({
        firstName: nombres.trim(),
        lastName: apellidos.trim(),
        displayName: nombreCompleto,
      });
      toast.success("Datos actualizados");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudieron guardar los datos");
    } finally {
      setGuardandoDatos(false);
    }
  };

  const cambiarFoto = async (e) => {
    const archivo = e.target.files?.[0];
    // El input se limpia siempre: si no, volver a elegir la misma foto no
    // dispara el evento.
    e.target.value = "";
    if (!archivo) return;
    if (!archivo.type?.startsWith("image/")) return toast.error("Elige una imagen");

    setSubiendoFoto(true);
    try {
      const { url, publicId } = await subirFotoPerfil(user.uid, archivo);
      await actualizarMiPerfil({ fotoURL: url, fotoPath: publicId });
      toast.success("Foto actualizada");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo subir la foto");
    } finally {
      setSubiendoFoto(false);
    }
  };

  // Quita la foto del perfil. El archivo sigue en Cloudinary —no se puede
  // borrar sin firma— pero deja de mostrarse en toda la app.
  const quitarFoto = async () => {
    setSubiendoFoto(true);
    try {
      await actualizarMiPerfil({ fotoURL: "", fotoPath: "" });
      toast.success("Foto quitada");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo quitar la foto");
    } finally {
      setSubiendoFoto(false);
    }
  };

  const guardarFirma = async (dataUrl) => {
    setGuardandoFirma(true);
    try {
      await actualizarMiPerfil({ firmaDataUrl: dataUrl });
      setAbrirPad(false);
      toast.success("Firma guardada");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo guardar la firma");
    } finally {
      setGuardandoFirma(false);
    }
  };

  const quitarFirma = async () => {
    setGuardandoFirma(true);
    try {
      await actualizarMiPerfil({ firmaDataUrl: "" });
      toast.success("Firma eliminada");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo eliminar la firma");
    } finally {
      setGuardandoFirma(false);
    }
  };

  const guardarPassword = async () => {
    const { actual, nueva, confirmar } = passwords;
    if (!actual) return toast.error("Escribe tu contraseña actual");
    if (nueva.length < MIN_PASSWORD) {
      return toast.error(`La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
    }
    if (nueva !== confirmar) return toast.error("Las contraseñas nuevas no coinciden");
    if (nueva === actual) return toast.error("La nueva contraseña debe ser distinta de la actual");

    setCambiando(true);
    try {
      await cambiarPassword(actual, nueva);
      setPasswords({ actual: "", nueva: "", confirmar: "" });
      toast.success("Contraseña actualizada");
    } catch (e) {
      console.error(e);
      toast.error(authErrorMsg(e?.code));
    } finally {
      setCambiando(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-3 py-4 space-y-4">
      <h1 className="text-lg font-semibold">Mi perfil</h1>

      {/* ─── Foto y nombre ─────────────────────────────────────────────── */}
      <section className={cardCls}>
        <div className={tituloCls}><FaUser className="text-gray-400" /> Datos personales</div>

        <div className="flex items-center gap-4">
          <AvatarPerfil perfil={profile} email={user?.email} size={72} />
          <div className="flex-1 min-w-0 space-y-2">
            <input ref={archivoRef} type="file" accept="image/*" onChange={cambiarFoto} className="hidden" />
            <button
              type="button"
              onClick={() => archivoRef.current?.click()}
              disabled={subiendoFoto}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-xs font-medium disabled:opacity-50"
            >
              <FaCamera className="text-[11px]" />
              {subiendoFoto ? "Subiendo…" : profile?.fotoURL ? "Cambiar foto" : "Subir foto"}
            </button>
            {profile?.fotoURL && (
              <button
                type="button"
                onClick={quitarFoto}
                disabled={subiendoFoto}
                className="ml-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 disabled:opacity-50"
              >
                <FaTrash className="text-[10px]" /> Quitar
              </button>
            )}
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Se reduce antes de subirla; puedes tomarla con la cámara.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nombres *</label>
            <input value={nombres} onChange={(e) => setNombres(e.target.value)}
              disabled={guardandoDatos} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Apellidos</label>
            <input value={apellidos} onChange={(e) => setApellidos(e.target.value)}
              disabled={guardandoDatos} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Correo</label>
          <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gris-700 bg-gray-100 dark:bg-gris-700/50 text-sm text-gray-600 dark:text-gray-300">
            <FaLock className="text-[11px] shrink-0 opacity-60" />
            <span className="truncate">{user?.email || "—"}</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            El correo es tu usuario de acceso y solo lo cambia un administrador.
          </div>
        </div>

        {roles.length > 0 && (
          <div>
            <span className={labelCls}>Permisos</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {roles.map((rol) => (
                <span key={rol} className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gris-700 text-[11px] capitalize">
                  {rol}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={guardarDatos}
          disabled={guardandoDatos || sinCambios}
          className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold"
        >
          {guardandoDatos ? "Guardando…" : "Guardar datos"}
        </button>
      </section>

      {/* ─── Firma ─────────────────────────────────────────────────────── */}
      <section className={cardCls}>
        <div>
          <div className={tituloCls}><FaSignature className="text-gray-400" /> Mi firma</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Se imprime en el pie de las fichas que firmes, sobre la línea de tu nombre.
          </p>
        </div>

        {firma ? (
          <div className="rounded-xl border border-gray-200 dark:border-gris-700 bg-white p-3 flex items-center justify-center">
            <img src={firma} alt="Mi firma" className="max-h-24 w-auto object-contain" />
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gris-600 py-8 text-center text-xs text-gray-500 dark:text-gray-400">
            Todavía no has dibujado tu firma
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAbrirPad(true)}
            disabled={guardandoFirma}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold"
          >
            <FaPen className="text-xs" /> {firma ? "Dibujar de nuevo" : "Dibujar firma"}
          </button>
          {firma && (
            <button
              type="button"
              onClick={quitarFirma}
              disabled={guardandoFirma}
              className="px-3 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-sm text-red-600 dark:text-red-400 disabled:opacity-50"
              title="Eliminar mi firma"
            >
              <FaTrash className="text-xs" />
            </button>
          )}
        </div>

        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Las fichas que ya firmaste conservan la firma con la que se cerraron: cambiarla
          aquí solo aplica de ahora en adelante.
        </p>
      </section>

      {/* ─── Contraseña ────────────────────────────────────────────────── */}
      <section className={cardCls}>
        <div className={tituloCls}><FaKey className="text-gray-400" /> Cambiar contraseña</div>

        <div>
          <label className={labelCls}>Contraseña actual *</label>
          <input
            type="password"
            autoComplete="current-password"
            value={passwords.actual}
            onChange={(e) => setPasswords((p) => ({ ...p, actual: e.target.value }))}
            disabled={cambiando}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Nueva contraseña *</label>
          <input
            type="password"
            autoComplete="new-password"
            value={passwords.nueva}
            onChange={(e) => setPasswords((p) => ({ ...p, nueva: e.target.value }))}
            disabled={cambiando}
            className={inputCls}
          />
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Mínimo {MIN_PASSWORD} caracteres.
          </div>
        </div>
        <div>
          <label className={labelCls}>Repetir nueva contraseña *</label>
          <input
            type="password"
            autoComplete="new-password"
            value={passwords.confirmar}
            onChange={(e) => setPasswords((p) => ({ ...p, confirmar: e.target.value }))}
            disabled={cambiando}
            className={inputCls}
          />
        </div>

        <button
          type="button"
          onClick={guardarPassword}
          disabled={cambiando || !passwords.actual || !passwords.nueva || !passwords.confirmar}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-800 dark:bg-gris-600 hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold"
        >
          <FaCheck className="text-xs" /> {cambiando ? "Cambiando…" : "Cambiar contraseña"}
        </button>
      </section>

      {abrirPad && (
        <FirmaPad
          firmaActual={firma}
          guardando={guardandoFirma}
          onGuardar={guardarFirma}
          onClose={() => setAbrirPad(false)}
        />
      )}
    </div>
  );
}
