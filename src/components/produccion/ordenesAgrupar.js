import { ESTADOS_FICHA, normalizarEstado } from "../fichas/estadoFicha";
import { alertaEntrega, claveDia } from "./ordenesFiltrar";
import { normalizarNombreCliente } from "../../utils/clienteVinculo";

// Agrupación de órdenes por orden de compra del cliente.
//
// Un cliente casi nunca manda una orden de compra por un solo producto: la
// misma OC trae los 6 sellos, las 6 puertas seccionales y los 6 juegos de
// topes. Cada uno tiene que subirse como su propia ficha —son productos
// distintos, con medidas, materia prima y planta distintas—, pero en pantalla
// son *un* pedido: se cotizó junto, se factura junto y, sobre todo, se despacha
// junto. Verlas como tres tarjetas sueltas ocupa el tablero y hace que en el
// despacho salga una y se quede otra.
//
// No hay entidad nueva ni migración: la OC ya viaja en cada ficha
// (`numeroOrdenCompra`), así que el grupo se arma en memoria a partir de lo que
// ya está guardado. Las fichas sin OC no se agrupan — sin referencia común no
// hay forma de saber que van juntas, y juntarlas por cliente metería en el
// mismo grupo pedidos de meses distintos.

// La OC se escribe a mano y nunca igual dos veces: "4500-123", "4500 123" y
// "oc4500123" son la misma. La clave se queda solo con letras y dígitos.
export function normalizarOrdenCompra(valor) {
  return String(valor ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// El número por sí solo no basta: los clientes pequeños numeran "001", "002", y
// dos de ellos chocarían. La clave lleva el cliente por delante — el nombre
// normalizado y no `clienteId`, porque el nombre lo tienen todas las fichas
// (también las que se escribieron a mano sin vincular empresa).
export function claveOrdenCompra(ficha) {
  const oc = normalizarOrdenCompra(ficha?.numeroOrdenCompra);
  if (!oc) return "";
  const cliente =
    normalizarNombreCliente(ficha?.cliente) || String(ficha?.clienteId ?? "").trim();
  return `${cliente}|${oc}`;
}

// Estado del pedido completo: el menos avanzado de sus fichas. Una orden de
// compra con dos productos terminados y uno todavía en planta no está
// terminada — si el tablero la pintara en "Terminadas" el camión saldría
// incompleto, que es justo lo que esta pantalla tiene que evitar.
export function estadoGrupo(fichas = []) {
  let indice = ESTADOS_FICHA.length - 1;
  for (const f of fichas) {
    indice = Math.min(indice, ESTADOS_FICHA.indexOf(normalizarEstado(f.estado)));
  }
  return ESTADOS_FICHA[Math.max(indice, 0)];
}

// La alerta del grupo es la peor de sus fichas: si una está vencida, el pedido
// está vencido.
const SEVERIDAD = { vencida: 3, hoy: 2, proxima: 1 };

export function alertaGrupo(fichas = [], hoy) {
  let peor = null;
  for (const f of fichas) {
    const a = alertaEntrega(f, hoy);
    if (a && (!peor || SEVERIDAD[a] > SEVERIDAD[peor])) peor = a;
  }
  return peor;
}

// La fecha que manda en el grupo es la más próxima (la primera que se vence) y
// la fecha de orden, la más antigua (cuándo entró el pedido).
const minFecha = (fichas, campo) =>
  fichas.map((f) => claveDia(f[campo])).filter(Boolean).sort()[0] || "";

// Resumen del pedido: cuántas fichas hay en cada estado y cuántas unidades en
// total. `porEstado` es lo que deja leer "3 de 6 terminadas" sin abrir el grupo.
export function resumenGrupo(fichas = []) {
  const porEstado = Object.fromEntries(ESTADOS_FICHA.map((e) => [e, 0]));
  let unidades = 0;
  for (const f of fichas) {
    porEstado[normalizarEstado(f.estado)] += 1;
    unidades += Number(f.cantidad) || 1;
  }
  return { porEstado, unidades };
}

// Los productos del pedido, contados: "2 Sellos de Andén · 1 Puerta Seccional".
// Es el renglón que dice de qué es la orden de compra sin desplegarla.
export function productosGrupo(fichas = []) {
  const cuenta = new Map();
  for (const f of fichas) {
    const clave = f.tipo || "";
    const previo = cuenta.get(clave);
    if (previo) previo.fichas += 1;
    else cuenta.set(clave, { tipo: clave, label: f.tipoLabel || "", fichas: 1 });
  }
  return [...cuenta.values()];
}

// Los detalles de las fichas del pedido ("Muelle 7", "Zona 3"), sin repetir y
// en el orden en que van. Es lo que deja leer de qué van las seis líneas
// iguales de una orden de compra sin desplegarla.
export function detallesGrupo(fichas = []) {
  const vistos = new Set();
  const detalles = [];
  for (const f of fichas) {
    const nombre = String(f.nombreFicha ?? "").trim();
    if (!nombre || vistos.has(nombre)) continue;
    vistos.add(nombre);
    detalles.push(nombre);
  }
  return detalles;
}

function construirGrupo(clave, fichas) {
  // Los datos de cabecera se toman de la primera ficha del grupo, que es la que
  // el orden de la lista dejó arriba: el número de OC tal como se escribió y el
  // cliente tal como quedó congelado en la ficha.
  const [primera] = fichas;
  return {
    esGrupo: true,
    clave,
    numeroOrdenCompra: primera.numeroOrdenCompra || "",
    cliente:      primera.cliente || "",
    clienteAlias: primera.clienteAlias || "",
    usarAlias:    !!primera.usarAlias,
    clienteId:    primera.clienteId || null,
    fichas,
    estado:       estadoGrupo(fichas),
    fechaEntrega: minFecha(fichas, "fechaEntrega"),
    fechaOrden:   minFecha(fichas, "fechaOrden"),
    // El consecutivo más alto del grupo: así el pedido se ordena por su ficha
    // más reciente y no se hunde hasta la posición de la más antigua.
    ordenProduccion: Math.max(...fichas.map((f) => Number(f.ordenProduccion) || 0)),
    productos: productosGrupo(fichas),
    detalles: detallesGrupo(fichas),
    ...resumenGrupo(fichas),
  };
}

// Convierte la lista plana de fichas en entradas para pintar: un grupo por cada
// orden de compra con dos o más fichas, y la ficha suelta tal cual en los demás
// casos (una sola ficha no es un pedido que agrupar, y envolverla solo añadiría
// un clic para llegar a lo de siempre).
//
// El orden de entrada se respeta: la lista llega ya filtrada y ordenada, y cada
// grupo se queda en el sitio de su primera ficha.
export function agruparPorOrdenCompra(fichas = []) {
  const porClave = new Map();
  const entradas = [];

  for (const ficha of fichas) {
    const clave = claveOrdenCompra(ficha);
    if (!clave) {
      entradas.push(ficha);
      continue;
    }
    const grupo = porClave.get(clave);
    if (grupo) grupo.push(ficha);
    else {
      const nuevo = [ficha];
      porClave.set(clave, nuevo);
      entradas.push(nuevo); // marcador de posición; se resuelve abajo
    }
  }

  return entradas.map((entrada) => {
    if (!Array.isArray(entrada)) return entrada;
    if (entrada.length === 1) return entrada[0];
    return construirGrupo(claveOrdenCompra(entrada[0]), entrada);
  });
}

// Clave de React/selección de una entrada, sea grupo o ficha suelta.
export const claveEntrada = (e) => (e.esGrupo ? `oc:${e.clave}` : `${e.tipo}-${e.id}`);

// Las fichas que representa una entrada: las del grupo, o la ficha misma.
export const fichasDeEntrada = (e) => (e?.esGrupo ? e.fichas : e ? [e] : []);

// ─── Juntar a mano órdenes sueltas en una misma orden de compra ─────────────
//
// El grupo se arma solo cuando las fichas ya comparten la OC, y eso no siempre
// pasa: la ficha se subió antes de que llegara el número del cliente, se tecleó
// distinto, o el pedido creció con una línea que se creó suelta. Marcarlas en
// la lista —las mismas casillas con que se firman y se cierran— y darles la OC
// de una vez es lo que las junta: no hay otra forma de decir "el juego de topes
// va con estos seis sellos".
//
// Aquí solo se lee la selección; escribir el número es asignarOrdenCompraFicha
// (utils/firebaseFichas.js).

// Cliente y OC de lo seleccionado, sin repetir. `sugerida` es la OC que ya
// traen las fichas cuando es una sola: el caso corriente es sumar una ficha
// suelta a un pedido que ya existe, y ahí el número no debería volver a
// teclearse — teclearlo distinto es justo lo que dejó la ficha fuera.
export function planAgruparEnOC(fichas = []) {
  const clientes = new Map();
  const previas = new Map();

  for (const f of fichas) {
    const cliente = normalizarNombreCliente(f?.cliente) || String(f?.clienteId ?? "").trim();
    if (!clientes.has(cliente)) clientes.set(cliente, f?.cliente || "Sin cliente");
    const oc = normalizarOrdenCompra(f?.numeroOrdenCompra);
    if (oc && !previas.has(oc)) previas.set(oc, String(f.numeroOrdenCompra).trim());
  }

  const numeros = [...previas.values()];
  return {
    clientes: [...clientes.values()],
    previas: numeros,
    sugerida: numeros.length === 1 ? numeros[0] : "",
    // Un pedido es de un solo cliente: la clave del grupo lleva el cliente por
    // delante (ver claveOrdenCompra), así que el mismo número en dos clientes
    // distintos seguiría saliendo como dos pedidos por más que se escriba igual.
    mismoCliente: clientes.size <= 1,
  };
}

// Las fichas a las que de verdad hay que escribirles el número: las que ya lo
// tienen se dejan quietas — reescribir lo mismo solo mete una línea de más en
// su historial y una escritura de más en Firestore.
export function fichasSinLaOC(fichas = [], numero) {
  const clave = normalizarOrdenCompra(numero);
  return (fichas || []).filter((f) => normalizarOrdenCompra(f?.numeroOrdenCompra) !== clave);
}
