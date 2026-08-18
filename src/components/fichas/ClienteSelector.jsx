import React from "react";
import toast from "react-hot-toast";
import { FaCheckCircle, FaExclamationTriangle, FaPlus, FaTimes } from "react-icons/fa";
import Combobox from "../ui/Combobox";
import { useQuote } from "../../context/QuoteContext";
import { listarEmpresas, crearEmpresa } from "../../utils/firebaseCompanies";
import {
  clienteDesdeEmpresa,
  clienteSinVincular,
  buscarEmpresaPorNombre,
} from "../../utils/clienteVinculo";

// Selector de cliente de la ficha. Escoge sobre `empresas`, la misma base que
// usa el cotizador, para que ficha y cotización queden colgando del mismo
// cliente (ver utils/clienteVinculo.js).
//
// El campo sigue siendo de texto libre: una ficha urgente no se puede quedar
// esperando a que alguien dé de alta la empresa. Lo que hace el selector es que
// el camino corto sea el correcto — si lo escrito corresponde a una empresa
// existente la vincula sola, y si no, ofrece crearla ahí mismo.
export default function ClienteSelector({
  value = {},
  onChange,
  inputCls = "",
  labelCls = "",
  className = "",
  label = "Cliente",
}) {
  const { empresas, setEmpresas } = useQuote();
  const [cargando, setCargando] = React.useState(false);
  const [creando, setCreando] = React.useState(false);

  const lista = React.useMemo(() => empresas || [], [empresas]);
  const nombre = value.cliente || "";
  const vinculado = Boolean(value.clienteId);

  // La caché de empresas vive en el contexto y la comparten cotizador y fichas;
  // solo se pide a la red la primera vez que alguien la necesita.
  React.useEffect(() => {
    if (lista.length > 0 || cargando) return;
    let vigente = true;
    setCargando(true);
    listarEmpresas()
      .then((datos) => { if (vigente) setEmpresas(datos); })
      .catch((e) => { console.error(e); toast.error("No se pudo cargar la lista de clientes"); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opciones = React.useMemo(
    () => lista.map((em) => ({
      id: em.id,
      label: em.nombre || "",
      sublabel: [em.nit, em.ciudad].filter(Boolean).join(" · "),
      data: em,
    })),
    [lista]
  );

  // Al teclear se busca la empresa que corresponde exactamente al nombre (sin
  // tildes ni puntuación). Si aparece una sola, queda vinculada sin que el
  // usuario tenga que abrir la lista; si no, el nombre queda suelto.
  const handleTexto = (texto) => {
    const empresa = buscarEmpresaPorNombre(texto, lista);
    onChange(empresa ? clienteDesdeEmpresa(empresa) : clienteSinVincular(texto));
  };

  const handleElegir = (opcion) => onChange(clienteDesdeEmpresa(opcion.data));

  // Desvincular deja el nombre escrito: sirve cuando la ficha es para un
  // cliente distinto que se llama parecido.
  const handleDesvincular = () => onChange(clienteSinVincular(nombre));

  const handleCrear = async () => {
    const limpio = nombre.trim();
    if (!limpio) return;
    setCreando(true);
    try {
      const id = await crearEmpresa({ nombre: limpio, nit: "", ciudad: "" });
      const datos = await listarEmpresas();
      setEmpresas(datos);
      const empresa = datos.find((e) => e.id === id) || { id, nombre: limpio, nit: "", ciudad: "" };
      onChange(clienteDesdeEmpresa(empresa));
      toast.success("Cliente creado y vinculado");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo crear el cliente");
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      <Combobox
        value={nombre}
        onChange={handleTexto}
        onSelect={handleElegir}
        options={opciones}
        placeholder={cargando ? "Cargando clientes…" : "Nombre del cliente"}
        inputClassName={inputCls}
        emptyText="Ningún cliente con ese nombre"
      />

      {vinculado ? (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-green-700 dark:text-green-400">
          <FaCheckCircle className="shrink-0" />
          <span className="truncate">
            Cliente de la base
            {[value.clienteNit, value.clienteCiudad].filter(Boolean).length > 0 &&
              ` · ${[value.clienteNit, value.clienteCiudad].filter(Boolean).join(" · ")}`}
          </span>
          <button
            type="button"
            onClick={handleDesvincular}
            className="ml-auto shrink-0 flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            title="Desvincular: deja el nombre escrito pero sin cliente de la base"
          >
            <FaTimes /> Desvincular
          </button>
        </div>
      ) : nombre.trim() ? (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          <FaExclamationTriangle className="shrink-0" />
          <span className="truncate">Sin vincular: no está en la base de clientes</span>
          <button
            type="button"
            onClick={handleCrear}
            disabled={creando}
            className="ml-auto shrink-0 flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 disabled:opacity-60"
          >
            <FaPlus /> {creando ? "Creando…" : "Crear cliente"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
