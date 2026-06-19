export function numeroALetras(num) {
  if (!num || num === 0) return 'CERO PESOS M/CTE';
  const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const DECENAS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  const VEINTIS = ['VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];

  const grupo = (n) => {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    let txt = '';
    const c = Math.floor(n / 100);
    const resto = n % 100;
    if (c > 0) txt += CENTENAS[c] + (resto > 0 ? ' ' : '');
    if (resto === 0) return txt.trim();
    if (resto < 20) { txt += UNIDADES[resto]; }
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      if (d === 2) { txt += VEINTIS[u]; }
      else { txt += DECENAS[d]; if (u > 0) txt += ' Y ' + UNIDADES[u]; }
    }
    return txt.trim();
  };

  const mil = Math.floor(num / 1000000);
  const miles = Math.floor((num % 1000000) / 1000);
  const resto = num % 1000;
  let r = '';
  if (mil > 0) { r += (mil === 1 ? 'UN MILLÓN' : grupo(mil) + ' MILLONES'); if (miles > 0 || resto > 0) r += ' '; }
  if (miles > 0) { r += (miles === 1 ? 'MIL' : grupo(miles) + ' MIL'); if (resto > 0) r += ' '; }
  if (resto > 0) r += grupo(resto);
  return r + ' PESOS M/CTE';
}
