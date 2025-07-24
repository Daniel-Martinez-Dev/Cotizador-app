//C:\Users\danma\Downloads\cotizador-app\src\main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css"; // << asegúrate de tener esta línea
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PreviewPage from "./pages/PreviewPage.jsx";
import { QuoteProvider } from "./context/QuoteContext.jsx";
import { Toaster } from "react-hot-toast";
import Router from './Router';
<Toaster position="top-right" />

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QuoteProvider>
      <Router />
    </QuoteProvider>
  </React.StrictMode>
);
