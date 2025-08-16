import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import CotizadorApp from "./pages/CotizadorApp";
import PreviewPage from "./pages/PreviewPage";
import HistorialPage from "./pages/HistorialPage";
import ClientsPage from "./pages/ClientsPage";
import ProductsPage from "./pages/ProductsPage";
import { QuoteProvider } from "./context/QuoteContext";
import { Toaster } from 'react-hot-toast';
import logo from "./assets/imagenes/logo.png";

export default function App() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('theme') === 'dark';
    } catch { return false; }
  });

  useEffect(()=>{
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      try { localStorage.setItem('theme','dark'); } catch {}
    } else {
      root.classList.remove('dark');
      try { localStorage.setItem('theme','light'); } catch {}
    }
  }, [dark]);

  const NavBar = () => {
    const location = useLocation();
    const links = [
      { to: '/', label: 'Cotizar' },
      { to: '/productos', label: 'Productos' },
      { to: '/historial', label: 'Historial' },
      { to: '/clientes', label: 'Clientes' }
    ];
    return (
      <nav className="hidden md:flex items-center gap-2 ml-4">
        {links.map(l => {
          const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors border border-transparent focus:outline-none focus:ring-2 focus:ring-trafico/60 ${active ? 'bg-trafico text-black' : 'bg-gris-800/60 text-white hover:bg-gris-700 hover:text-trafico'}`}
              >{l.label}</Link>
            );
        })}
      </nav>
    );
  };

  const MobileNav = () => {
    const location = useLocation();
    const links = [
      { to: '/', label: 'Cotizar' },
      { to: '/productos', label: 'Productos' },
      { to: '/historial', label: 'Historial' },
      { to: '/clientes', label: 'Clientes' }
    ];
    return (
      <div className="md:hidden flex gap-2 overflow-x-auto pb-2 px-1 mt-14 bg-white dark:bg-negro border-b border-gray-200 dark:border-gris-700">
        {links.map(l => {
          const active = location.pathname === l.to;
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`whitespace-nowrap px-3 py-1.5 rounded text-xs font-medium border border-transparent ${active ? 'bg-trafico text-black' : 'bg-gris-800/60 text-white hover:bg-gris-700 hover:text-trafico'}`}
            >{l.label}</Link>
          );
        })}
      </div>
    );
  };

  return (
    <QuoteProvider>
      <Router>
        <Toaster position="top-right" />
        <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-negro dark:text-white shadow flex items-center gap-4 px-4 h-14 border-b border-gray-200 dark:border-gris-700">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logo} alt="Logo" className="h-10 w-auto select-none" />
            <span className="font-semibold text-sm sm:text-base tracking-wide group-hover:text-trafico dark:group-hover:text-trafico transition-colors">Cotizador Cold Chain Services</span>
          </Link>
          <NavBar />
          <button
            onClick={()=>setDark(d=>!d)}
            className="ml-auto text-xs sm:text-sm px-3 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800 hover:bg-gray-100 dark:hover:bg-gris-700 text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-trafico/60"
            title="Cambiar tema"
          >{dark ? 'Claro' : 'Oscuro'}</button>
        </header>
        <MobileNav />
        <main className="pt-16 md:pt-16 pb-8 bg-gray-50 dark:bg-gris-900 min-h-screen text-gray-900 dark:text-gray-100 transition-colors">
          <Routes>
            <Route path="/" element={<CotizadorApp />} />
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/historial" element={<HistorialPage />} />
            <Route path="/clientes" element={<ClientsPage />} />
            <Route path="/productos" element={<ProductsPage />} />
          </Routes>
        </main>
      </Router>
    </QuoteProvider>
  );
}
