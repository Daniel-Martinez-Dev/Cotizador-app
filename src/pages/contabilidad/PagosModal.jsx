import React from "react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { formatCOP } from "../inventario/inventarioUtils";
import { Campo, Input, InputNumero, KPI, Modal, Money, Seccion, Select, Tabla, Td, Th, Tr } from "./ui";
import { BANCOS_POR_DEFECTO, DESTINO_DOCUMENTO, etiquetaEstado, tonoEstado } from "../../modules/contabilidad/catalogos";
import { aNumero, estaSaldado, hoyISO, netoDocumento, redondear } from "../../modules/contabilidad/calculos";
import {
  actualizarPago,
  eliminarPago,
  listarPagosDeDocumento,
  registrarPago,
} from "../../utils/firebaseContabilidad";

const formVacio = () => ({ fecha: hoyISO(), valor: "", bancoCodigo: "", bancoNombre: "", referencia: "", observaciones: "" });

// Lo que un abono le aplicó a este documento. No es su valor: una transferencia
// puede cubrir varias facturas, y aquí solo interesa la parte de esta.
const aplicadoAqui = (pago, documentoId) =>
  redondear((pago.aplicaciones || [])
    .filter((a) => a.id === documentoId && (a.tipo || DESTINO_DOCUMENTO) === DESTINO_DOCUMENTO)
    .reduce((acc, a) => acc + aNumero(a.valor), 0));

// Otros destinos del mismo abono, para poder decir de dónde viene.
const otrosDestinos = (pago, documentoId) =>
  (pago.aplicaciones || []).filter((a) => a.id !== documentoId).length;

/**
 * Abonos de un documento. Aquí es donde se rompe el techo de tres pagos del
 * Excel: se agregan los que hagan falta, y el saldo se recalcula solo.
 */
