import React from "react";
import toast from "react-hot-toast";
import { FaCheckCircle, FaExclamationTriangle, FaPlus, FaTimes, FaLink } from "react-icons/fa";
import Combobox from "../ui/Combobox";
import { useQuote } from "../../context/QuoteContext";
import { listarEmpresas, resolverOCrearEmpresa } from "../../utils/firebaseCompanies";
import { resolverEmpresa, buscarPosiblesDuplicados } from "../../utils/empresaIdentidad";
import {
  clienteDesdeEmpresa,
  clienteSinVincular,
  aliasManual,
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
  const idAlias = React.useId();

  const lista = React.useMemo(() => empresas || [], [empresas]);
  const nombre = value.cliente || "";
  const alias = value.clienteAlias || "";
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

  // El alias entra en el sublabel para que el Combobox también busque por él:
  // quien conoce al cliente como "CI ANDINA" no debería tener que acordarse
  // del nombre legal completo.
  const opciones = React.useMemo(
    () => lista.map((em) => ({
      id: em.id,
      label: em.nombre || "",
      sublabel: [em.alias, em.nit, em.ciudad].filter(Boolean).join(" · "),
      data: em,
    })),
    [lista]
  );

  // Al teclear se busca la empresa que corresponde exactamente a lo escrito
  // —nombre o alias, sin tildes ni puntuación—. Si aparece una sola, queda
  // vinculada sin que el usuario tenga que abrir la lista; si hay dos que
  // normalizan igual no se adivina, porque colgar la ficha del cliente
  // equivocado es peor que dejarla suelta.
  const handleTexto = (texto) => {
    const { empresa, coincidencias } = resolverEmpresa({ nombre: texto }, lista);
    if (empresa && coincidencias === 1) onChange(clienteDesdeEmpresa(empresa, { usarAlias: value.usarAlias }));
    else onChange(aliasManual(clienteSinVincular(texto), alias));
  };

  const handleElegir = (opcion) => onChange(clienteDesdeEmpresa(opcion.data));

  // Desvincular deja el nombre escrito: sirve cuando la ficha es para un
  // cliente distinto que se llama parecido.
  const handleDesvincular = () => onChange(aliasManual(clienteSinVincular(nombre), alias));

  // Empresas parecidas que podrían ser la misma (mismo nombre salvo la forma
  // legal, o el mismo NIT sin dígito de verificación). Se ofrecen para
  // vincular antes de crear: es el momento en que nace el duplicado.
  const parecidas = React.useMemo(
    () => (vinculado || !nombre.trim() ? [] : buscarPosiblesDuplicados({ nombre, alias }, lista).slice(0, 3)),
    [vinculado, nombre, alias, lista]
  );

  const handleCrear = async () => {
    const limpio = nombre.trim();
    if (!limpio) return;
    setCreando(true);
    try {
      // Pasa por resolverOCrearEmpresa y no por crearEmpresa: si el cliente ya
      // existía con otra escritura, se reutiliza en vez de duplicarlo.
      const { empresa, creada } = await resolverOCrearEmpresa({ nombre: limpio, alias }, { empresas: lista });
      const datos = await listarEmpresas();
      setEmpresas(datos);
      const actual = datos.find((e) => e.id === empresa.id) || empresa;
      onChange(clienteDesdeEmpresa(actual, { usarAlias: value.usarAlias }));
      toast.success(creada ? "Cliente creado y vinculado" : `Ya existía como "${actual.nombre}": se vinculó a ese`);
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
        placeholder={cargando ? "Cargando clientes…" : "Nombre o alias del cliente"}
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

      {parecidas.map(({ empresa, motivo }) => (
        <div key={empresa.id} className="mt-1 flex items-center gap-1.5 text-[11px] text-blue-700 dark:text-blue-400">
          <FaLink className="shrink-0" />
          <span className="truncate">
            ¿Es «{empresa.nombre}»? {motivo === "nit" ? "Mismo NIT" : "Mismo nombre sin la forma legal"}
          </span>
          <button
            type="button"
            onClick={() => onChange(clienteDesdeEmpresa(empresa))}
            className="ml-auto shrink-0 font-medium underline"
          >
            Vincular
          </button>
        </div>
      ))}

      {/* Alias impreso. Va aquí y no solo en la pantalla de empresas porque la
          decisión es de la orden: el alias de la empresa llega puesto, y esta
          ficha puede salir con el nombre completo si así conviene. Lo que se
          escriba aquí queda dentro de la ficha, no cambia la empresa. */}
      <div className="mt-1.5 flex items-center gap-2 text-[11px]">
        <input
          id={idAlias}
          type="checkbox"
          checked={Boolean(value.usarAlias)}
          disabled={!alias.trim()}
          onChange={(e) => onChange({ ...value, usarAlias: e.target.checked })}
          className="shrink-0 accent-blue-600 disabled:opacity-40"
        />
        <label htmlFor={idAlias} className="shrink-0 text-gray-600 dark:text-gray-400">
          Imprimir alias
        </label>
        <input
          value={alias}
          onChange={(e) => onChange(aliasManual(value, e.target.value))}
          placeholder="Alias en la orden (opcional)"
          title="Abreviación con la que sale el cliente en la orden de producción. Solo afecta a esta ficha."
          className="min-w-0 flex-1 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 px-2 py-1 text-[11px] uppercase"
        />
      </div>
    </div>
  );
}
