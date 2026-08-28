import React from "react";
import toast from "react-hot-toast";
import { cambiarEstadoFicha, agregarNotaFicha, getFichaTipoConfig } from "../../utils/firebaseFichas";
import { ESTADO_LABEL, ESTADO_REQUIERE_ENTREGA, normalizarEstado } from "./estadoFicha";
import { firmaDeEtapa } from "../../utils/firmasFicha";
import { codigoFicha as codigoDeFicha } from "../../utils/codigoFicha";
import { crearNotificacionFichaEnProduccion } from "../../utils/firebaseNotificaciones";
import { useAuth } from "../../context/AuthContext";
import EntregaModal from "./EntregaModal";
import FirmaModal from "./FirmaModal";

// Cambios de estado y notas de una lista de fichas ya cargada en memoria.
// Las líneas de producto hacían exactamente lo mismo copiado una vez por
// producto; aquí vive una sola versión, y de paso todas heredan el historial de
// notas, las firmas y la entrega.
//
// `setFichas` recibe el setState de la lista: la ficha se actualiza en memoria
// para no recargar la colección entera tras cada cambio.
//
// Devuelve también `modales`, que hay que pintar en el árbol: los dos cambios
// de estado que cierran la ficha no son un clic a secas, exigen firma —
// "terminada" pide quién alistó y empacó, "entregada" quién revisó y aprobó
// más los datos del despacho— y esos formularios se abren desde aquí venga de
// donde venga el cambio.
//
// `tipo` puede venir null: es el caso del listado de órdenes, que mezcla las
// seis colecciones y donde cada ficha trae el suyo en `ficha.tipo`. Las
// pestañas de producto sí lo pasan fijo, porque sus fichas no lo llevan encima.
export default function useEstadoFicha(tipo, fichas, setFichas) {
  const { user, profile } = useAuth();
  const [firmaAbierta, setFirmaAbierta] = React.useState(null);
  const [entregaAbierta, setEntregaAbierta] = React.useState(null);

  const tipoDe = React.useCallback((ficha) => tipo || ficha?.tipo, [tipo]);

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
    if (!ficha) return false;
    const tipoFicha = tipoDe(ficha);

    if (estado === "terminado") {
      setFirmaAbierta({ ficha, notaInicial: nota || "" });
      return true;
    }

    if (estado === ESTADO_REQUIERE_ENTREGA) {
      // No se puede cerrar lo que nunca se alistó: si la ficha llega aquí sin
      // esa firma (por saltarse "terminada"), se pide primero y la entrega
      // queda encolada detrás.
      if (!firmaDeEtapa(ficha, "alistado")) {
        setFirmaAbierta({ ficha, notaInicial: "", entregaDespues: nota || "" });
      } else {
        setEntregaAbierta({ ficha, notaInicial: nota || "" });
      }
      return true;
    }

    try {
      const entrada = await cambiarEstadoFicha(tipoFicha, id, {
        estado,
        estadoAnterior,
        nota,
        ...autor,
      });
      toast.success(`Estado → ${ESTADO_LABEL[estado] || estado}`);
      anexarNota(id, entrada, { estado });
      if (estado === "en_produccion") {
        crearNotificacionFichaEnProduccion({
          fichaTipo: tipoFicha,
          tipoLabel: getFichaTipoConfig(tipoFicha).label,
          fichaId: id,
          cliente: ficha?.cliente,
          ordenProduccion: ficha?.ordenProduccion,
          codigoFicha: codigoDeFicha(ficha, tipoFicha),
        }).catch((e) => console.error(e));
      }
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Error actualizando estado");
      return false;
    }
  }, [fichas, tipoDe, autor, anexarNota]);

  // Lanza el error hacia arriba a propósito: el cuadro de texto necesita saber
  // si falló para no borrar lo que el usuario escribió.
  const agregarNota = React.useCallback(async (id, texto) => {
    const ficha = fichas.find((x) => x.id === id);
    const entrada = await agregarNotaFicha(tipoDe(ficha), id, { texto, ...autor });
    anexarNota(id, entrada);
    toast.success("Nota agregada");
  }, [fichas, tipoDe, autor, anexarNota]);

  // Reabre el formulario de entrega sobre una ficha ya entregada, para corregir
  // placas o sumar fotos que faltaron.
  const editarEntrega = React.useCallback((id) => {
    const ficha = fichas.find((x) => x.id === id);
    if (ficha) setEntregaAbierta({ ficha, notaInicial: "" });
  }, [fichas]);

  // Corrección de una firma ya guardada — solo la ofrece el escritorio a
  // producción/admin. La del alistado tiene formulario propio; la de revisión
  // vive con los datos de la entrega, así que reabre ese.
  const editarFirma = React.useCallback((id, etapa) => {
    const ficha = fichas.find((x) => x.id === id);
    if (!ficha) return;
    if (etapa === "alistado") setFirmaAbierta({ ficha, notaInicial: "" });
    else setEntregaAbierta({ ficha, notaInicial: "" });
  }, [fichas]);

  const modales = (
    <>
      {firmaAbierta && (
        <FirmaModal
          tipo={tipoDe(firmaAbierta.ficha)}
          ficha={firmaAbierta.ficha}
          notaInicial={firmaAbierta.notaInicial}
          onClose={() => setFirmaAbierta(null)}
          onDone={({ firma, nota }) => {
            const { ficha, entregaDespues } = firmaAbierta;
            const firmas = { ...(ficha.firmas || {}), alistado: firma };
            const estado = ficha.estado === "entregado" ? ficha.estado : "terminado";
            anexarNota(ficha.id, nota, { estado, firmas });
            setFirmaAbierta(null);
            // Venía de un salto directo a "entregada": sigue el formulario de
            // entrega sobre la ficha ya firmada.
            if (entregaDespues != null) {
              setEntregaAbierta({
                ficha: { ...ficha, estado, firmas },
                notaInicial: entregaDespues,
              });
            }
          }}
        />
      )}

      {entregaAbierta && (
        <EntregaModal
          tipo={tipoDe(entregaAbierta.ficha)}
          ficha={entregaAbierta.ficha}
          notaInicial={entregaAbierta.notaInicial}
          onClose={() => setEntregaAbierta(null)}
          onDone={({ entrega, firma, nota }) => {
            const { ficha } = entregaAbierta;
            anexarNota(ficha.id, nota, {
              estado: "entregado",
              entrega,
              firmas: { ...(ficha.firmas || {}), revisado: firma },
            });
            setEntregaAbierta(null);
          }}
        />
      )}
    </>
  );

  return { cambiarEstado, agregarNota, editarEntrega, editarFirma, modales };
}