export default function PagosModal({ documento, config, onCerrar, onCambio }) {
  const [pagos, setPagos] = React.useState([]);
  const [cargando, setCargando] = React.useState(true);
  const [form, setForm] = React.useState(formVacio);
  const [editando, setEditando] = React.useState(null);
  const [guardando, setGuardando] = React.useState(false);

  const bancos = (config?.bancos?.length ? config.bancos : BANCOS_POR_DEFECTO).filter((b) => b.activo !== false);

  const cargar = React.useCallback(async () => {
    setCargando(true);
    try {
      setPagos(await listarPagosDeDocumento(documento.id));
    } catch (e) {
      console.error("No se pudieron cargar los abonos", e);
      toast.error("No se pudieron cargar los abonos.");
    } finally {
      setCargando(false);
    }
  }, [documento.id]);

  React.useEffect(() => { cargar(); }, [cargar]);

  const neto = netoDocumento(documento);
  const abonado = redondear(pagos.reduce((acc, p) => acc + aplicadoAqui(p, documento.id), 0));
  // Las notas crédito aplicadas ya vienen descontadas en el resumen que calculó
  // la sección; aquí solo se vuelve a restar lo que cambió en este modal.
  const acreditado = documento.resumen?.acreditado || 0;
  const saldo = redondear(neto - abonado - acreditado);

  const editar = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));

  const elegirBanco = (codigo) => {
    const banco = bancos.find((b) => b.codigo === codigo);
    setForm((p) => ({ ...p, bancoCodigo: codigo, bancoNombre: banco?.nombre || "" }));
  };

  const empezarEdicion = (pago) => {
    setEditando(pago);
    setForm({
      fecha: pago.fecha || hoyISO(),
      // Se edita lo aplicado a esta factura, no el valor total del abono.
      valor: aplicadoAqui(pago, documento.id),
      bancoCodigo: pago.bancoCodigo || "",
      bancoNombre: pago.bancoNombre || "",
      referencia: pago.referencia || "",
      observaciones: pago.observaciones || "",
    });
  };

  const cancelarEdicion = () => { setEditando(null); setForm(formVacio()); };

  const guardar = async (e) => {
    e.preventDefault();
    const valor = aNumero(form.valor);
    if (valor <= 0) { toast.error("El abono debe ser mayor que cero."); return; }
    if (!form.fecha) { toast.error("Falta la fecha del abono."); return; }

    setGuardando(true);
    try {
      if (editando) {
        // Solo se toca la aplicación de esta factura: las demás son plata que
        // el mismo abono está cubriendo en otras, y reescribirlas de aquí las
        // borraría sin que nadie lo pida.
        const otras = (editando.aplicaciones || []).filter(
          (a) => !(a.id === documento.id && (a.tipo || DESTINO_DOCUMENTO) === DESTINO_DOCUMENTO)
        );
        const aplicadoEnOtras = otras.reduce((acc, a) => acc + aNumero(a.valor), 0);
        await actualizarPago(editando.id, {
          ...editando,
          ...form,
          // El valor del abono crece o se encoge con lo que se aplique aquí.
          valor: redondear(Math.max(aNumero(editando.valor), aplicadoEnOtras + valor)),
          aplicaciones: [...otras, { tipo: DESTINO_DOCUMENTO, id: documento.id, valor }],
        });
        toast.success("Abono actualizado.");
      } else {
        await registrarPago({
          ...form,
          valor,
          empresaId: documento.empresaId,
          clienteNombre: documento.clienteNombre,
          periodoContable: documento.periodoContable,
          // Registrado desde una factura: todo el abono va a ella.
          aplicaciones: [{ tipo: DESTINO_DOCUMENTO, id: documento.id, valor }],
        }, documento);
        toast.success("Abono registrado.");
      }
      cancelarEdicion();
      await cargar();
      onCambio?.();
    } catch (err) {
      console.error("No se pudo guardar el abono", err);
      toast.error("No se pudo guardar el abono.");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (pago) => {
    try {
      const otras = (pago.aplicaciones || []).filter(
        (a) => !(a.id === documento.id && (a.tipo || DESTINO_DOCUMENTO) === DESTINO_DOCUMENTO)
      );
      if (otras.length) {
        // El abono cubre otras facturas: se le quita solo esta aplicación.
        await actualizarPago(pago.id, { ...pago, aplicaciones: otras });
        toast.success("El abono se desaplicó de esta factura.");
      } else {
        await eliminarPago(pago.id);
        toast.success("Abono eliminado.");
      }
      if (editando?.id === pago.id) cancelarEdicion();
      await cargar();
      onCambio?.();
    } catch (e) {
      console.error("No se pudo eliminar el abono", e);
      toast.error("No se pudo eliminar el abono.");
    }
  };

  return (
    <Modal
      titulo={`Abonos de ${documento.numero || "documento sin número"}`}
      subtitulo={`${documento.clienteNombre || "sin cliente"} · ${documento.fecha || "sin fecha"}`}
      insignia={estaSaldado(saldo) ? <Badge tone={tonoEstado("pagada")}>{etiquetaEstado("pagada")}</Badge> : null}
      ancho="max-w-4xl"
      onCerrar={onCerrar}
      pie={<Button variant="secondary" onClick={onCerrar}>Cerrar</Button>}
    >
      <div className="grid gap-4">
        <div className={`grid grid-cols-2 ${acreditado > 0 ? "md:grid-cols-4" : "md:grid-cols-3"} gap-2`}>
          <KPI titulo="Neto" valor={<Money valor={neto} cero="0" />} compacto />
          <KPI titulo="Abonado" valor={<Money valor={abonado} cero="0" />} tono="bueno" compacto />
          {acreditado > 0 && <KPI titulo="Notas crédito" valor={<Money valor={acreditado} />} compacto />}
          <KPI
            titulo="Saldo"
            valor={<Money valor={saldo} cero="0" />}
            tono={estaSaldado(saldo) ? "bueno" : "aviso"}
            compacto
          />
        </div>

        <Seccion
          titulo={editando ? "Editar abono" : "Registrar abono"}
          descripcion={
            editando
              ? "Se cambia solo lo aplicado a esta factura; lo que este abono cubre en otras se conserva."
              : "Sin tope de tres pagos: se agregan los que hagan falta."
          }
          acciones={
            !editando && saldo > 0 ? (
              <Button size="sm" variant="secondary" onClick={() => editar("valor", saldo)}>
                Abonar el saldo ({formatCOP(saldo)})
              </Button>
            ) : null
          }
        >
          <form onSubmit={guardar} className="grid gap-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Campo label="Fecha">
                <Input type="date" value={form.fecha} onChange={(e) => editar("fecha", e.target.value)} />
              </Campo>
              <Campo label="Valor">
                <InputNumero
                  step="0.01"
                  min="0"
                  value={form.valor}
                  onChange={(e) => editar("valor", e.target.value)}
                  placeholder="0"
                />
              </Campo>
              <Campo label="Banco">
                <Select value={form.bancoCodigo} onChange={(e) => elegirBanco(e.target.value)}>
                  <option value="">(sin banco)</option>
                  {bancos.map((b) => <option key={b.codigo} value={b.codigo}>{b.nombre}</option>)}
                </Select>
              </Campo>
              <Campo label="Referencia">
                <Input value={form.referencia} onChange={(e) => editar("referencia", e.target.value)} placeholder="Comprobante" />
              </Campo>
              <Campo label="Observaciones">
                <Input value={form.observaciones} onChange={(e) => editar("observaciones", e.target.value)} />
              </Campo>
            </div>
            <div className="flex justify-end gap-2">
              {editando && <Button variant="secondary" onClick={cancelarEdicion}>Cancelar edición</Button>}
              <Button type="submit" variant="primary" disabled={guardando}>
                {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Agregar abono"}
              </Button>
            </div>
          </form>
        </Seccion>

        {cargando ? (
          <EmptyState icon="⏳" title="Cargando abonos…" />
        ) : !pagos.length ? (
          <EmptyState icon="💵" title="Sin abonos" description="Esta factura no tiene ningún pago registrado." />
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Fecha</Th>
                <Th align="right">Aplicado aquí</Th>
                <Th>Banco</Th>
                <Th>Referencia</Th>
                <Th>Observaciones</Th>
                <Th align="right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((pago, idx) => {
                const otras = otrosDestinos(pago, documento.id);
                return (
                  <Tr key={pago.id} className={editando?.id === pago.id ? "bg-amber-50 dark:bg-amber-900/20" : ""}>
                    <Td className="text-gray-400">{idx + 1}</Td>
                    <Td className="whitespace-nowrap">{pago.fecha || "—"}</Td>
                    <Td align="right">
                      <Money valor={aplicadoAqui(pago, documento.id)} fuerte />
                      {otras > 0 && (
                        <div className="text-[10px] font-normal text-blue-600 dark:text-blue-400">
                          de {formatCOP(pago.valor)} · cubre {otras + 1} documentos
                        </div>
                      )}
                    </Td>
                    <Td>{pago.bancoNombre || "—"}</Td>
                    <Td>{pago.referencia || "—"}</Td>
                    <Td className="max-w-[20ch] truncate" title={pago.observaciones || ""}>{pago.observaciones || "—"}</Td>
                    <Td align="right">
                      <div className="flex gap-1.5 justify-end">
                        <Button size="sm" variant="secondary" onClick={() => empezarEdicion(pago)}>Editar</Button>
                        <Button size="sm" variant="danger" onClick={() => borrar(pago)}>
                          {otras > 0 ? "Desaplicar" : "Borrar"}
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Tabla>
        )}
      </div>
    </Modal>
  );
}
