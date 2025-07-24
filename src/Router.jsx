import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import PreviewPage from "./pages/PreviewPage";
import HistorialPage from "./pages/HistorialPage";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/preview" element={<PreviewPage />} />
        <Route path="/historial" element={<HistorialPage />} />
      </Routes>
    </BrowserRouter>
  );
}
