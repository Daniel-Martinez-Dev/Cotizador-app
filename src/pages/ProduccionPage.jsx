import React from "react";
import DivisionTermicaFicha from "../components/DivisionTermicaFicha";
import SelloAndenFicha from "../components/SelloAndenFicha";
import AbrigoRetractilFicha from "../components/AbrigoRetractilFicha";
import PuertaRapidaFicha from "../components/PuertaRapidaFicha";
import PuertaSeccionalFicha from "../components/PuertaSeccionalFicha";
import FichaBasicaFicha from "../components/FichaBasicaFicha";
import OrdenesProduccionList from "../components/produccion/OrdenesProduccionList";
import Tabs from "../components/ui/Tabs";

import PageHeader from "../components/ui/PageHeader";
// Cada pestaña de producto crea y edita sus propias fichas; "Fichas básicas"
// cubre lo que pasa a producción sin ficha de fabricación (repuestos,
// semáforos, lámparas, topes, rampas…) y "Órdenes" es la vista transversal:
// todas las órdenes de todos los productos en una sola lista con filtros.
const TABS = [
  { key: "division",        label: "División Térmica" },
  { key: "sello",           label: "Sello de Andén" },
  { key: "abrigoretractil", label: "Abrigo Retráctil" },
  { key: "puertarapida",    label: "Puertas Rápidas" },
  { key: "puertaseccional", label: "Puertas Seccionales" },
  { key: "fichas",          label: "Fichas básicas" },
  { key: "ordenes",         label: "Órdenes" },
];

export default function ProduccionPage() {
  const [tab, setTab] = React.useState("division");

  return (
    <div className="max-w-6xl mx-auto px-4">
      <PageHeader section="/produccion" />

      <Tabs items={TABS} active={tab} onChange={setTab} variant="boxed" />

      <div className="mt-5">
        {tab === "division"        && <DivisionTermicaFicha />}
        {tab === "sello"           && <SelloAndenFicha />}
        {tab === "abrigoretractil" && <AbrigoRetractilFicha />}
        {tab === "puertarapida"    && <PuertaRapidaFicha />}
        {tab === "puertaseccional" && <PuertaSeccionalFicha />}
        {tab === "fichas"          && <FichaBasicaFicha />}
        {tab === "ordenes"         && <OrdenesProduccionList />}
      </div>
    </div>
  );
}
