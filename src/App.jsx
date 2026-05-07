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
import menuIcon from "./assets/imagenes/menu-icon.png";
import { ADMIN_EMAIL, ENABLE_INVENTARIO, ENABLE_PRODUCCION, REQUIRE_LOGIN } from "./utils/featureFlags";
// Carga catálogo central (side-effect) para futuras referencias globales
import './data/catalogoProductos';

function AppShell() {
  const { quoteData, setQuoteData, setResetToken, setEmpresaSeleccionada, setContactoSeleccionado } = useQuote();
  const { user, signOutUser, hasRole, isMainAdmin } = useAuth();
  const isAdminUser = isMainAdmin || hasRole('admin');
  const canProduccion = ENABLE_PRODUCCION && (isAdminUser || hasRole('produccion'));
  const canInventario = ENABLE_INVENTARIO && (isAdminUser || hasRole('inventario'));
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
      { to: '/produccion', label: 'Producción', show: canProduccion },
      { to: '/inventario', label: 'Inventario', show: canInventario },
      { to: '/productos', label: 'Productos', show: true },
      { to: '/historial', label: 'Historial', show: true },
      { to: '/empresas', label: 'Empresas', show: true },
      { to: '/usuarios', label: 'Usuarios', show: isAdminUser },
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
    const [menuOpen, setMenuOpen] = useState(false);
    const links = [
      { to: '/dashboard', label: 'Inicio', show: true },
      { to: '/', label: 'Cotizar', show: true },
      { to: '/produccion', label: 'Producción', show: canProduccion },
      { to: '/inventario', label: 'Inventario', show: canInventario },
      { to: '/productos', label: 'Productos', show: true },
      { to: '/historial', label: 'Historial', show: true },
      { to: '/empresas', label: 'Empresas', show: true },
      { to: '/usuarios', label: 'Usuarios', show: isAdminUser },
    ].filter(l => l.show);
    return (
      <>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 dark:border-transparent bg-gray-50 dark:bg-transparent text-gray-700 dark:text-gray-200"
          aria-label="Abrir menu"
        >
          <span className="sr-only">Menu</span>
          <img src={menuIcon} alt="" className="h-5 w-5 dark:invert dark:brightness-200" />
        </button>
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-[999]">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menu"
            />
            <aside className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-gris-900 border-r border-gray-200 dark:border-gris-700 shadow-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold">Menú</div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="h-8 w-8 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800"
                >✕</button>
              </div>
              <div className="grid gap-2">
                {links.map((l) => {
                  const active = location.pathname === l.to;
                  return (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setMenuOpen(false)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border ${active ? 'bg-trafico text-black border-trafico' : 'bg-gray-50 dark:bg-gris-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gris-700'}`}
                    >{l.label}</Link>
                  );
                })}
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setShowNuevaModal(true); }}
                  className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 text-white"
                >Nueva cotización</button>
              </div>
            </aside>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-negro dark:text-gray-200 shadow flex items-center gap-3 px-4 h-14 border-b border-gray-200 dark:border-gris-700">
        <MobileNav />
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
                <Route element={<ProtectedRoute requireRole="produccion" />}>
                  <Route
                    path="/produccion"
                    element={ENABLE_PRODUCCION ? <ProduccionPage /> : <Navigate to="/dashboard" replace state={{ disabled: 'produccion' }} />}
                  />
                </Route>
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
