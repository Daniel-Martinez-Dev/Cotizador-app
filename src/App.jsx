import React, { useEffect, useState } from "react";
import { HashRouter as Router, Routes, Route, useLocation, useNavigate, Outlet, Navigate } from "react-router-dom";
import CotizadorApp from "./pages/CotizadorApp";
import CompaniesPage from "./pages/CompaniesPage";
import PreviewPage from "./pages/PreviewPage";
import HistorialPage from "./pages/HistorialPage";
import ProductsPage from "./pages/ProductsPage";
import ProduccionPage from "./pages/ProduccionPage";
import InventarioPage from "./pages/InventarioPage";
import ContabilidadPage from "./pages/ContabilidadPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import UsuariosPage from "./pages/UsuariosPage";
import PerfilPage from "./pages/PerfilPage";
import EmployeeShell from "./pages/empleado/EmployeeShell";
import EmpleadoHome from "./pages/empleado/EmpleadoHome";
import EmpleadoProduccionList from "./pages/empleado/EmpleadoProduccionList";
import EmpleadoFichaDetalle from "./pages/empleado/EmpleadoFichaDetalle";
import EmpleadoInventarioList from "./pages/empleado/EmpleadoInventarioList";
import { QuoteProvider, useQuote } from "./context/QuoteContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppHeader from "./components/layout/AppHeader";
import AppSidebar from "./components/layout/AppSidebar";
import { seccionDe } from "./components/layout/navSections";
import ConfirmDialog from "./components/ui/ConfirmDialog";
import { Toaster } from 'react-hot-toast';
import { ADMIN_EMAIL, ENABLE_CONTABILIDAD, ENABLE_INVENTARIO, ENABLE_PRODUCCION, REQUIRE_LOGIN } from "./utils/featureFlags";
import { ROLES_ALMACEN, ROLES_PLANTA, soloRolesDePlanta } from "./utils/roles";
// Carga catálogo central (side-effect) para futuras referencias globales
import './data/catalogoProductos';

// Quien solo tiene roles de planta (empleado, almacenista) nunca debe llegar a
// montar AppShell — ni un instante, para que no se alcance a ver el header/nav
// de oficina — así que la decisión se toma antes de renderizarlo, no dentro de
// sus rutas hijas.
function RootGate() {
  const { roles, isMainAdmin } = useAuth();
  if (!isMainAdmin && soloRolesDePlanta(roles)) return <Navigate to="/planta" replace />;
  return <AppShell />;
}

function AppShell() {
  const { quoteData, setQuoteData, setResetToken, setEmpresaSeleccionada, setContactoSeleccionado } = useQuote();
  const { user, profile, signOutUser, hasRole, isMainAdmin } = useAuth();
  const isAdminUser = isMainAdmin || hasRole('admin');
  const canProduccion = ENABLE_PRODUCCION && (isAdminUser || hasRole('produccion'));
  const canInventario = ENABLE_INVENTARIO && (isAdminUser || hasRole('inventario'));
  const canContabilidad = ENABLE_CONTABILIDAD && (isAdminUser || hasRole('contabilidad'));
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
  // El lateral contraído deja el ancho completo a las tablas de Historial e
  // Inventario; la preferencia se recuerda porque quien trabaja todo el día en
  // una tabla no quiere volver a contraerlo en cada arranque.
  const [lateralColapsado, setLateralColapsado] = useState(() => {
    try { return localStorage.getItem('lateralColapsado') === '1'; } catch { return false; }
  });
  const toggleLateral = () => setLateralColapsado(v => {
    try { localStorage.setItem('lateralColapsado', v ? '0' : '1'); } catch {}
    return !v;
  });

  const permisos = React.useMemo(
    () => ({ canProduccion, canInventario, canContabilidad, isAdminUser }),
    [canProduccion, canInventario, canContabilidad, isAdminUser]
  );

  const performNueva = (navigate, currentPath) => {
    setQuoteData({});
    setEmpresaSeleccionada(null);
    setContactoSeleccionado(null);
    setResetToken(Date.now());
    if(currentPath !== '/cotizar') navigate('/cotizar');
    window.scrollTo(0,0);
    setShowNuevaModal(false);
  };

  return (
    <>
      <AppHeader
        permisos={permisos}
        user={user}
        profile={profile}
        dark={dark}
        onToggleTheme={()=> setDark(d=>!d)}
        onSignOut={()=> signOutUser()}
        onNuevaCotizacion={()=> setShowNuevaModal(true)}
        quoteData={quoteData}
        onSalirEdicion={()=> setQuoteData(prev=> ({ ...(prev||{}), modoEdicion:false }))}
        requireLogin={REQUIRE_LOGIN}
      />
      <LateralYContenido
        permisos={permisos}
        colapsado={lateralColapsado}
        onToggle={toggleLateral}
      />
      {showNuevaModal && (
        <NuevaCotizacionModal onClose={()=>setShowNuevaModal(false)} onConfirm={(navigate, path)=>performNueva(navigate, path)} />
      )}
    </>
  );
}

