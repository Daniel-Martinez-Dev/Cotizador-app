import { ESTADOS_FICHA, normalizarEstado } from "../fichas/estadoFicha";
import { codigoFichaOFallback, aFechaLocal } from "../../utils/codigoFicha";

// Lógica pura del listado de órdenes: filtrar, ordenar, agrupar y contar. Vive
// aparte de la vista porque es lo que decide qué ve producción cuando abre la
// pantalla, y eso se puede probar sin montar nada.

export const CAMPOS_FECHA = [
  { key: "fechaOrden",   label: "Fecha de orden" },
  { key: "fechaEntrega", label: "Fecha de entrega" },
  { key: "createdAt",    label: "Fecha de creación" },
];

export const ORDENAMIENTOS = [
  { key: "recientes", label: "N.° ficha (más reciente)" },
  { key: "antiguas",  label: "N.° ficha (más antigua)" },
  { key: "entrega",   label: "Entrega más próxima" },
  { key: "cliente",   label: "Cliente (A–Z)" },
];

export const FILTROS_INICIALES = {
  texto: "",
  tipo: "todos",
  estado: "todos",
  cliente: "todos",
  campoFecha: "fechaOrden",
  desde: "",
  hasta: "",
  soloAlerta: false,
  // El ordenamiento viaja con los filtros por comodidad (un solo objeto de
  // estado), pero no cuenta como filtro puesto: ver hayFiltrosActivos.
  ordenamiento: "recientes",
};

// Días de antelación con los que una entrega ya se considera "próxima".
export const DIAS_PROXIMA = 3;

// Sin tildes y en minúsculas: buscar "division" debe encontrar "División".
export const normalizar = (t) =>
  String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Clave "YYYY-MM-DD" comparable como texto, sirva el valor de string ISO,
// Date o Timestamp de Firestore.
export function claveDia(valor) {
  const d = aFechaLocal(valor);
  if (!d) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const claveHoy = () => claveDia(new Date());

// Suma días sobre una clave "YYYY-MM-DD" sin cruzarse con zonas horarias: se
// construye la fecha local a mediodía, que ningún cambio de horario mueve de día.
export function sumarDias(clave, dias) {
  const [a, m, d] = clave.split("-").map(Number);
  const fecha = new Date(a, m - 1, d, 12, 0, 0);
  fecha.setDate(fecha.getDate() + dias);
  return claveDia(fecha);
}

// Semáforo de entrega. Una ficha ya terminada o entregada no alerta aunque su
// fecha haya pasado: el trabajo salió, la fecha ya no es una deuda.
export function alertaEntrega(ficha, hoy = claveHoy()) {
  const estado = normalizarEstado(ficha?.estado);
  if (estado === "terminado" || estado === "entregado") return null;
  const dia = claveDia(ficha?.fechaEntrega);
  if (!dia) return null;
  if (dia < hoy) return "vencida";
  if (dia === hoy) return "hoy";
  if (dia <= sumarDias(hoy, DIAS_PROXIMA)) return "proxima";
  return null;
}

// Texto sobre el que busca el campo libre: todo lo que identifica una orden sin
// importar de qué producto sea.
export function textoBuscable(f) {
  return normalizar([
    codigoFichaOFallback(f, f.tipo),
    f.cliente,
    f.numeroOrdenCompra,
    f.nombreFicha,
    f.numeroFicha,
    f.ordenProduccion,
    f.tipoLabel,
    f.responsable,
    f.auxiliarEncargado,
    f.adicional,
    f.observaciones,
    (f.categorias || []).join(" "),
    (f.items || []).map((i) => `${i.descripcion} ${i.referencia}`).join(" "),
  ].filter(Boolean).join(" "));
}

export function indexar(fichas) {
  return fichas.map((f) => ({ ficha: f, buscable: textoBuscable(f) }));
}

export function filtrar(indexadas, filtros, hoy = claveHoy()) {
  const termino = normalizar((filtros.texto || "").trim());
  return indexadas
    .filter(({ ficha: f, buscable }) => {
      if (filtros.tipo !== "todos" && f.tipo !== filtros.tipo) return false;
      if (filtros.estado !== "todos" && normalizarEstado(f.estado) !== filtros.estado) return false;
      if (filtros.cliente !== "todos" && (f.cliente || "").trim() !== filtros.cliente) return false;
      if (filtros.soloAlerta && !alertaEntrega(f, hoy)) return false;
      if (filtros.desde || filtros.hasta) {
        const dia = claveDia(f[filtros.campoFecha]);
        // Una ficha sin esa fecha no puede afirmarse dentro del rango.
        if (!dia) return false;
        if (filtros.desde && dia < filtros.desde) return false;
        if (filtros.hasta && dia > filtros.hasta) return false;
      }
      if (termino && !buscable.includes(termino)) return false;
      return true;
    })
    .map(({ ficha }) => ficha);
}

const porOrdenDesc = (a, b) => Number(b.ordenProduccion || 0) - Number(a.ordenProduccion || 0);

export function ordenar(lista, criterio) {
  const copia = [...lista];
  if (criterio === "antiguas") return copia.sort((a, b) => -porOrdenDesc(a, b));
  if (criterio === "cliente") {
    return copia.sort((a, b) =>
      (a.cliente || "").localeCompare(b.cliente || "", "es") || porOrdenDesc(a, b));
  }
  if (criterio === "entrega") {
    // Las que no tienen fecha de entrega van al final, no al principio.
    return copia.sort((a, b) => {
      const da = claveDia(a.fechaEntrega) || "9999-12-31";
      const db = claveDia(b.fechaEntrega) || "9999-12-31";
      return da.localeCompare(db) || porOrdenDesc(a, b);
    });
  }
  return copia.sort(porOrdenDesc);
}

// Columnas del tablero, siempre las cuatro y siempre en el orden del flujo,
// aunque alguna venga vacía: una columna que desaparece esconde que no hay nada
// en producción, que es justo lo que se quiere ver.
export function agruparPorEstado(lista) {
  const grupos = Object.fromEntries(ESTADOS_FICHA.map((e) => [e, []]));
  for (const f of lista) grupos[normalizarEstado(f.estado)].push(f);
  return grupos;
}

export function metricas(fichas, hoy = claveHoy()) {
  const porEstado = Object.fromEntries(ESTADOS_FICHA.map((e) => [e, 0]));
  let vencidas = 0;
  let paraHoy = 0;
  let proximas = 0;
  for (const f of fichas) {
    porEstado[normalizarEstado(f.estado)] += 1;
    const alerta = alertaEntrega(f, hoy);
    if (alerta === "vencida") vencidas += 1;
    else if (alerta === "hoy") paraHoy += 1;
    else if (alerta === "proxima") proximas += 1;
  }
  return { total: fichas.length, porEstado, vencidas, paraHoy, proximas };
}

export function hayFiltrosActivos(filtros) {
  return (
    filtros.texto !== "" || filtros.tipo !== "todos" || filtros.estado !== "todos" ||
    filtros.cliente !== "todos" || filtros.desde !== "" || filtros.hasta !== "" ||
    filtros.soloAlerta
  );
}

export function clientesDe(fichas) {
  const unicos = new Set(fichas.map((f) => (f.cliente || "").trim()).filter(Boolean));
  return [...unicos].sort((a, b) => a.localeCompare(b, "es"));
}
