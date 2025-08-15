import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom";
import CotizadorApp from "./pages/CotizadorApp";
import PreviewPage from "./pages/PreviewPage";
import HistorialPage from "./pages/HistorialPage";
import ClientsPage from "./pages/ClientsPage";
import { QuoteProvider } from "./context/QuoteContext";
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <QuoteProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<CotizadorApp />} />
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/historial" element={<HistorialPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
        </Routes>
      </Router>
    </QuoteProvider>
  );
}
