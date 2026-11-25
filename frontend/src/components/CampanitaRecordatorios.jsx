import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Link } from "react-router";
import { Bell, BellRing, Check, LoaderCircle, Mail, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchConSesion } from "../utils/fetchConSesion";

// Las preferencias siguen siendo globales: se aplican a próximos GP que
// incluyan esas sesiones. El menú solo muestra las del GP actual/próximo.
const OPCIONES = [
  { id: "fp1", nombre: "Práctica libre 1" },
  { id: "fp2", nombre: "Práctica libre 2" },
  { id: "fp3", nombre: "Práctica libre 3" },
  { id: "clasificacion_sprint", nombre: "Clasificación Sprint" },
  { id: "sprint", nombre: "Carrera Sprint" },
  { id: "clasificacion", nombre: "Clasificación" },
  { id: "carrera", nombre: "Carrera" },
];

// Claves que llegan desde el mismo calendario Jolpica usado por Race Week.
// En fines de semana Sprint no siempre hay FP2 ni FP3.
const CLAVES_CALENDARIO = {
  fp1: ["FirstPractice"],
  fp2: ["SecondPractice"],
  fp3: ["ThirdPractice"],
  clasificacion_sprint: ["SprintQualifying", "SprintShootout"],
  sprint: ["Sprint"],
  clasificacion: ["Qualifying"],
};

function estaProgramada(carrera, tipo) {
  if (!carrera) return false;
  if (tipo === "carrera") return Boolean(carrera.date);
  return (CLAVES_CALENDARIO[tipo] || []).some(
    (clave) => Boolean(carrera[clave]?.date),
  );
}

