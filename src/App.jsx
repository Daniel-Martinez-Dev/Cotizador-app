import React, { useEffect, useState } from "react";
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import CotizadorApp from "./pages/CotizadorApp";
import CompaniesPage from "./pages/CompaniesPage";
import PreviewPage from "./pages/PreviewPage";
import HistorialPage from "./pages/HistorialPage";
import ProductsPage from "./pages/ProductsPage";
import { QuoteProvider, useQuote } from "./context/QuoteContext";
import { Toaster } from 'react-hot-toast';
import logo from "./assets/imagenes/logo.png";
import { seedEmpresasYContactos, migrarQuitarComillas, dedupeEmpresasPorNIT } from './utils/seedData';
// Carga catálogo central (side-effect) para futuras referencias globales
import './data/catalogoProductos';
import toast from 'react-hot-toast';

function Layout() {
  const { quoteData, setQuoteData, setResetToken, setEmpresaSeleccionada, setContactoSeleccionado } = useQuote();
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
  const [seeding, setSeeding] = useState(false);
  const [showSeedLog, setShowSeedLog] = useState(false);
  const [seedLog, setSeedLog] = useState([]);
  const [deduping, setDeduping] = useState(false);

  const handleSeed = async ()=>{
    if(seeding) return; setSeeding(true); setShowSeedLog(true); setSeedLog([]);
    const addLog = (msg)=> setSeedLog(prev=> [...prev, msg]);
    try {
      addLog('Iniciando migración limpieza de comillas...');
      const mig = await migrarQuitarComillas({ onProgress: addLog });
      addLog(`Migración: Empresas limpiadas ${mig.actualizadasEmp}, Contactos limpiados ${mig.actualizadosCont}`);
      addLog('Ejecutando seed CSV...');
      const res = await seedEmpresasYContactos({ onProgress: addLog });
      toast.success('Seed completado');
      addLog(`Resumen: Líneas ${res.lineasProcesadas}, Empresas nuevas ${res.creadasEmp}, Sucursales nuevas ${res.creadosContactos}, Sucursales duplicadas ${res.sucursalesDuplicadas}, Total Empresas BD ${res.totalEmp}`);
    } catch(e){ console.error(e); toast.error('Error seed'); addLog('ERROR: ' + (e.message||e)); }
    finally { setSeeding(false); }
  };

  const handleDedupe = async () => {
    if(deduping) return; setDeduping(true); setShowSeedLog(true); setSeedLog([]);
    const addLog = (msg)=> setSeedLog(prev=> [...prev, msg]);
    try {
      addLog('Iniciando deduplicación por NIT...');
      const res = await dedupeEmpresasPorNIT({ onProgress: addLog });
      addLog(`Resultado: Grupos procesados ${res.gruposProcesados}, Empresas eliminadas ${res.eliminadas}, Contactos movidos ${res.contactosMovidos}, Campos completados ${res.camposActualizados}`);
      toast.success('Deduplicación completada');
    } catch(e){ console.error(e); toast.error('Error dedupe'); addLog('ERROR: '+(e.message||e)); }
    finally { setDeduping(false); }
  };

  const performNueva = (navigate, currentPath) => {
    setQuoteData({});
    setEmpresaSeleccionada(null);
    setContactoSeleccionado(null);
    setResetToken(Date.now());
    if(currentPath !== '/') navigate('/');
    window.scrollTo(0,0);
    setShowNuevaModal(false);
  };

  const NavBar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const handleNueva = () => { setShowNuevaModal(true); };
    const links = [
      { to: '/', label: 'Cotizar' },
      { to: '/productos', label: 'Productos' },
      { to: '/historial', label: 'Historial' },
  { to: '/empresas', label: 'Empresas' }
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
    const links = [
      { to: '/', label: 'Cotizar' },
      { to: '/productos', label: 'Productos' },
      { to: '/historial', label: 'Historial' },
  { to: '/empresas', label: 'Empresas' }
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
        <button
          type="button"
          onClick={handleNueva}
          className="whitespace-nowrap px-3 py-1.5 rounded text-xs font-medium bg-green-600 hover:bg-green-500 text-white"
        >Nueva</button>
      </div>
    );
  };

  return (
  <Router>
        <Toaster position="top-right" />
        <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-negro dark:text-white shadow flex items-center gap-4 px-4 h-14 border-b border-gray-200 dark:border-gris-700">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logo} alt="Logo" className="h-10 w-auto select-none" />
            <span className="font-semibold text-sm sm:text-base tracking-wide group-hover:text-trafico dark:group-hover:text-trafico transition-colors">Cotizador Cold Chain Services</span>
          </Link>
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
            className="ml-auto text-xs sm:text-sm px-3 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800 hover:bg-gray-100 dark:hover:bg-gris-700 text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-trafico/60"
            title="Cambiar tema"
          >{dark ? 'Claro' : 'Oscuro'}</button>
          <button
            onClick={handleSeed}
            className="hidden md:inline-flex text-xs sm:text-sm px-3 py-1.5 rounded border border-dashed border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            title="Cargar datos de ejemplo"
          >{seeding? 'Seeding...' : 'Seed'}</button>
          <button
            onClick={handleDedupe}
            className="hidden md:inline-flex text-xs sm:text-sm px-3 py-1.5 rounded border border-dashed border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
            title="Eliminar empresas duplicadas por NIT"
          >{deduping? 'Depurando...' : 'Dedupe'}</button>
        </header>
        <MobileNav />
        <main className="pt-16 md:pt-16 pb-8 bg-gray-50 dark:bg-gris-900 min-h-screen text-gray-900 dark:text-gray-100 transition-colors">
          <Routes>
            <Route path="/" element={<CotizadorApp />} />
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/historial" element={<HistorialPage />} />
            <Route path="/productos" element={<ProductsPage />} />
            <Route path="/empresas" element={<CompaniesPage />} />
          </Routes>
        </main>
        {showNuevaModal && (
          <NuevaCotizacionModal onClose={()=>setShowNuevaModal(false)} onConfirm={(navigate, path)=>performNueva(navigate, path)} />
        )}
        {showSeedLog && (
          <div className="fixed bottom-4 right-4 w-80 max-h-72 bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-600 rounded shadow-lg flex flex-col text-xs">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gris-600 flex items-center justify-between">
              <span className="font-semibold">Seed Log</span>
              <div className="flex gap-2">
                <button onClick={()=>setSeedLog([])} className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gris-700">Limpiar</button>
                <button onClick={()=>setShowSeedLog(false)} className="text-[10px] px-2 py-0.5 rounded bg-red-500 text-white">Cerrar</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1">
              {seedLog.map((l,i)=>(<div key={i} className="leading-snug">{l}</div>))}
              {seeding && <div className="italic opacity-70">Procesando...</div>}
            </div>
          </div>
        )}
      </Router>
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
    <QuoteProvider>
      <Layout />
    </QuoteProvider>
  );
}
