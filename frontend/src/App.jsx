import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Routes, Route, Link, NavLink, useLocation } from "react-router";
import {
  ArrowRight,
  CalendarDays,
  Flag,
  Home,
  Menu,
  Moon,
  Sun,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";

import { useAuth } from "./context/AuthContext";
import RaceWeekBanner from "./components/RaceWeekBanner";
import Calendario from "./pages/Calendario";
import Clasificaciones from "./pages/Clasificaciones";
import PilotoDetalle from "./pages/PilotoDetalle";
import Resultados from "./pages/Resultados";
import Escuderias from "./pages/Escuderias";
import EscuderiaDetalle from "./pages/EscuderiaDetalle";
import Registro from "./pages/Registro";
import Login from "./pages/Login";
import SesionMenu from "./components/SesionMenu";
import MiPerfil from "./pages/MiPerfil";
import FavoritosInicio from "./components/FavoritosInicio";
import TablasInicio from "./components/TablasInicio";

import "./tailwind.css";
import "./App.css";

const enlacesNavegacion = [
  { ruta: "/", nombre: "Inicio", Icono: Home },
  { ruta: "/calendario", nombre: "Calendario", Icono: CalendarDays },
  { ruta: "/resultados", nombre: "Resultados", Icono: Flag },
  { ruta: "/clasificaciones", nombre: "Clasificaciones", Icono: Trophy },
  { ruta: "/escuderias", nombre: "Escuderías", Icono: UsersRound },
];

function ScrollArriba() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [location.key, location.pathname, location.search]);

  return null;
}

function Inicio() {
  const { usuario } = useAuth();
  const reducirMovimiento = useReducedMotion();
  // Recibimos del banner si hay un Gran Premio esta semana (hora argentina).
  const [esSemanaCarrera, setEsSemanaCarrera] = useState(null);

  return (
    <main
      id="inicio"
      className="mx-auto w-full max-w-[1500px] px-3 pb-14 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pt-8"
    >
      {/* FIN DE SEMANA DE CARRERA */}
      <section>
        <motion.div
          initial={reducirMovimiento ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducirMovimiento ? 0 : 0.4 }}
          className="mb-4 flex flex-col gap-3 border-l-4 border-[#e10600] pl-4 sm:mb-5 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="mb-1 font-nav text-xs font-bold uppercase tracking-[0.2em] text-[#e10600]">
              {esSemanaCarrera === true
                ? "FORMULA 1 · RACE WEEK"
                : "FORMULA 1 · CALENDARIO"}
            </p>
            <h2 className="m-0 font-racing text-2xl font-extrabold uppercase italic tracking-tight text-[#15151d] sm:text-3xl dark:text-white">
              {esSemanaCarrera === null
                ? "Calendario de Fórmula 1"
                : esSemanaCarrera
                  ? "Fin de semana de carrera"
                  : "Semana de descanso"}
            </h2>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d6d9e0] bg-white px-4 py-2 font-nav text-sm font-semibold text-[#40424c] dark:border-white/15 dark:bg-white/5 dark:text-gray-300">
            <CalendarDays
              className="h-4 w-4 text-[#e10600]"
              aria-hidden="true"
            />
            Horarios de Argentina
          </span>
        </motion.div>

        <div className="w-full overflow-hidden rounded-2xl border border-[#d9dce3] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#20212b] dark:shadow-[0_18px_60px_rgba(0,0,0,0.3)]">
          <RaceWeekBanner onEstadoSemana={setEsSemanaCarrera} />
        </div>
      </section>

      {/* FAVORITOS Y CLASIFICACIONES: ALINEADOS CON EL RACE WEEK */}
      <div
        className={`inicio-paneles mx-auto! mt-10! grid! w-full! max-w-none! grid-cols-1! items-start! gap-6! px-0! ${
          usuario ? "xl:grid-cols-2!" : "xl:grid-cols-1!"
        }`}
      >
        {usuario && <FavoritosInicio />}
        <TablasInicio />
      </div>
    </main>
  );
}

