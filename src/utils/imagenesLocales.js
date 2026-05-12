// Mapa de etiqueta de producto → array de imágenes locales del proyecto
// Usado para la migración inicial a Cloudinary.

import imgDivisionEstandar from '../assets/imagenes/DivisionTermica/Estandar.jpg';
import imgDivisionConPuerta from '../assets/imagenes/DivisionTermica/ConPuerta.jpg';
import imgDivisionConVentilador from '../assets/imagenes/DivisionTermica/ConVentilador.jpg';
import imgDivision3paneles from '../assets/imagenes/DivisionTermica/TresPaneles.jpg';

import imgPuertaAlta from '../assets/imagenes/PuertaRapida/ALTA.jpg';
import imgPuertaPequeña from '../assets/imagenes/PuertaRapida/Pequeña.jpg';
import imgPuertaAmarilla from '../assets/imagenes/PuertaRapida/AMARILLA.jpg';
import imgPuertaGris from '../assets/imagenes/PuertaRapida/GRIS.jpg';

import imgSeccional from '../assets/imagenes/PuertaSeccional/PUERTA SECCIONAL 1.jpg';
import imgSeccionalAbrigo from '../assets/imagenes/PuertaSeccional/SECCIONAL ABRIGO.jpg';
import imgSeccionalVertical from '../assets/imagenes/PuertaSeccional/SECCIONALVERTICAL.jpg';

import imgAbrigoEstandar from '../assets/imagenes/AbrigoRetractil/Estandar.jpg';
import imgAbrigoTipoTunel from '../assets/imagenes/AbrigoRetractil/TipoTunel.jpg';
import imgAbrigoDoble from '../assets/imagenes/AbrigoRetractil/Doble.jpg';
import imgAbrigoGeneral from '../assets/imagenes/AbrigoRetractil/ABRIGO RETRACTIL 1.jpg';
import imgAbrigosMuelle from '../assets/imagenes/AbrigoRetractil/Abrigos para muelle de carga.jpg';
import imgAbrigoLado from '../assets/imagenes/AbrigoRetractil/ESTANTAR LADO.jpeg';
import imgAbrigoTunel2 from '../assets/imagenes/AbrigoRetractil/TUNEL2.jpeg';
import imgAbrigoVerde from '../assets/imagenes/AbrigoRetractil/VERDE.jpeg';

import imgAbrigoInflable from '../assets/imagenes/AbrigoRetractil/AbrigoInflable.jpg';

import imgSello from '../assets/imagenes/SelloDeAnden/Estandar.jpg';
import imgSelloAngulo from '../assets/imagenes/SelloDeAnden/ConAngulo.jpg';

import imgSemaforoSencillo from '../assets/imagenes/SemaforosParaMuelle/SemaforoSencillo.jpg';
import imgSemaforoDoble from '../assets/imagenes/SemaforosParaMuelle/SemaforoDoble.jpg';
import imgSemaforoSensor from '../assets/imagenes/SemaforosParaMuelle/ConSensor.jpg';

import imgLampara from '../assets/imagenes/AccesoriosMuelle/lampara industruial.png';
import imgAccesorios from '../assets/imagenes/AccesoriosMuelle/ACCESORIOS PARA MUELLE.jpg';

import imgCanastilla from '../assets/imagenes/CanastillaDeSeguridad/CanastilladeSeguridad.jpg';
import imgCanastillaAlt from '../assets/imagenes/CanastillaDeSeguridad/CANASTILLA.jpg';

export const IMAGENES_POR_ETIQUETA = {
  'Divisiones Térmicas': [imgDivisionEstandar, imgDivisionConPuerta, imgDivisionConVentilador, imgDivision3paneles],
  'Puertas Rápidas': [imgPuertaAlta, imgPuertaPequeña, imgPuertaAmarilla, imgPuertaGris],
  'Puertas Seccionales': [imgSeccional, imgSeccionalAbrigo, imgSeccionalVertical],
  'Abrigo Retráctil Estándar': [imgAbrigoEstandar, imgAbrigoTipoTunel, imgAbrigoDoble, imgAbrigoGeneral, imgAbrigosMuelle, imgAbrigoLado, imgAbrigoTunel2, imgAbrigoVerde],
  'Abrigo Retráctil Inflable': [imgAbrigoInflable],
  'Sello de Andén': [imgSello, imgSelloAngulo],
  'Semáforo para Muelles de Carga': [imgSemaforoSencillo, imgSemaforoDoble, imgSemaforoSensor],
  'Lámpara Industrial': [imgLampara, imgAccesorios],
  'Canastilla de Seguridad': [imgCanastilla, imgCanastillaAlt],
};
