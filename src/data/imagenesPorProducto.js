// src/data/imagenesPorProducto.js

// Importaciones locales de imágenes
import imgPuertaAlta from "../assets/imagenes/PuertaRapida/ALTA.jpg";
import imgPuertaPequeña from "../assets/imagenes/PuertaRapida/Pequeña.jpg";

import imgAbrigoInflable from "../assets/imagenes/AbrigoRetractil/AbrigoInflable.jpg";
import imgAbrigoEstandar from "../assets/imagenes/AbrigoRetractil/Estandar.jpg";
import imgAbrigoTipoTunel from "../assets/imagenes/AbrigoRetractil/TipoTunel.jpg";
import imgAbrigoDoble from "../assets/imagenes/AbrigoRetractil/Doble.jpg";


import imgDivisionEstandar from "../assets/imagenes/DivisionTermica/Estandar.jpg";
import imgDivisionConPuerta from "../assets/imagenes/DivisionTermica/ConPuerta.jpg";
import imgDivisionConVentilador from "../assets/imagenes/DivisionTermica/ConVentilador.jpg";
import imgDivision3paneles from "../assets/imagenes/DivisionTermica/TresPaneles.jpg";

import imgSello from "../assets/imagenes/SelloDeAnden/Estandar.jpg";
import imgSelloInclinado from "../assets/imagenes/SelloDeAnden/ConAngulo.jpg";

import imgSeccional from "../assets/imagenes/PuertaSeccional/PUERTA SECCIONAL 1.jpg";

// Esta función convierte una imagen en base64 directamente
const convertirADataUrl = (imagen) => {
  return fetch(imagen)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );
};
// Mapa de claves → promesas de base64
const rutas = {
  "Puertas Rápidas Pequeñas": imgPuertaPequeña,
  "Puertas Rápidas Altas": imgPuertaAlta,
  "Abrigo Retráctil Inflable": imgAbrigoInflable,
  "Abrigo Retráctil Estándar": imgAbrigoEstandar,
  "Abrigo Retráctil Estándar Tipo Túnel": imgAbrigoTipoTunel,
  "Abrigo Retráctil Estándar Doble": imgAbrigoDoble,
  "Divisiones Térmicas": imgDivisionEstandar,
  "Divisiones Térmicas con puerta": imgDivisionConPuerta,
  "Divisiones Térmicas 3 paneles": imgDivision3paneles,
  "Divisiones Térmicas con ventilador": imgDivisionConVentilador,
  "Sello de Andén": imgSello,
  "Sello de Andén Con Inclinación": imgSelloInclinado,
  "Puerta Seccional": imgSeccional,
};

const imagenesPorProducto = {};

export const cargarImagenesBase64 = async () => {
  for (const [clave, ruta] of Object.entries(rutas)) {
    imagenesPorProducto[clave] = await convertirADataUrl(ruta);
  }
};

export default imagenesPorProducto;
