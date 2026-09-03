import React from "react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import {
  BASES_RETENCION,
  IVA_POR_DEFECTO,
  PLAZO_POR_DEFECTO,
} from "../../modules/contabilidad/catalogos";
import { guardarBancos, guardarRetenciones } from "../../utils/firebaseContabilidad";
import { Campo, Casilla, Input, InputNumero, Seccion, Select } from "./ui";
import { valorNumerico, numeroODefecto } from "../../utils/campoNumero";

const codigoDesde = (nombre) =>
  String(nombre || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

/**
 * Tarifas y bancos.
 *
 * En el Excel el 19 % del IVA y el 2,5 % de la retención vivían dentro de las
 * fórmulas de 338 filas: cambiar una tarifa era rehacer la hoja. Aquí son
 * datos, y las facturas ya guardadas conservan el valor con el que se
 * liquidaron —cambiar una tarifa no reescribe el pasado—.
 */
/**
 * Campo con su nombre encima mientras la cabecera de columnas no esté (ver la
 * rejilla de retenciones: en escritorio rotula una vez arriba, en el teléfono
 * se oculta y los controles se quedaban sin decir qué son).
 */
function Rotulo({ texto, children, className = "" }) {
  return (
    <div className={`grid gap-1 min-w-0 ${className}`}>
      <span className="md:hidden text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {texto}
      </span>
      {children}
    </div>
  );
}

export default function ConfiguracionTab({ config, onGuardado }) {
  const [retenciones, setRetenciones] = React.useState([]);
  const [bancos, setBancos] = React.useState([]);
  const [iva, setIva] = React.useState(IVA_POR_DEFECTO);
  const [plazo, setPlazo] = React.useState(PLAZO_POR_DEFECTO);
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    if (!config) return;
    setRetenciones(config.retenciones.map((r) => ({ ...r })));
    setBancos(config.bancos.map((b) => ({ ...b })));
    setIva(config.ivaPorDefecto);
    setPlazo(config.plazoPorDefecto);
  }, [config]);

  const cambiarRet = (idx, campo, valor) =>
    setRetenciones((p) => p.map((r, i) => (i === idx ? { ...r, [campo]: valor } : r)));

  const agregarRet = () =>
    setRetenciones((p) => [...p, { codigo: "", nombre: "", base: "subtotal", porcentaje: 0, activa: true }]);

  const quitarRet = (idx) => setRetenciones((p) => p.filter((_, i) => i !== idx));

  const cambiarBanco = (idx, campo, valor) =>
    setBancos((p) => p.map((b, i) => (i === idx ? { ...b, [campo]: valor } : b)));

  const agregarBanco = () => setBancos((p) => [...p, { codigo: "", nombre: "", activo: true }]);
  const quitarBanco = (idx) => setBancos((p) => p.filter((_, i) => i !== idx));

  const guardar = async () => {
    const sinNombre = retenciones.find((r) => !String(r.nombre).trim());
    if (sinNombre) { toast.error("Cada retención necesita un nombre."); return; }

    setGuardando(true);
    try {
      await Promise.all([
        guardarRetenciones(
          // Un campo que se dejó en blanco vale 0: se guarda número, nunca "".
          retenciones.map((r) => ({
            ...r,
            codigo: r.codigo || codigoDesde(r.nombre),
            porcentaje: numeroODefecto(r.porcentaje, 0),
          })),
          { ivaPorDefecto: numeroODefecto(iva, 0), plazoPorDefecto: numeroODefecto(plazo, 0) }
        ),
        guardarBancos(bancos.map((b) => ({ ...b, codigo: b.codigo || codigoDesde(b.nombre) }))),
      ]);
      toast.success("Configuración guardada.");
      onGuardado?.();
    } catch (e) {
      console.error("No se pudo guardar la configuración", e);
      toast.error("No se pudo guardar la configuración.");
    } finally {
      setGuardando(false);
    }
  };

  if (!config) return <EmptyState icon="⏳" title="Cargando configuración…" />;

  return (
    <section className="grid gap-4 max-w-4xl">
      <Seccion
        titulo="Valores por defecto de una factura nueva"
        descripcion="Cambiarlos no reescribe el pasado: cada documento guarda el valor con el que se liquidó."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Campo label="IVA (%)">
            <InputNumero min={0} step="0.01" value={iva} onChange={(e) => setIva(valorNumerico(e.target.value))} placeholder="0" />
          </Campo>
          <Campo label="Plazo de pago (días)">
            <InputNumero
              min={0}
              value={plazo}
              onChange={(e) => setPlazo(valorNumerico(e.target.value))}
              placeholder="0"
            />
          </Campo>
        </div>
      </Seccion>

      <Seccion
        titulo="Retenciones"
        descripcion="«Valor digitado» es para las que no salen de un porcentaje fijo, como el ICA de cada municipio."
        acciones={<Button size="sm" variant="secondary" onClick={agregarRet}>+ Retención</Button>}
      >
        <div className="grid gap-2">
          <div className="hidden md:grid grid-cols-[2fr_1.2fr_0.8fr_auto_auto] gap-2 px-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <span>Nombre</span>
            <span>Se calcula</span>
            <span className="text-right">Porcentaje</span>
            <span>Activa</span>
            <span className="w-8" />
          </div>
          {retenciones.map((ret, idx) => (
            <div
              key={idx}
              className="grid grid-cols-2 md:grid-cols-[2fr_1.2fr_0.8fr_auto_auto] gap-2 md:items-center rounded-lg border border-gray-200 dark:border-gris-700 md:border-0 bg-gray-50 dark:bg-gris-900/40 md:bg-transparent md:dark:bg-transparent p-2.5 md:p-0"
            >
              {/* En el teléfono no hay cabecera de columnas que rotule, así que
                  cada campo lleva su nombre y el quitar deja de ser un aspa de
                  ocho píxeles perdida al final de la fila. */}
              <div className="col-span-2 flex items-center justify-between md:hidden">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Retención {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => quitarRet(idx)}
                  className="text-xs font-medium text-red-600 dark:text-red-400 px-2 py-1 -mr-1"
                >
                  Quitar
                </button>
              </div>

              <Rotulo texto="Nombre" className="col-span-2 md:col-span-1">
                <Input
                  value={ret.nombre}
                  onChange={(e) => cambiarRet(idx, "nombre", e.target.value)}
                  placeholder="Nombre de la retención"
                  aria-label={`Nombre de la retención ${idx + 1}`}
                />
              </Rotulo>
              <Rotulo texto="Se calcula">
                <Select
                  value={ret.base}
                  onChange={(e) => cambiarRet(idx, "base", e.target.value)}
                  aria-label={`Base de ${ret.nombre || `la retención ${idx + 1}`}`}
                >
                  {BASES_RETENCION.map((b) => <option key={b.valor} value={b.valor}>{b.label}</option>)}
                </Select>
              </Rotulo>
              <Rotulo texto="Porcentaje">
                <InputNumero
                  min={0}
                  step="0.01"
                  value={ret.porcentaje}
                  onChange={(e) => cambiarRet(idx, "porcentaje", valorNumerico(e.target.value))}
                  placeholder="0"
                  disabled={ret.base === "manual"}
                  aria-label={`Porcentaje de ${ret.nombre || `la retención ${idx + 1}`}`}
                />
              </Rotulo>
              <Casilla
                checked={ret.activa !== false}
                onChange={(e) => cambiarRet(idx, "activa", e.target.checked)}
                className="whitespace-nowrap col-span-2 md:col-span-1"
              >
                <span className="md:sr-only">Activa</span>
              </Casilla>
              <button
                type="button"
                onClick={() => quitarRet(idx)}
                aria-label={`Quitar ${ret.nombre || "retención"}`}
                className="hidden md:inline-flex h-9 w-8 items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-trafico/50"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion
        titulo="Bancos"
        descripcion="La lista que sale al registrar un abono."
        acciones={<Button size="sm" variant="secondary" onClick={agregarBanco}>+ Banco</Button>}
      >
        <div className="grid gap-2">
          {bancos.map((banco, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-x-2 gap-y-1 items-center">
              <Input
                value={banco.nombre}
                onChange={(e) => cambiarBanco(idx, "nombre", e.target.value)}
                placeholder="Nombre del banco"
                aria-label={`Nombre del banco ${idx + 1}`}
              />
              <button
                type="button"
                onClick={() => quitarBanco(idx)}
                aria-label={`Quitar ${banco.nombre || "banco"}`}
                className="h-11 w-11 sm:h-9 sm:w-8 sm:order-last inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-trafico/50"
              >
                ✕
              </button>
              <Casilla
                checked={banco.activo !== false}
                onChange={(e) => cambiarBanco(idx, "activo", e.target.checked)}
                className="whitespace-nowrap col-span-2 sm:col-span-1"
              >
                Activo
              </Casilla>
            </div>
          ))}
        </div>
      </Seccion>

      <div className="flex justify-end">
        <Button variant="primary" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar configuración"}
        </Button>
      </div>
    </section>
  );
}