// El lateral y el contenido van juntos porque comparten el ancho: lo que el
// lateral ocupa es exactamente lo que el contenido se corre. Necesita useLocation
// para saber qué sección marcar, así que se queda fuera de AppShell.
function LateralYContenido({ permisos, colapsado, onToggle }) {
  const location = useLocation();
  const actual = seccionDe(location.pathname);
  return (
    <>
      <AppSidebar
        permisos={permisos}
        activaTo={actual?.to}
        colapsado={colapsado}
        onToggle={onToggle}
      />
      {/* La barra mide 57 px; el padding superior deja 8 px de aire bajo ella.
          A la izquierda se corre lo que mida el lateral (240 px / 64 px). */}
      <main
        className={`pt-16 pb-8 bg-gray-50 dark:bg-gris-900 min-h-screen text-gray-900 dark:text-gray-200 transition-[padding] duration-150 ${colapsado ? 'md:pl-16' : 'md:pl-60'}`}
      >
        <Outlet />
      </main>
    </>
  );
}

// Modal de confirmación
function NuevaCotizacionModal({ onClose, onConfirm }){
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <ConfirmDialog
      title="Iniciar nueva cotización"
      message="Se perderán los datos no guardados de la cotización actual. ¿Deseas continuar?"
      confirmLabel="Sí, limpiar"
      onCancel={onClose}
      onConfirm={() => onConfirm(navigate, location.pathname)}
    />
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
              <Route element={<RootGate />}>
                <Route path="/dashboard" element={<DashboardPage />} />

                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/cotizar" element={<CotizadorApp />} />
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
                {/* La cartera y la facturación son del rol "contabilidad" (y
                    del admin): quien no lo tenga rebota al inicio, igual que
                    con producción. */}
                <Route element={<ProtectedRoute requireRole="contabilidad" />}>
                  <Route
                    path="/contabilidad"
                    element={ENABLE_CONTABILIDAD ? <ContabilidadPage /> : <Navigate to="/dashboard" replace state={{ disabled: 'contabilidad' }} />}
                  />
                </Route>
                <Route path="/historial" element={<HistorialPage />} />
                <Route path="/productos" element={<ProductsPage />} />
                <Route path="/empresas" element={<CompaniesPage />} />
                <Route path="/perfil" element={<PerfilPage />} />

                <Route element={<ProtectedRoute requireRole="admin" />}>
                  <Route path="/usuarios" element={<UsuariosPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>

              <Route element={<ProtectedRoute requireAnyRole={ROLES_PLANTA} />}>
                <Route path="/planta" element={<EmployeeShell />}>
                  <Route index element={<EmpleadoHome />} />
                  <Route path="produccion" element={<EmpleadoProduccionList />} />
                  <Route path="produccion/:tipo/:id" element={<EmpleadoFichaDetalle />} />
                  {/* El cuarto de materia prima es solo del almacenista: un
                      empleado de planta que escriba la URL a mano rebota a su
                      inicio, no a la interfaz de oficina. */}
                  <Route element={<ProtectedRoute requireAnyRole={ROLES_ALMACEN} redirectTo="/planta" />}>
                    <Route path="inventario" element={<EmpleadoInventarioList />} />
                  </Route>
                  <Route path="perfil" element={<PerfilPage />} />
                  <Route path="*" element={<Navigate to="/planta" replace />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </Router>
      </QuoteProvider>
    </AuthProvider>
  );
}
