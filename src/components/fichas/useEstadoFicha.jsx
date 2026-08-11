import React from "react";
import toast from "react-hot-toast";
import { cambiarEstadoFicha, agregarNotaFicha, getFichaTipoConfig } from "../../utils/firebaseFichas";
import { ESTADO_LABEL, ESTADO_REQUIERE_ENTREGA, normalizarEstado } from "./estadoFicha";
import { codigoFicha as codigoDeFicha } from "../../utils/codigoFicha";
import { crearNotificacionFichaEnProduccion } from "../../utils/firebaseNotificaciones";
import { useAuth } from "../../context/AuthContext";
import EntregaModal from "./EntregaModal";

// Cambios de estado y notas de una lista de fichas ya cargada en memoria.
// Las cinco líneas de producto (división, sello, abrigo, puerta rápida y ficha
// básica) hacían exactamente lo mismo copiado cinco veces; aquí vive una sola
// versión, y de paso todas heredan el historial de notas y la entrega.
//
// `setFichas` recibe el setState de la lista: la ficha se actualiza en memoria
// para no recargar la colección entera tras cada cambio.
//
// Devuelve también `entregaModal`, que hay que pintar en el árbol: pasar a
// "entregada" no es un cambio de estado a secas, exige capturar fecha, placas y
// fotos, y ese formulario se abre desde aquí venga de donde venga el cambio.
export default function useEstadoFicha(tipo, fichas, setFichas) {
  const { user, profile } = useAuth();
  const tipoLabel = getFichaTipoConfig(tipo).label;
  const [entregaAbierta, setEntregaAbierta] = React.useState(null);

  // Quién queda firmando la nota en el historial.
  const autor = React.useMemo(() => ({
    autorNombre: profile?.displayName || user?.displayName || user?.email || "",
    autorUid: user?.uid || "",
  }), [profile?.displayName, user?.displayName, user?.email, user?.uid]);

  // Añade la entrada al historial local de la ficha para que la línea de tiempo
  // aparezca al instante, sin esperar una recarga.
  const anexarNota = React.useCallback((id, nota, extra = {}) => {
    if (!nota) return;
    setFichas((prev) => prev.map((f) => (
      f.id === id ? { ...f, ...extra, notas: [...(f.notas || []), nota] } : f
    )));
  }, [setFichas]);

  // Devuelve si el cambio se guardó: quien lo llama desde un formulario (el
  // panel de confirmación con nota) solo se cierra cuando fue bien.
  const cambiarEstado = React.useCallback(async (id, estado, nota) => {
    const ficha = fichas.find((x) => x.id === id);
    const estadoAnterior = normalizarEstado(ficha?.estado);
    if (estadoAnterior === estado) return true;

    if (estado === ESTADO_REQUIERE_ENTREGA) {
      if (!ficha) return false;
      setEntregaAbierta({ ficha, notaInicial: nota || "" });
      return true;
    }

    try {
      const entrada = await cambiarEstadoFicha(tipo, id, {
        estado,
        estadoAnterior,
        nota,
        ...autor,
      });
      toast.success(`Estado → ${ESTADO_LABEL[estado] || estado}`);
      anexarNota(id, entrada, { estado });
      if (estado === "en_produccion") {
        crearNotificacionFichaEnProduccion({
          fichaTipo: tipo,
          tipoLabel,
          fichaId: id,
          cliente: ficha?.cliente,
          ordenProduccion: ficha?.ordenProduccion,
          codigoFicha: ficha ? codigoDeFicha(ficha, tipo) : "",
        }).catch((e) => console.error(e));
      }
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Error actualizando estado");
      return false;
    }
  }, [fichas, tipo, tipoLabel, autor, anexarNota]);

  // Lanza el error hacia arriba a propósito: el cuadro de texto necesita saber
  // si falló para no borrar lo que el usuario escribió.
  const agregarNota = React.useCallback(async (id, texto) => {
    const entrada = await agregarNotaFicha(tipo, id, { texto, ...autor });
    anexarNota(id, entrada);
    toast.success("Nota agregada");
  }, [tipo, autor, anexarNota]);

  // Reabre el formulario de entrega sobre una ficha ya entregada, para corregir
  // placas o sumar fotos que faltaron.
  const editarEntrega = React.useCallback((id) => {
    const ficha = fichas.find((x) => x.id === id);
    if (ficha) setEntregaAbierta({ ficha, notaInicial: "" });
  }, [fichas]);

  const entregaModal = entregaAbierta ? (
    <EntregaModal
      tipo={tipo}
      ficha={entregaAbierta.ficha}
      notaInicial={entregaAbierta.notaInicial}
      onClose={() => setEntregaAbierta(null)}
      onDone={({ entrega, nota }) => {
        anexarNota(entregaAbierta.ficha.id, nota, { estado: "entregado", entrega });
        setEntregaAbierta(null);
      }}
    />
  ) : null;

  return { cambiarEstado, agregarNota, editarEntrega, entregaModal };
}
