// Campos numéricos que se pueden dejar en blanco mientras se escriben.
//
// El patrón que había —`onChange={e => set(campo, Number(e.target.value))}`—
// convierte el campo vacío en 0: al borrar el contenido para reescribirlo
// aparece un "0" que hay que volver a borrar, y en un teclado de tablet eso es
// un estorbo en cada medida que se corrige. Aquí el vacío se conserva como ""
// y el valor por defecto se enseña como placeholder, así que el campo se limpia
// de una vez y lo que se guarda —si se dejó en blanco— es el defecto.
//
// El valor sigue guardándose como número: solo el estado intermedio del
// formulario admite "".

export const vacioNumerico = (v) => v === "" || v === null || v === undefined;

// Valor para el estado del formulario: "" si se borró el campo, número si no.
export function valorNumerico(entrada) {
  if (vacioNumerico(entrada)) return "";
  const n = Number(entrada);
  return Number.isNaN(n) ? "" : n;
}

// Valor para calcular y para guardar: el defecto cubre el campo en blanco.
export function numeroODefecto(entrada, defecto = 0) {
  if (vacioNumerico(entrada)) return defecto;
  const n = Number(entrada);
  return Number.isFinite(n) ? n : defecto;
}

// Reemplaza por su defecto los campos numéricos que quedaron en blanco.
// `defectos` es un objeto campo → valor por defecto.
export function conDefectosNumericos(form = {}, defectos = {}) {
  const salida = { ...form };
  for (const [campo, defecto] of Object.entries(defectos)) {
    salida[campo] = numeroODefecto(form[campo], defecto);
  }
  return salida;
}