function App() {
  const location = useLocation();
  const reducirMovimiento = useReducedMotion();
  const lateralRef = useRef(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [headerConSombra, setHeaderConSombra] = useState(false);

  // Modo oscuro predeterminado, con preferencia guardada en el navegador.
  const [modoOscuro, setModoOscuro] = useState(() => {
    try {
      return window.localStorage.getItem("nr-tema") !== "claro";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", modoOscuro);
    document.documentElement.style.colorScheme = modoOscuro ? "dark" : "light";

    try {
      window.localStorage.setItem("nr-tema", modoOscuro ? "oscuro" : "claro");
    } catch {
      // La interfaz sigue funcionando si el almacenamiento está deshabilitado.
    }
  }, [modoOscuro]);

  // La sombra aparece cuando el usuario comienza a desplazarse.
  useEffect(() => {
    const actualizar = () => setHeaderConSombra(window.scrollY > 16);
    actualizar();
    window.addEventListener("scroll", actualizar, { passive: true });
    return () => window.removeEventListener("scroll", actualizar);
  }, []);

  // Cerrar el menú al navegar (también mediante Atrás/Adelante).
  useEffect(() => {
    setMenuAbierto(false);
  }, [location.pathname]);

  // Cerrar el menú con Escape, atrapar Tab y bloquear el scroll del fondo.
  useEffect(() => {
    if (!menuAbierto) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focoAnterior = document.activeElement;
    const panel = lateralRef.current;
    panel?.querySelector("button")?.focus();

    function manejarTeclado(evento) {
      if (evento.key === "Escape") {
        setMenuAbierto(false);
        return;
      }
      if (evento.key !== "Tab" || !panel) return;

      const elementos = [...panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((elemento) => elemento.getClientRects().length > 0);
      if (!elementos.length) return;
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", manejarTeclado);

    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener("keydown", manejarTeclado);
      if (focoAnterior && typeof focoAnterior.focus === "function") focoAnterior.focus();
    };
  }, [menuAbierto]);

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-[#15151d] transition-colors duration-300 dark:bg-[#101116] dark:text-white">
      <ScrollArriba />
      {/* BARRA SUPERIOR */}
      <header className={`sticky top-0 z-40 border-b border-[#dedfe5] backdrop-blur-xl transition-[background-color,box-shadow] duration-300 dark:border-white/10 ${
        headerConSombra
          ? "bg-white/90 shadow-[0_12px_30px_rgba(0,0,0,0.10)] dark:bg-[#15151d]/90 dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
          : "bg-white/95 shadow-sm dark:bg-[#15151d]/95"
      }`}>
        <div className="h-1 w-full bg-[#e10600]" />

        <div className="mx-auto flex min-h-[76px] w-full max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* IDENTIDAD VISUAL */}
          <Link
            to="/"
            className="group flex min-w-0 shrink-0 flex-col no-underline transition-transform duration-200 hover:scale-[1.015] motion-reduce:transform-none"
          >
            <span className="font-racing text-xl font-extrabold uppercase italic tracking-tight text-[#15151d] sm:text-2xl dark:text-white">
              NEUMATICO
              <span className="text-[#e10600] transition-colors group-hover:text-red-500">
                ROJO
              </span>
            </span>
            <span className="font-nav text-[10px] font-bold uppercase tracking-[0.24em] text-[#777b86] dark:text-[#a5a8b4]">
              FORMULA 1 · ESTADÍSTICAS
            </span>
          </Link>

          {/* ENLACES VISIBLES EN ESCRITORIO */}
          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-1 lg:flex"
          >
            {enlacesNavegacion.map((enlace) => (
              <NavLink
                key={enlace.ruta}
                to={enlace.ruta}
                end={enlace.ruta === "/"}
                className={({ isActive }) =>
                  `relative rounded-lg px-3 py-3 font-nav text-[15px] font-bold no-underline transition-colors xl:px-4 ${
                    isActive
                      ? "bg-[#e10600]/10 text-[#e10600] dark:bg-[#e10600]/15 dark:text-[#ff4c46]"
                      : "text-[#292b34] hover:bg-[#f0f1f4] hover:text-[#e10600] dark:text-[#e7e7eb] dark:hover:bg-white/10 dark:hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative z-10">{enlace.nombre}</span>
                    {isActive && (
                      <motion.span
                        layoutId="indicador-navegacion"
                        className="absolute inset-x-3 bottom-1 h-[2px] rounded-full bg-[#e10600]"
                        transition={{ duration: reducirMovimiento ? 0 : 0.22 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* TEMA, CUENTA Y MENÚ LATERAL */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setModoOscuro((anterior) => !anterior)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#dedfe5] bg-[#f6f7fa] text-[#282a34] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#e10600] hover:text-[#e10600] hover:shadow-md active:scale-95 motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e10600] dark:border-white/15 dark:bg-[#292b35] dark:text-white dark:hover:text-[#ff5c56]"
              aria-label={
                modoOscuro ? "Activar modo claro" : "Activar modo oscuro"
              }
              title={modoOscuro ? "Activar modo claro" : "Activar modo oscuro"}
            >
              {modoOscuro ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            <div className="hidden xl:block">
              <SesionMenu />
            </div>

            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#dedfe5] bg-[#f6f7fa] text-[#282a34] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#e10600] hover:text-[#e10600] hover:shadow-md active:scale-95 motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e10600] dark:border-white/15 dark:bg-[#292b35] dark:text-white dark:hover:text-[#ff5c56]"
              aria-label="Abrir menú de navegación"
              aria-expanded={menuAbierto}
              aria-controls="nr-menu-lateral"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* MENÚ LATERAL - MÓVILES Y ESCRITORIO */}
      <AnimatePresence>
        {menuAbierto && (
          <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducirMovimiento ? 0 : 0.2 }}
            aria-label="Cerrar menú"
            onClick={() => setMenuAbierto(false)}
            className="fixed inset-0 z-[90] cursor-default bg-black/65 backdrop-blur-[2px]"
          />

          <motion.aside
            ref={lateralRef}
            initial={reducirMovimiento ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reducirMovimiento ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: reducirMovimiento ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            id="nr-menu-lateral"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="fixed inset-y-0 right-0 z-[100] flex w-[min(88vw,390px)] flex-col overflow-y-auto border-l border-[#dedfe5] bg-[#fafbfc] p-5 shadow-2xl sm:p-7 dark:border-white/10 dark:bg-[#16171e]"
          >
            <div className="mb-7 flex items-center justify-between border-b border-[#dfe1e6] pb-5 dark:border-white/15">
              <div>
                <span className="font-racing text-xl font-extrabold uppercase italic text-[#15151d] dark:text-white">
                  NEUMATICO<span className="text-[#e10600]">ROJO</span>
                </span>
                <p className="mt-1 font-nav text-xs font-semibold uppercase tracking-widest text-[#777b86] dark:text-[#a5a8b4]">
                  MENÚ PRINCIPAL
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#292b34] hover:bg-[#eceef2] dark:text-white dark:hover:bg-white/10"
                aria-label="Cerrar menú lateral"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav
              aria-label="Navegación lateral"
              className="flex flex-col gap-1"
            >
              {enlacesNavegacion.map(({ ruta, nombre, Icono }) => (
                <NavLink
                  key={ruta}
                  to={ruta}
                  end={ruta === "/"}
                  onClick={() => setMenuAbierto(false)}
                  className={({ isActive }) =>
                    `group flex items-center justify-between gap-3 rounded-xl border-l-[3px] px-4 py-3.5 font-nav text-lg font-bold no-underline transition-colors ${
                      isActive
                        ? "border-[#e10600] bg-[#e10600]/10 text-[#c50500] dark:bg-[#e10600]/15 dark:text-[#ff5b55]"
                        : "border-transparent text-[#262831] hover:border-[#e10600] hover:bg-[#f0f1f4] dark:text-[#f1f1f3] dark:hover:bg-white/10"
                    }`
                  }
                >
                  <span className="flex items-center gap-3">
                    <Icono
                      className="h-5 w-5 shrink-0 text-[#e10600]"
                      aria-hidden="true"
                    />
                    {nombre}
                  </span>
                  <ArrowRight
                    className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </NavLink>
              ))}
            </nav>

            {/* CUENTA: VISIBLE AQUÍ CUANDO NO APARECE EN LA CABECERA */}
            <div className="mt-8 border-t border-[#dfe1e6] pt-5 xl:hidden dark:border-white/15">
              <p className="mb-3 font-nav text-xs font-bold uppercase tracking-widest text-[#777b86] dark:text-[#a5a8b4]">
                MI CUENTA
              </p>
              <SesionMenu />
            </div>

            <div className="mt-auto pt-10">
              <p className="border-t border-[#dfe1e6] pt-4 font-nav text-xs text-[#777b86] dark:border-white/15 dark:text-[#9da0ab]">
                Resultados, calendario y estadísticas de Fórmula 1.
              </p>
            </div>
          </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* RUTAS EXISTENTES: mismas URLs y componentes, entrada/salida suave. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={reducirMovimiento ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducirMovimiento ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: reducirMovimiento ? 0 : 0.18 }}
        >
      <Routes location={location}>
        <Route path="/" element={<Inicio />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/clasificaciones" element={<Clasificaciones />} />
        <Route path="/pilotos/:id" element={<PilotoDetalle />} />
        <Route path="/resultados" element={<Resultados />} />
        <Route path="/escuderias" element={<Escuderias />} />
        <Route path="/escuderias/:id" element={<EscuderiaDetalle />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/login" element={<Login />} />
        <Route path="/mi-perfil" element={<MiPerfil />} />
      </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default App;
