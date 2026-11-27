import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
    if (!abierto && botonRef.current) {
      const rectangulo = botonRef.current.getBoundingClientRect();
      setPosicion({
        top: rectangulo.bottom + 8,
        right: Math.max(8, window.innerWidth - rectangulo.right),
      });
    }
    setAbierto((valor) => !valor);
  }

  // El menú se monta fuera del banner para no quedar recortado por overflow-hidden.
  useEffect(() => {
    if (!abierto) return;
    const cerrarAlClicar = (evento) => {
      if (
        !botonRef.current?.contains(evento.target) &&
        !menuRef.current?.contains(evento.target)
      ) {
        setAbierto(false);
      }
    };
    const cerrarConEscape = (evento) => {
      if (evento.key === "Escape") setAbierto(false);
    };
    const cerrarAlMover = (evento) => {
      // Permitir desplazarse dentro del menú en pantallas pequeñas.
      if (evento?.type === "scroll" && menuRef.current?.contains(evento.target)) return;
      setAbierto(false);
    };

    document.addEventListener("pointerdown", cerrarAlClicar);
    document.addEventListener("keydown", cerrarConEscape);
    window.addEventListener("resize", cerrarAlMover);
    window.addEventListener("scroll", cerrarAlMover, true);
    return () => {
      document.removeEventListener("pointerdown", cerrarAlClicar);
      document.removeEventListener("keydown", cerrarConEscape);
      window.removeEventListener("resize", cerrarAlMover);
      window.removeEventListener("scroll", cerrarAlMover, true);
    };
  }, [abierto]);

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
    } catch (err) {
      setError(err.message);
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
        aria-label="Configurar recordatorios de Fórmula 1"
        aria-expanded={abierto}
        aria-haspopup="dialog"
        title="Recordatorios por correo o Telegram"
        className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d7dce6] bg-white/90 text-[#293141] shadow-sm transition-colors hover:border-[#e10600] hover:bg-[#e10600] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e10600] dark:border-white/20 dark:bg-black/55 dark:text-white dark:shadow-none dark:focus-visible:outline-white"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {activo && (
          <span
            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white bg-[#e10600] dark:border-[#101116]"
            aria-hidden="true"
          />
        )}
      </button>

      {abierto &&
        createPortal(
          <div
            ref={menuRef}
            role="dialog"
            aria-label="Recordatorios de Fórmula 1"
            style={{ position: "fixed", top: posicion.top, right: posicion.right, zIndex: 9999 }}
            className="max-h-[min(76vh,510px)] w-[min(350px,calc(100vw-16px))] overflow-y-auto rounded-xl border border-[#dfe3ea] bg-white p-4 text-[#20232c] shadow-[0_16px_50px_rgba(0,0,0,.18)] dark:border-white/20 dark:bg-[#171923] dark:text-white dark:shadow-[0_16px_50px_rgba(0,0,0,.7)]"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="m-0 flex items-center gap-2 font-nav text-sm font-bold">
                <BellRing className="h-4 w-4 text-[#ff5656]" />
                Recordatorios
              </h3>
              <button
                onClick={() => setAbierto(false)}
                aria-label="Cerrar recordatorios"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#667085] hover:bg-[#f1f2f5] hover:text-[#181a22] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!usuario ? (
              <div className="mt-4 space-y-3 font-nav text-sm">
                <p className="text-[#697283] dark:text-white/75">Iniciá sesión para elegir qué sesiones querés seguir.</p>
                <Link
                  to="/login"
                  onClick={() => setAbierto(false)}
                  className="inline-block rounded-lg bg-[#e10600] px-4 py-2 font-bold text-white no-underline"
                >
                  Iniciar sesión
                </Link>
              </div>
            ) : cargando ? (
              <p className="mt-4 flex items-center gap-2 font-nav text-sm text-[#687182] dark:text-white/70">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Cargando preferencias...
              </p>
            ) : (
              <div className="mt-3 font-nav text-sm">
                <p className="text-xs leading-5 text-[#626c7b] dark:text-white/70">
                  {carrera
                    ? `Sesiones programadas para ${carrera.raceName}. Elegí cuáles querés seguir por los canales que activaste en Mi Perfil.`
                    : "Todavía no hay un próximo Gran Premio con horarios disponibles."}
                </p>

                <div className="mt-3 space-y-2">
                  {opcionesDisponibles.map((opcion) => (
                    <label key={opcion.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-0.5 hover:bg-[#f1f2f6] dark:hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={sesiones.includes(opcion.id)}
                        onChange={() => alternarSesion(opcion.id)}
                        className="h-4 w-4 accent-[#e10600]"
                      />
                      <span>{opcion.nombre}</span>
                    </label>
                  ))}
                  {opcionesDisponibles.length === 0 && (
                    <p className="text-xs text-[#758093] dark:text-white/60">
                      No hay sesiones futuras configurables en este momento.
                    </p>
                  )}
                </div>

                <div className="mt-4 border-t border-[#e3e6ed] pt-3 dark:border-white/15">
                  <p className="mb-2 text-xs font-bold text-[#4f5867] dark:text-white/80">Avisarme antes de la sesión</p>
                  <div className="flex gap-2">
                    {[5, 10].map((valor) => (
                      <button
                        type="button"
                        key={valor}
                        onClick={() => { setMinutos(valor); setMensaje(""); }}
                        aria-pressed={minutos === valor}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${minutos === valor ? "border-[#e10600] bg-[#e10600] text-white" : "border-[#dbe0e8] bg-[#f7f8fb] text-[#475164] hover:border-[#e10600] dark:border-white/20 dark:bg-white/5 dark:text-white/80 dark:hover:border-white/50"}`}
                      >
                        {valor} minutos
                      </button>
                    ))}
                  </div>
                </div>

                <p className="mt-3 flex items-center gap-2 text-xs text-[#687283] dark:text-white/65">
                  <Mail className="h-4 w-4 shrink-0" /> Correo / Telegram: <Link to="/mi-perfil" onClick={() => setAbierto(false)} className="font-semibold text-[#b91c1c] underline dark:text-[#ff8d89]">configurá los canales</Link>
                </p>
                {error && <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>}
                {mensaje && (
                  <p role="status" className="mt-2 flex items-center gap-1 text-xs text-green-700 dark:text-green-300">
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
                {activo && (
                  <button
                    type="button"
                    onClick={() => guardar(false)}
                    disabled={guardando}
                    className="mt-2 w-full rounded-lg border border-[#dbe0e8] px-3 py-2 text-xs font-semibold text-[#475164] hover:bg-[#f1f2f6] disabled:opacity-40 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/10"
                  >
                    Desactivar recordatorios
                  </button>
                )}
                <p className="mt-3 text-[11px] leading-4 text-[#687283] dark:text-white/60">
                  Las preferencias se mantienen para futuros Grandes Premios que tengan esas mismas sesiones.
                  Las opciones de otros formatos no se borran al cambiar de GP.
                </p>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