export default function CampanitaRecordatorios({ carrera }) {
  const { usuario } = useAuth();
  const botonRef = useRef(null);
  const menuRef = useRef(null);
  const dragControls = useDragControls();
  const reducirMovimiento = useReducedMotion();
  const [esMovil, setEsMovil] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, right: 12 });
  const [sesiones, setSesiones] = useState([]);
  const [minutos, setMinutos] = useState(10);
  const [activo, setActivo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const opcionesDisponibles = OPCIONES.filter((opcion) =>
    estaProgramada(carrera, opcion.id),
  );
  const seleccionadasDisponibles = opcionesDisponibles.filter((opcion) =>
    sesiones.includes(opcion.id),
  );

  function abrirOCerrar() {
    if (!abierto && !esMovil && botonRef.current) {
      const rectangulo = botonRef.current.getBoundingClientRect();
      setPosicion({
        top: rectangulo.bottom + 8,
        right: Math.max(8, window.innerWidth - rectangulo.right),
      });
    }
    setAbierto((valor) => !valor);
  }

  // Cambiar entre bottom sheet (móvil) y desplegable (escritorio).
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const actualizar = () => setEsMovil(media.matches);
    actualizar();
    media.addEventListener("change", actualizar);
    return () => media.removeEventListener("change", actualizar);
  }, []);

  // Escape, foco y scroll: en móvil el fondo queda bloqueado, no el panel.
  useEffect(() => {
    if (!abierto) return;

    const overflowAnterior = document.body.style.overflow;
    if (esMovil) document.body.style.overflow = "hidden";

    const elementoAnterior = document.activeElement;
    menuRef.current?.querySelector('button[aria-label="Cerrar recordatorios"]')?.focus();

    const cerrarConTeclado = (evento) => {
      if (evento.key === "Escape") {
        setAbierto(false);
        return;
      }
      if (evento.key !== "Tab" || !esMovil || !menuRef.current) return;

      const elementos = [...menuRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((elemento) => elemento.getClientRects().length > 0);
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
    };

    const cerrarFuera = (evento) => {
      if (esMovil) return; // En móvil lo gestiona el fondo oscurecido.
      if (
        !botonRef.current?.contains(evento.target) &&
        !menuRef.current?.contains(evento.target)
      ) setAbierto(false);
    };

    const cerrarAlMover = (evento) => {
      if (esMovil || menuRef.current?.contains(evento.target)) return;
      setAbierto(false);
    };

    document.addEventListener("keydown", cerrarConTeclado);
    document.addEventListener("pointerdown", cerrarFuera);
    if (!esMovil) {
      window.addEventListener("resize", cerrarAlMover);
      window.addEventListener("scroll", cerrarAlMover, true);
    }

    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener("keydown", cerrarConTeclado);
      document.removeEventListener("pointerdown", cerrarFuera);
      window.removeEventListener("resize", cerrarAlMover);
      window.removeEventListener("scroll", cerrarAlMover, true);
      if (elementoAnterior?.isConnected && typeof elementoAnterior.focus === "function") {
        elementoAnterior.focus();
      }
    };
  }, [abierto, esMovil]);

  // Evitar que la campanita muestre el estado de otra cuenta al cerrar sesión.
  useEffect(() => {
    setActivo(false);
    setSesiones([]);
    setMinutos(10);
  }, [usuario?.id_usuario]);

  useEffect(() => {
    if (!usuario) return;
    const controller = new AbortController();
    setCargando(true);
    setError("");
    setMensaje("");

    async function consultar() {
      try {
        const respuesta = await fetchConSesion("/api/notificaciones/preferencias", {
          credentials: "include",
          signal: controller.signal,
        });
        if (!respuesta.ok) throw new Error("No se pudieron cargar tus preferencias");
        const datos = await respuesta.json();
        if (!controller.signal.aborted) {
          setSesiones(datos.sesiones || []);
          setMinutos(datos.minutos_antes || 10);
          setActivo(Boolean(datos.activo));
        }
      } catch (err) {
        if (err.name !== "AbortError" && !controller.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }

    consultar();
    return () => controller.abort();
  }, [usuario?.id_usuario]);

  function alternarSesion(id) {
    setMensaje("");
    setSesiones((actual) =>
      actual.includes(id)
        ? actual.filter((sesion) => sesion !== id)
        : [...actual, id],
    );
  }

  async function guardar(nuevoActivo) {
    if (!usuario) return;
    setGuardando(true);
    setMensaje("");
    setError("");
    try {
      const respuesta = await fetchConSesion("/api/notificaciones/preferencias", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activo: nuevoActivo,
          minutos_antes: minutos,
          sesiones,
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudo guardar");
      setActivo(Boolean(datos.activo));
      setMensaje(nuevoActivo ? "Preferencias guardadas" : "Recordatorios desactivados");
      toast.success(nuevoActivo ? "Recordatorios guardados" : "Recordatorios desactivados");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={abrirOCerrar}
        aria-label="Configurar recordatorios por correo"
        aria-expanded={abierto}
        aria-haspopup="dialog"
        title="Recordatorios por correo"
        className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-black/55 text-white transition-colors hover:border-[#e10600] hover:bg-[#e10600] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {activo && (
          <span
            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-[#101116] bg-[#e10600]"
            aria-hidden="true"
          />
        )}
      </button>

      {createPortal(
        <AnimatePresence initial={false}>
          {abierto && (
            <>
              {esMovil && (
                <motion.button
                  key="fondo-recordatorios"
                  type="button"
                  aria-label="Cerrar recordatorios"
                  onClick={() => setAbierto(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducirMovimiento ? 0 : 0.2 }}
                  className="fixed inset-0 z-[9998] cursor-default bg-black/65 backdrop-blur-[2px]"
                />
              )}
              <motion.div
                key="panel-recordatorios"
                ref={menuRef}
                role="dialog"
                aria-modal={esMovil ? "true" : undefined}
                aria-label="Recordatorios de Fórmula 1"
                style={esMovil ? undefined : { top: posicion.top, right: posicion.right }}
                initial={reducirMovimiento ? false : esMovil ? { y: "100%" } : { opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reducirMovimiento ? { opacity: 0 } : esMovil ? { y: "100%" } : { opacity: 0, y: -8, scale: 0.98 }}
                transition={reducirMovimiento ? { duration: 0 } : esMovil ? { type: "spring", stiffness: 360, damping: 34 } : { duration: 0.18 }}
                drag={esMovil && !reducirMovimiento ? "y" : false}
                dragListener={false}
                dragControls={dragControls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.35 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 95 || info.velocity.y > 650) setAbierto(false);
                }}
                className={`fixed z-[9999] flex flex-col overflow-hidden border border-white/20 bg-[#171923] text-white shadow-[0_16px_50px_rgba(0,0,0,.7)] ${
                  esMovil
                    ? "inset-x-0 bottom-0 max-h-[88dvh] w-full rounded-t-[28px] border-b-0 pb-[env(safe-area-inset-bottom)]"
                    : "max-h-[min(76vh,510px)] w-[min(350px,calc(100vw-16px))] rounded-xl"
                }`}
              >
                {esMovil && (
                  <div
                    className="flex shrink-0 touch-none justify-center px-4 pb-1 pt-3"
                    onPointerDown={(evento) => {
                      if (!reducirMovimiento) dragControls.start(evento);
                    }}
                  >
                    <span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-white/30" />
                  </div>
                )}
                <div className="shrink-0 px-4 pt-3 pb-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="m-0 flex items-center gap-2 font-nav text-sm font-bold">
                      <BellRing className="h-4 w-4 text-[#ff5656]" />
                      Recordatorios
                    </h3>
                    <button
                      onClick={() => setAbierto(false)}
                      aria-label="Cerrar recordatorios"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                </div>
                <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-4">
                  {!usuario ? (
                    <div className="mt-4 space-y-3 font-nav text-sm">
                      <p className="text-white/75">Iniciá sesión para elegir qué sesiones querés seguir.</p>
                      <Link
                        to="/login"
                        onClick={() => setAbierto(false)}
                        className="inline-block rounded-lg bg-[#e10600] px-4 py-2 font-bold text-white no-underline"
                      >
                        Iniciar sesión
                      </Link>
                    </div>
                  ) : cargando ? (
                    <p className="mt-4 flex items-center gap-2 font-nav text-sm text-white/70">
                      <LoaderCircle className="h-4 w-4 animate-spin" /> Cargando preferencias...
                    </p>
                  ) : (
                    <div className="mt-3 font-nav text-sm">
                      <p className="text-xs leading-5 text-white/70">
                        {carrera
                          ? `Sesiones programadas para ${carrera.raceName}. Elegí cuáles querés seguir por correo.`
                          : "Todavía no hay un próximo Gran Premio con horarios disponibles."}
                      </p>

                      <div className="mt-3 space-y-2">
                        {opcionesDisponibles.map((opcion) => (
                          <label key={opcion.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-0.5 hover:bg-white/5">
                            <input
                              type="checkbox"
                              checked={sesiones.includes(opcion.id)}
                              onChange={() => alternarSesion(opcion.id)}
                              className="peer sr-only"
                            />
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/30 bg-white/5 transition-colors peer-checked:border-[#e10600] peer-checked:bg-[#e10600] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white">
                              <motion.span
                                initial={false}
                                animate={{ scale: sesiones.includes(opcion.id) ? 1 : 0, opacity: sesiones.includes(opcion.id) ? 1 : 0 }}
                                transition={{ duration: reducirMovimiento ? 0 : 0.18 }}
                              >
                                <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                              </motion.span>
                            </span>
                            <span>{opcion.nombre}</span>
                          </label>
                        ))}
                        {opcionesDisponibles.length === 0 && (
                          <p className="text-xs text-white/60">
                            No hay sesiones futuras configurables en este momento.
                          </p>
                        )}
                      </div>

                      <div className="mt-4 border-t border-white/15 pt-3">
                        <p className="mb-2 text-xs font-bold text-white/80">Avisarme antes de la sesión</p>
                        <div className="flex gap-2">
                          {[5, 10].map((valor) => (
                            <button
                              type="button"
                              key={valor}
                              onClick={() => { setMinutos(valor); setMensaje(""); }}
                              aria-pressed={minutos === valor}
                              className={`relative flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${minutos === valor ? "border-[#e10600] text-white" : "border-white/20 bg-white/5 text-white/80 hover:border-white/50"}`}
                            >
                              {minutos === valor && (
                                <motion.span
                                  layoutId="indicador-minutos-recordatorios"
                                  className="absolute inset-0 rounded-md bg-[#e10600]"
                                  transition={reducirMovimiento ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 }}
                                  aria-hidden="true"
                                />
                              )}
                              <span className="relative z-10">{valor} minutos</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <p className="mt-3 flex items-center gap-2 text-xs text-white/65">
                        <Mail className="h-4 w-4 shrink-0" /> Al correo de tu cuenta
                      </p>
                      {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
                      {mensaje && (
                        <p role="status" className="mt-2 flex items-center gap-1 text-xs text-green-300">
                          <Check className="h-4 w-4" /> {mensaje}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => guardar(true)}
                        disabled={guardando || seleccionadasDisponibles.length === 0}
                        className="mt-3 w-full rounded-lg bg-[#e10600] px-3 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {guardando ? "Guardando..." : "Guardar recordatorios"}
                      </button>
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                        <span className="text-xs font-semibold text-white/85">Recordatorios {activo ? "activados" : "desactivados"}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-label="Activar o desactivar recordatorios por correo"
                          aria-checked={activo}
                          disabled={guardando || (!activo && seleccionadasDisponibles.length === 0)}
                          onClick={() => guardar(!activo)}
                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40 ${activo ? "border-[#e10600] bg-[#e10600]" : "border-white/25 bg-white/15"}`}
                        >
                          <motion.span
                            initial={false}
                            animate={{ x: activo ? 22 : 3 }}
                            transition={reducirMovimiento ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 32 }}
                            className="h-5 w-5 rounded-full bg-white shadow"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                      <p className="mt-3 text-[11px] leading-4 text-white/60">
                        Las preferencias se mantienen para futuros Grandes Premios que tengan esas mismas sesiones.
                        Las opciones de otros formatos no se borran al cambiar de GP.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
