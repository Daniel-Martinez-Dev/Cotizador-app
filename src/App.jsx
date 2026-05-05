import React, { useEffect, useState } from "react";
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate, Outlet, Navigate } from "react-router-dom";
import CotizadorApp from "./pages/CotizadorApp";
import CompaniesPage from "./pages/CompaniesPage";
import PreviewPage from "./pages/PreviewPage";
import HistorialPage from "./pages/HistorialPage";
import ProductsPage from "./pages/ProductsPage";
import ProduccionPage from "./pages/ProduccionPage";
import InventarioPage from "./pages/InventarioPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import UsuariosPage from "./pages/UsuariosPage";
import { QuoteProvider, useQuote } from "./context/QuoteContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from 'react-hot-toast';
import logo from "./assets/imagenes/logo.png";
import { ENABLE_INVENTARIO, ENABLE_PRODUCCION, REQUIRE_LOGIN } from "./utils/featureFlags";
// Carga catálogo central (side-effect) para futuras referencias globales
import './data/catalogoProductos';

function AppShell() {
  const { quoteData, setQuoteData, setResetToken, setEmpresaSeleccionada, setContactoSeleccionado } = useQuote();
  const { user, signOutUser, hasRole } = useAuth();
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

  const [showNuevaModal, setShowNuevaModal] = useState(false);
  

  

  const performNueva = (navigate, currentPath) => {
    setQuoteData({});
    setEmpresaSeleccionada(null);
    setContactoSeleccionado(null);
    setResetToken(Date.now());
    if(currentPath !== '/') navigate('/');
    window.scrollTo(0,0);
    setShowNuevaModal(false);
  };

  const BackButton = () => {
    const navigate = useNavigate();
    const handleBack = () => {
      const idx = window.history?.state?.idx;
      if (typeof idx === 'number' && idx > 0) {
        navigate(-1);
      } else {
        navigate('/dashboard');
      }
    };

    return (
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800 hover:bg-gray-100 dark:hover:bg-gris-700 text-gray-700 dark:text-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-trafico/60"
        title="Volver a la pestaña anterior"
      >
        Volver
      </button>
    );
  };

  const NavBar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const handleNueva = () => { setShowNuevaModal(true); };
    const links = [
      { to: '/dashboard', label: 'Inicio', show: true },
      { to: '/', label: 'Cotizar', show: true },
      { to: '/produccion', label: 'Producción', show: ENABLE_PRODUCCION },
      { to: '/inventario', label: 'Inventario', show: ENABLE_INVENTARIO },
      { to: '/productos', label: 'Productos', show: true },
      { to: '/historial', label: 'Historial', show: true },
      { to: '/empresas', label: 'Empresas', show: true },
      { to: '/usuarios', label: 'Usuarios', show: hasRole('admin') },
    ].filter(l => l.show);
    return (
      <nav className="hidden md:flex items-center gap-2 ml-4">
        {links.map(l => {
          const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors border border-transparent focus:outline-none focus:ring-2 focus:ring-trafico/60 ${active ? 'bg-trafico text-black' : 'bg-gris-800/60 text-gray-200 hover:bg-gris-700 hover:text-trafico'}`}
              >{l.label}</Link>
            );
        })}
        <button
          type="button"
          onClick={handleNueva}
          className="ml-2 px-3 py-1.5 rounded text-sm font-medium bg-green-600 hover:bg-green-500 text-white focus:outline-none focus:ring-2 focus:ring-trafico/60"
          title="Iniciar nueva cotización"
        >Nueva Cotización</button>
      </nav>
    );
  };

  const MobileNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const handleNueva = () => { setShowNuevaModal(true); };
    const [menuOpen, setMenuOpen] = useState(false);
    const links = [
      { to: '/dashboard', label: 'Inicio', show: true },
      { to: '/', label: 'Cotizar', show: true },
      { to: '/produccion', label: 'Producción', show: ENABLE_PRODUCCION },
      { to: '/inventario', label: 'Inventario', show: ENABLE_INVENTARIO },
      { to: '/productos', label: 'Productos', show: true },
      { to: '/historial', label: 'Historial', show: true },
      { to: '/empresas', label: 'Empresas', show: true },
      { to: '/usuarios', label: 'Usuarios', show: hasRole('admin') },
    ].filter(l => l.show);
    const primaryOrder = ['/dashboard', '/', '/produccion', '/inventario'];
    const primaryLinks = primaryOrder
      .map((path) => links.find((l) => l.to === path))
      .filter(Boolean);
    const overflowLinks = links.filter((l) => !primaryOrder.includes(l.to));
    return (
      <div className="md:hidden mt-14 bg-white dark:bg-negro border-b border-gray-200 dark:border-gris-700">
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="flex-1 grid grid-cols-2 gap-2">
            {primaryLinks.map((l) => {
              const active = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`text-center px-2 py-2 rounded-lg text-xs font-semibold border ${active ? 'bg-trafico text-black border-trafico' : 'bg-gray-900 text-gray-100 border-gray-800'} `}
                >{l.label}</Link>
              );
            })}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-gray-300 dark:border-gris-600 bg-gray-100 dark:bg-gris-800 text-gray-700 dark:text-gray-200"
              aria-expanded={menuOpen}
              aria-label="Abrir menu"
            >Mas</button>
            <button
              type="button"
              onClick={handleNueva}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-500 text-white"
            >Nueva</button>
          </div>
        </div>
        {menuOpen && (
          <div className="px-3 pb-3">
            <div className="rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-900 p-2 grid grid-cols-2 gap-2">
              {overflowLinks.map((l) => {
                const active = location.pathname === l.to;
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    className={`text-center px-2 py-2 rounded-lg text-xs font-semibold border ${active ? 'bg-trafico text-black border-trafico' : 'bg-gray-50 dark:bg-gris-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gris-700'}`}
                  >{l.label}</Link>
                );
              })}
              {!overflowLinks.length && (
                <div className="col-span-2 text-[11px] text-center text-gray-500 dark:text-gray-400 py-2">
                  No hay mas secciones.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-negro dark:text-gray-200 shadow flex items-center gap-4 px-4 h-14 border-b border-gray-200 dark:border-gris-700">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <img src={logo} alt="Logo" className="h-10 w-auto select-none" />
          <span className="font-semibold text-sm sm:text-base tracking-wide group-hover:text-trafico dark:group-hover:text-trafico transition-colors">Cotizador Cold Chain Services</span>
        </Link>
        <BackButton />
        <NavBar />
        {quoteData?.modoEdicion && (
          <div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1.5 rounded border border-yellow-400 bg-yellow-50 text-yellow-800 dark:bg-gris-800 dark:border-trafico dark:text-trafico text-xs font-medium">
            <span>Edición #{quoteData.numero || '—'}</span>
            <button
              type="button"
              onClick={()=> setQuoteData(prev=> ({ ...(prev||{}), modoEdicion:false }))}
              className="ml-1 px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
            >Salir</button>
          </div>
        )}
        <button
          onClick={()=>setDark(d=>!d)}
          className="ml-auto text-xs sm:text-sm px-3 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800 hover:bg-gray-100 dark:hover:bg-gris-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-trafico/60"
          title="Cambiar tema"
        >{dark ? 'Claro' : 'Oscuro'}</button>
        {REQUIRE_LOGIN && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-300 max-w-[220px] truncate" title={user?.email || ''}>{user?.email || ''}</span>
            <button
              type="button"
              onClick={()=>signOutUser()}
              className="text-xs sm:text-sm px-3 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800 hover:bg-gray-100 dark:hover:bg-gris-700 text-gray-700 dark:text-gray-200"
            >Salir</button>
          </div>
        )}
      </header>
      <MobileNav />
      <main className="pt-16 md:pt-16 pb-8 bg-gray-50 dark:bg-gris-900 min-h-screen text-gray-900 dark:text-gray-200 transition-colors">
        <Outlet />
      </main>
      {showNuevaModal && (
        <NuevaCotizacionModal onClose={()=>setShowNuevaModal(false)} onConfirm={(navigate, path)=>performNueva(navigate, path)} />
      )}
    </>
  );
}

// Modal de confirmación
function NuevaCotizacionModal({ onClose, onConfirm }){
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gris-800 rounded-lg shadow-lg border border-gray-200 dark:border-gris-600 p-6 animate-fade-in">
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Iniciar nueva cotización</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Se perderán los datos no guardados de la cotización actual. ¿Deseas continuar?</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-100 dark:bg-gris-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gris-600 text-sm">Cancelar</button>
          <button onClick={()=>onConfirm(navigate, location.pathname)} className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white text-sm shadow focus:outline-none focus:ring-2 focus:ring-trafico/60">Sí, limpiar</button>
        </div>
      </div>
    </div>
  );
}

export default function App(){
  return (
    <AuthProvider>
      <QuoteProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />

                <Route path="/" element={<CotizadorApp />} />
                <Route path="/preview" element={<PreviewPage />} />
                <Route
                  path="/produccion"
                  element={ENABLE_PRODUCCION ? <ProduccionPage /> : <Navigate to="/dashboard" replace state={{ disabled: 'produccion' }} />}
                />
                <Route
                  path="/inventario"
                  element={ENABLE_INVENTARIO ? <InventarioPage /> : <Navigate to="/dashboard" replace state={{ disabled: 'inventario' }} />}
                />
                <Route path="/historial" element={<HistorialPage />} />
                <Route path="/productos" element={<ProductsPage />} />
                <Route path="/empresas" element={<CompaniesPage />} />

                <Route element={<ProtectedRoute requireRole="admin" />}>
                  <Route path="/usuarios" element={<UsuariosPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </QuoteProvider>
    </AuthProvider>
  );
}
