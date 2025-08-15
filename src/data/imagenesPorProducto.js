// src/data/imagenesPorProducto.js

// Importaciones locales de imágenes
import imgPuertaAlta from "../assets/imagenes/PuertaRapida/ALTA.jpg";
import imgPuertaPequeña from "../assets/imagenes/PuertaRapida/Pequeña.jpg";
import imgPuertaAmarilla from "../assets/imagenes/PuertaRapida/AMARILLA.jpg";
import imgPuertaGris from "../assets/imagenes/PuertaRapida/GRIS.jpg";

import imgAbrigoInflable from "../assets/imagenes/AbrigoRetractil/AbrigoInflable.jpg";
import imgAbrigoEstandar from "../assets/imagenes/AbrigoRetractil/Estandar.jpg";
import imgAbrigoTipoTunel from "../assets/imagenes/AbrigoRetractil/TipoTunel.jpg";
import imgAbrigoDoble from "../assets/imagenes/AbrigoRetractil/Doble.jpg";
import imgAbrigoGeneral1 from "../assets/imagenes/AbrigoRetractil/ABRIGO RETRACTIL 1.jpg";
import imgAbrigosMuelle from "../assets/imagenes/AbrigoRetractil/Abrigos para muelle de carga.jpg";
import imgAbrigoLado from "../assets/imagenes/AbrigoRetractil/ESTANTAR LADO.jpeg";
import imgAbrigoTunel2 from "../assets/imagenes/AbrigoRetractil/TUNEL2.jpeg";
import imgAbrigoVerde from "../assets/imagenes/AbrigoRetractil/VERDE.jpeg";


import imgDivisionEstandar from "../assets/imagenes/DivisionTermica/Estandar.jpg";
import imgDivisionConPuerta from "../assets/imagenes/DivisionTermica/ConPuerta.jpg";
import imgDivisionConVentilador from "../assets/imagenes/DivisionTermica/ConVentilador.jpg";
import imgDivision3paneles from "../assets/imagenes/DivisionTermica/TresPaneles.jpg";

import imgSello from "../assets/imagenes/SelloDeAnden/Estandar.jpg";
import imgSelloInclinado from "../assets/imagenes/SelloDeAnden/ConAngulo.jpg";

import imgSeccional from "../assets/imagenes/PuertaSeccional/PUERTA SECCIONAL 1.jpg";
import imgSeccionalAbrigo from "../assets/imagenes/PuertaSeccional/SECCIONAL ABRIGO.jpg";
import imgSeccionalVertical from "../assets/imagenes/PuertaSeccional/SECCIONALVERTICAL.jpg";

// Nuevas categorías adicionales
import imgAccesoriosMuelle from "../assets/imagenes/AccesoriosMuelle/ACCESORIOS PARA MUELLE.jpg";
import imgLamparaIndustrial from "../assets/imagenes/AccesoriosMuelle/lampara industruial.png";

import imgCanastilla from "../assets/imagenes/CanastillaDeSeguridad/CanastilladeSeguridad.jpg";
import imgCanastillaAlt from "../assets/imagenes/CanastillaDeSeguridad/CANASTILLA.jpg";

import imgCarroJaula1 from "../assets/imagenes/CarroJaula/MANTA TERMICA PARA ESTIBA O CARRO JAULA.JPG";
import imgCarroJaula2 from "../assets/imagenes/CarroJaula/Carro Jaula 2.jpg";
import imgCarroJaula3 from "../assets/imagenes/CarroJaula/Carro Jaula 3.jpg";
import imgCarroJaulaManta from "../assets/imagenes/CarroJaula/CON MANTA.JPG";

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
  "Puertas Rápidas Amarillas": imgPuertaAmarilla,
  "Puertas Rápidas Grises": imgPuertaGris,
  "Abrigo Retráctil Inflable": imgAbrigoInflable,
  "Abrigo Retráctil Estándar": imgAbrigoEstandar,
  "Abrigo Retráctil Estándar Tipo Túnel": imgAbrigoTipoTunel,
  "Abrigo Retráctil Estándar Doble": imgAbrigoDoble,
  "Abrigo Retráctil General 1": imgAbrigoGeneral1,
  "Abrigos para Muelle de Carga": imgAbrigosMuelle,
  "Abrigo Retráctil Vista Lateral": imgAbrigoLado,
  "Abrigo Retráctil Túnel 2": imgAbrigoTunel2,
  "Abrigo Retráctil Verde": imgAbrigoVerde,
  "Divisiones Térmicas": imgDivisionEstandar,
  "Divisiones Térmicas con puerta": imgDivisionConPuerta,
  "Divisiones Térmicas 3 paneles": imgDivision3paneles,
  "Divisiones Térmicas con ventilador": imgDivisionConVentilador,
  "Sello de Andén": imgSello,
  "Sello de Andén Con Inclinación": imgSelloInclinado,
  "Puerta Seccional": imgSeccional,
  "Puerta Seccional con Abrigo": imgSeccionalAbrigo,
  "Puerta Seccional Vertical": imgSeccionalVertical,
  "Accesorios de Muelle": imgAccesoriosMuelle,
  "Lámpara Industrial": imgLamparaIndustrial,
  "Canastilla de Seguridad": imgCanastilla,
  "Canastilla de Seguridad Alt": imgCanastillaAlt,
  "Carro Jaula Manta Térmica": imgCarroJaula1,
  "Carro Jaula 2": imgCarroJaula2,
  "Carro Jaula 3": imgCarroJaula3,
  "Carro Jaula con Manta": imgCarroJaulaManta,
};

const imagenesPorProducto = {};

export const cargarImagenesBase64 = async () => {
  for (const [clave, ruta] of Object.entries(rutas)) {
    imagenesPorProducto[clave] = await convertirADataUrl(ruta);
  }
};

export default imagenesPorProducto;
