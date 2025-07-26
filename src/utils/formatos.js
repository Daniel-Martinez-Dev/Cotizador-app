export function formatearPesos(valor) {
  const numero = Number(valor);
  if (isNaN(numero)) return "$ 0";
  return numero.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });
}