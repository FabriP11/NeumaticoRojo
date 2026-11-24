import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import FotoPiloto from "./FotoPiloto";
import { obtenerColorEscuderia } from "../utils/coloresF1";
import {
  AlertCircle,
  ChevronDown,
  LoaderCircle,
  LogIn,
  LogOut,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function SesionMenu() {
  const { usuario, comprobandoSesion, cerrarSesion } = useAuth();
  const reducirMovimiento = useReducedMotion();
  const navigate = useNavigate();

  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const menuRef = useRef(null);

  // Cerrar el menú al hacer clic afuera o presionar Escape.
  useEffect(() => {
    function manejarClickFuera(evento) {
      if (menuRef.current && !menuRef.current.contains(evento.target)) {
        setAbierto(false);
      }
    }

    function manejarTeclado(evento) {
      if (evento.key === "Escape") {
        setAbierto(false);
      }
    }

    document.addEventListener("pointerdown", manejarClickFuera);
    document.addEventListener("keydown", manejarTeclado);

    return () => {
      document.removeEventListener("pointerdown", manejarClickFuera);
      document.removeEventListener("keydown", manejarTeclado);
    };
  }, []);

  // Cerrar sesión sin cambiar el comportamiento actual.
  async function manejarLogout() {
    setError("");
    setCerrando(true);

    try {
      await cerrarSesion();
      setAbierto(false);
      navigate("/", { replace: true });
    } catch (error) {
      setError(error.message);
    } finally {
      setCerrando(false);
    }
  }

  // Estado de comprobación de la sesión.
  if (comprobandoSesion) {
    return (
      <div className="flex items-center gap-2 font-nav text-sm font-semibold text-slate-600 dark:text-slate-300">
        <LoaderCircle
          className="h-4 w-4 animate-spin text-[#e10600]"
          aria-hidden="true"
        />
        <span>Comprobando sesión...</span>
      </div>
    );
  }

  // Opciones cuando el visitante no inició sesión.
  if (!usuario) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 font-nav">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 no-underline transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#e10600] dark:text-slate-100 dark:hover:bg-white/10"
        >
          <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" />
          Iniciar sesión
        </Link>

        <Link
          to="/registro"
          className="inline-flex items-center gap-2 rounded-lg bg-[#e10600] px-3 py-2 text-sm font-bold text-white no-underline shadow-sm transition-colors hover:bg-[#ba0500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e10600]"
        >
          <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
          Registrarse
        </Link>
      </div>
    );
  }

  // Menú del usuario autenticado.
  return (
    <div className="relative font-nav" ref={menuRef}>
      <button
        type="button"
        className="group inline-flex max-w-[240px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-900 shadow-sm transition-colors hover:border-[#e10600]/50 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#e10600] dark:border-white/15 dark:bg-[#20212b] dark:text-white dark:hover:bg-[#292b36]"
        onClick={() => {
          setAbierto((anterior) => !anterior);
          setError("");
        }}
        aria-expanded={abierto}
        aria-controls="menu-cuenta"
      >
        {usuario.id_piloto_avatar ? (
          <FotoPiloto
            idPiloto={usuario.id_piloto_avatar}
            nombre={usuario.nombre_avatar}
            colorEquipo={obtenerColorEscuderia(usuario.id_escuderia_avatar)}
            temporada="2026"
            tamano="sm"
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e10600] font-racing text-sm font-extrabold text-white">
            {usuario.nombre_usuario.charAt(0).toUpperCase()}
          </span>
        )}

        <span className="truncate text-sm font-bold">
          {usuario.nombre_usuario}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-300 ${
            abierto ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            key="menu-cuenta"
            initial={
              reducirMovimiento ? false : { opacity: 0, y: -8, scale: 0.98 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reducirMovimiento
                ? { opacity: 0 }
                : { opacity: 0, y: -8, scale: 0.98 }
            }
            transition={{ duration: reducirMovimiento ? 0 : 0.18 }}
            id="menu-cuenta"
            className="absolute right-0 top-full z-[100] mt-3 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl dark:border-white/15 dark:bg-[#20212b] dark:text-white"
          >
            {/* Identidad de la cuenta */}
            <div className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
              <p className="mb-1 font-racing text-[10px] font-bold uppercase tracking-[0.18em] text-[#e10600]">
                Mi cuenta
              </p>
              <strong className="block truncate text-sm font-bold">
                {usuario.nombre_usuario}
              </strong>
              <span className="mt-1 block break-all text-xs text-slate-500 dark:text-slate-400">
                {usuario.correo}
              </span>
            </div>

            {/* Acceso al perfil */}
            <Link
              to="/mi-perfil"
              className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 no-underline transition-colors hover:bg-slate-100 hover:text-[#e10600] focus-visible:outline-2 focus-visible:outline-[#e10600] dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={() => setAbierto(false)}
            >
              <UserRound
                className="h-4 w-4 shrink-0 text-[#e10600]"
                aria-hidden="true"
              />
              Mi perfil
            </Link>

            <div className="my-2 h-px bg-slate-200 dark:bg-white/10" />

            {/* Cerrar sesión */}
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-red-50 hover:text-[#e10600] focus-visible:outline-2 focus-visible:outline-[#e10600] disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200 dark:hover:bg-[#e10600]/15 dark:hover:text-white"
              onClick={manejarLogout}
              disabled={cerrando}
            >
              {cerrando ? (
                <LoaderCircle
                  className="h-4 w-4 shrink-0 animate-spin text-[#e10600]"
                  aria-hidden="true"
                />
              ) : (
                <LogOut
                  className="h-4 w-4 shrink-0 text-[#e10600]"
                  aria-hidden="true"
                />
              )}
              {cerrando ? "Cerrando..." : "Cerrar sesión"}
            </button>

            {error && (
              <p
                className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SesionMenu;
