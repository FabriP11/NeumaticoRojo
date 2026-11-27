import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DIA,
  MINUTO,
  META_PUBLICA,
  esGPConsolidado,
  esTemporadaHistorica,
  vigenciaCalendario,
} from "../utils/cachePublica";
import { motion, useReducedMotion } from "motion/react";
import { Link, useSearchParams } from "react-router";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  Flag,
  Info,
  MapPin,
  Trophy,
  Zap,
} from "lucide-react";
import { obtenerColorEscuderia } from "../utils/coloresF1";
import FotoPiloto from "../components/FotoPiloto";
import { SkeletonFilas } from "../components/Skeletons";

const TEMPORADAS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];

// Metales con luz superior y sombra interior: solo posiciones 1, 2 y 3 de Carrera.
const ESTILOS_PODIO_CARRERA = {
  1: {
    background:
      "radial-gradient(ellipse at 25% 15%, #fff0b0 0%, #d9a93b 46%, #80520b 100%)",
    color: "#2b1c05",
    borderColor: "#e6c66e",
    boxShadow:
      "inset 0 1px 2px rgba(255,255,255,.5), inset 0 -5px 9px rgba(63,37,0,.28)",
  },
  2: {
    background:
      "radial-gradient(ellipse at 25% 15%, #f8fbff 0%, #b9c1cc 46%, #727b8c 100%)",
    color: "#222938",
    borderColor: "#c9d0d9",
    boxShadow:
      "inset 0 1px 2px rgba(255,255,255,.65), inset 0 -5px 9px rgba(40,47,62,.26)",
  },
  3: {
    background:
      "radial-gradient(ellipse at 25% 15%, #f5c89e 0%, #be7547 46%, #704021 100%)",
    color: "#2b160a",
    borderColor: "#d49970",
    boxShadow:
      "inset 0 1px 2px rgba(255,255,255,.38), inset 0 -5px 9px rgba(55,25,7,.28)",
  },
};

// La API de calendario devuelve el país en inglés. Se vincula con los
// nombres de tus imágenes en frontend/public/banderas/.
const BANDERAS_POR_PAIS = {
  australia: "australia",
  austria: "austria",
  bahrain: "barein",
  bahrein: "barein",
  barein: "barein",
  azerbaijan: "azerbaiyan",
  belgium: "belgica",
  brazil: "brasil",
  brasil: "brasil",
  canada: "canada",
  china: "china",
  hungary: "hungria",
  italy: "italia",
  japan: "japon",
  malaysia: "malasia",
  mexico: "mexico",
  monaco: "monaco",
  netherlands: "holanda",
  holland: "holanda",
  qatar: "qatar",
  saudi_arabia: "arabia",
  saudiarabia: "arabia",
  arabia_saudita: "arabia",
  singapore: "singapur",
  spain: "españa",
  united_arab_emirates: "emiratos",
  uae: "emiratos",
  united_kingdom: "reino_unido",
  great_britain: "reino_unido",
  uk: "reino_unido",
  usa: "usa",
  united_states: "usa",
  united_states_of_america: "usa",
};

function archivoBanderaPais(pais) {
  const clave = String(pais || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z]+/g, "_")
    .replace(/^_|_$/g, "");
  return BANDERAS_POR_PAIS[clave] || null;
}

// Windows oculta las extensiones en la captura. Se prueban los formatos
// habituales sin cambiar el nombre ni el resto de la página.
const EXTENSIONES_BANDERAS = ["avif", "webp", "png", "jpg", "jpeg"];

function BanderaFondoGP({ archivo }) {
  const [indice, setIndice] = useState(0);
  const [lista, setLista] = useState(false);

  if (!archivo || indice >= EXTENSIONES_BANDERAS.length) return null;

  return (
    <img
      src={`/banderas/${archivo}.${EXTENSIONES_BANDERAS[indice]}`}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable="false"
      style={{ objectPosition: "center 38%" }}
      onLoad={() => setLista(true)}
      onError={() => {
        setLista(false);
        setIndice((actual) => actual + 1);
      }}
      className={`pointer-events-none absolute inset-0 h-full w-full scale-[1.06] object-cover saturate-75 blur-[1px] transition-opacity duration-300 dark:scale-100 dark:blur-none ${
        lista ? "opacity-85 dark:opacity-45" : "opacity-0"
      }`}
    />
  );
}

// Utilizamos los resúmenes reales del backend para habilitar una sesión.
// No alcanza con que aparezca en el calendario ni con que haya pasado su horario.
function hayPodio(datos, tipo) {
  return (
    Array.isArray(datos?.resultados?.[tipo]) &&
    datos.resultados[tipo].length > 0
  );
}

function Resultados() {
  const reducirMovimiento = useReducedMotion();
  // La URL define el GP seleccionado (por ejemplo, /resultados?temporada=2025&ronda=3).
  // También permite compartir el enlace o regresar con el navegador.
  const [parametros, setParametros] = useSearchParams();
  const temporadaURL = parametros.get("temporada");
  const rondaURL = parametros.get("ronda");
  const tipoURL = parametros.get("tipo");

  const temporada = TEMPORADAS.includes(temporadaURL) ? temporadaURL : "2026";
  const ronda = /^[1-9]\d*$/.test(rondaURL ?? "") ? rondaURL : "1";
  const tiposValidos = [
    "fp1",
    "fp2",
    "fp3",
    "clasificacion_sprint",
    "sprint",
    "clasificacion",
    "carrera",
  ];
  // La sesión forma parte de la URL: así funcionan los enlaces directos y Atrás/Adelante.
  const tipoSesion = tiposValidos.includes(tipoURL) ? tipoURL : "carrera";
  const esPractica = ["fp1", "fp2", "fp3", "clasificacion_sprint"].includes(
    tipoSesion,
  );
  const esClasificacionSprint = tipoSesion === "clasificacion_sprint";

  const calendario = useQuery({
    queryKey: ["publico", "carreras", temporada],
    queryFn: async ({ signal }) => {
      const respuesta = await fetch(`/api/carreras?temporada=${temporada}`, {
        signal,
      });
      if (!respuesta.ok) throw new Error("No se pudo cargar el calendario");
      const resultado = await respuesta.json();
      if (!Array.isArray(resultado?.carreras))
        throw new Error("Formato de calendario inválido");
      return resultado;
    },
    staleTime: vigenciaCalendario(temporada),
    meta: META_PUBLICA,
  });
  const carreras = calendario.data?.carreras ?? [];
  const cargandoCarreras = !calendario.data && calendario.isPending;
  const errorCarreras =
    !calendario.data && calendario.isError
      ? calendario.error?.message || "No se pudo cargar el calendario"
      : "";
  const carreraSeleccionada = carreras.find(
    (carrera) => String(carrera.round) === ronda,
  );
  const paisGP = carreraSeleccionada?.Circuit?.Location?.country;
  const banderaGP = archivoBanderaPais(paisGP);
  const consolidado = esGPConsolidado(carreraSeleccionada);
  const temporadaHistorica = esTemporadaHistorica(temporada);

  // Guarda por temporada y ronda qué sesiones están publicadas.
  // Durante un fin de semana activo sigue comprobando cada dos minutos.
  const disponibilidad = useQuery({
    queryKey: ["publico", "disponibilidad-sesiones", temporada, ronda],
    enabled: Boolean(carreraSeleccionada),
    queryFn: async ({ signal }) => {
      const obtenerResumen = async (url) => {
        const respuesta = await fetch(url, { signal });
        if (!respuesta.ok)
          throw new Error(`Error comprobando resultados (${respuesta.status})`);
        return respuesta.json();
      };
      const consultas = [
        obtenerResumen(
          `/api/resumen-sesiones?temporada=${temporada}&ronda=${ronda}`,
        ),
        Number(temporada) >= 2023
          ? obtenerResumen(
              `/api/resumen-practicas?temporada=${temporada}&fecha=${carreraSeleccionada.date}`,
            )
          : Promise.resolve(null),
      ];
      const [sesiones, practicas] = await Promise.allSettled(consultas);
      const estado = (respuesta, tipo) =>
        respuesta.status === "rejected"
          ? "error"
          : hayPodio(respuesta.value, tipo)
            ? "disponible"
            : "pendiente";
      return {
        fp1:
          Number(temporada) < 2023 ? "sin_cobertura" : estado(practicas, "fp1"),
        fp2:
          Number(temporada) < 2023 ? "sin_cobertura" : estado(practicas, "fp2"),
        fp3:
          Number(temporada) < 2023 ? "sin_cobertura" : estado(practicas, "fp3"),
        clasificacion_sprint:
          Number(temporada) < 2023
            ? "sin_cobertura"
            : estado(practicas, "clasificacion_sprint"),
        clasificacion: estado(sesiones, "clasificacion"),
        sprint: estado(sesiones, "sprint"),
        carrera: estado(sesiones, "carrera"),
      };
    },
    // No congelar una respuesta «pendiente» antigua: al publicarse una carrera
    // las pestañas deben habilitarse incluso si se visitó el GP días antes.
    staleTime: (consulta) => {
      const publicados = consulta.state.data;
      const esenciales = ["clasificacion", "carrera"];
      if (carreraSeleccionada?.Sprint) esenciales.push("sprint");
      const completo = esenciales.every(
        (tipo) => publicados?.[tipo] === "disponible",
      );
      if (completo && (temporadaHistorica || consolidado)) return Infinity;
      return temporadaHistorica ? DIA : 2 * MINUTO;
    },
    refetchInterval: temporadaHistorica || consolidado ? false : 2 * MINUTO,
    meta: META_PUBLICA,
  });
  const disponibilidadLista = Boolean(disponibilidad.data);
  const estadosSesion = disponibilidad.data ?? {};

  // Cada sesión publicada se guarda por temporada, ronda y tipo de sesión.
  // También ocurre con las rondas pasadas de 2026, no solo con 2020-2025.
  const disponibles =
    disponibilidadLista && estadosSesion[tipoSesion] === "disponible";
  const resultados = useQuery({
    queryKey: ["publico", "resultados", temporada, ronda, tipoSesion],
    enabled: disponibles,
    queryFn: async ({ signal }) => {
      const url =
        tipoSesion === "carrera"
          ? `/api/resultados?temporada=${temporada}&ronda=${ronda}`
          : esPractica
            ? `/api/resultados-practica?temporada=${temporada}&ronda=${ronda}&tipo=${tipoSesion}`
            : `/api/resultados-sesion?temporada=${temporada}&ronda=${ronda}&tipo=${tipoSesion}`;
      const respuesta = await fetch(url, { signal });
      if (respuesta.status === 404) {
        const error = new Error("No hay resultados disponibles de esta sesión");
        error.status = 404;
        throw error;
      }
      if (!respuesta.ok)
        throw new Error("No se pudieron cargar los resultados");
      const resultado = await respuesta.json();
      if (!Array.isArray(resultado?.resultados))
        throw new Error("Formato de resultados inválido");
      return resultado;
    },
    staleTime: temporadaHistorica || consolidado ? Infinity : 5 * MINUTO,
    retry: (intentos, error) => error?.status !== 404 && intentos < 1,
    meta: META_PUBLICA,
  });
  const datos = resultados.data ?? null;
  const cargandoResultados = disponibles && !datos && resultados.isPending;
  const sinResultados = !datos && resultados.error?.status === 404;
  const errorResultados =
    !datos && resultados.isError && !sinResultados
      ? resultados.error?.message || "No se pudieron cargar los resultados"
      : "";

  // CAMBIAR TEMPORADA
  function cambiarTemporada(evento) {
    setParametros({
      temporada: evento.target.value,
      ronda: "1",
      tipo: "carrera",
    });
  }

  // 4. CAMBIAR GRAN PREMIO
  function cambiarRonda(evento) {
    setParametros({ temporada, ronda: evento.target.value, tipo: "carrera" });
  }

  function cambiarSesion(tipo) {
    if (estadosSesion[tipo] !== "disponible") return;
    setParametros({ temporada, ronda, tipo });
  }

  // 5. FORMATEAR FECHA
  function formatearFecha(fecha) {
    return new Date(`${fecha}T12:00:00Z`).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // COMPROBAR SI ESTE GRAN PREMIO TIENE SPRINT
  const tieneSprint = Boolean(carreraSeleccionada?.Sprint);
  const tieneClasificacionSprint = Boolean(
    carreraSeleccionada?.SprintQualifying ||
    carreraSeleccionada?.SprintShootout,
  );

  const esClasificacion = tipoSesion === "clasificacion";

  const nombresSesion = {
    fp1: "RESULTADOS DE PRÁCTICA LIBRE 1",
    fp2: "RESULTADOS DE PRÁCTICA LIBRE 2",
    fp3: "RESULTADOS DE PRÁCTICA LIBRE 3",
    clasificacion_sprint: "RESULTADOS DE CLASIFICACIÓN SPRINT",
    carrera: "RESULTADOS DE CARRERA",
    clasificacion: "RESULTADOS DE CLASIFICACIÓN",
    sprint: "RESULTADOS DE SPRINT",
  };

  const estaCargando =
    cargandoCarreras ||
    (Boolean(carreraSeleccionada) &&
      !disponibilidadLista &&
      disponibilidad.isPending) ||
    cargandoResultados;
  const mensajeError =
    errorCarreras ||
    (!disponibilidad.data && disponibilidad.isError
      ? "No se pudo comprobar la disponibilidad de sesiones"
      : "") ||
    errorResultados;

  const pestanas = [
    ...(carreraSeleccionada?.FirstPractice
      ? [{ id: "fp1", nombre: "FP1", Icono: Clock3 }]
      : []),
    ...(carreraSeleccionada?.SecondPractice
      ? [{ id: "fp2", nombre: "FP2", Icono: Clock3 }]
      : []),
    ...(carreraSeleccionada?.ThirdPractice
      ? [{ id: "fp3", nombre: "FP3", Icono: Clock3 }]
      : []),
    ...(tieneClasificacionSprint
      ? [{ id: "clasificacion_sprint", nombre: "Clasif. Sprint", Icono: Zap }]
      : []),
    ...(tieneSprint ? [{ id: "sprint", nombre: "Sprint", Icono: Zap }] : []),
    { id: "clasificacion", nombre: "Clasificación", Icono: Clock3 },
    { id: "carrera", nombre: "Carrera", Icono: Flag },
  ];

  const primeraDisponible = pestanas.find(
    (pestana) => estadosSesion[pestana.id] === "disponible",
  )?.id;

  // Si una URL intenta abrir una sesión pendiente, mostrar la primera sesión
  // que sí tenga resultados. Se mantiene la ronda y la temporada elegidas.
  useEffect(() => {
    if (!disponibilidadLista || !primeraDisponible) return;
    if (estadosSesion[tipoSesion] === "disponible") return;
    setParametros(
      { temporada, ronda, tipo: primeraDisponible },
      { replace: true },
    );
  }, [
    disponibilidadLista,
    primeraDisponible,
    tipoSesion,
    estadosSesion[tipoSesion],
    temporada,
    ronda,
    setParametros,
  ]);

  const hayResultadosPublicados = Boolean(primeraDisponible);
  const falloDisponibilidad = Object.values(estadosSesion).some(
    (estado) => estado === "error",
  );

  return (
    <main className="min-h-screen bg-[#f4f5f9] px-4 py-5 text-[#15151d] dark:bg-[#101117] dark:text-slate-100 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-3 sm:space-y-4">
        {/* ENCABEZADO COMPACTO */}
        <header className="flex items-center gap-3 border-l-4 border-[#e10600] py-1 pl-4">
          <Trophy
            className="h-7 w-7 shrink-0 text-[#e10600]"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e10600]">
              FÓRMULA 1 · TEMPORADA {temporada}
            </p>
            <h1 className="m-0 font-racing text-2xl font-extrabold uppercase italic tracking-tight text-[#15151d] dark:text-white sm:text-3xl">
              Resultados
            </h1>
          </div>
        </header>

        {/* SELECCIÓN DE EVENTO Y SESIÓN EN UN SOLO RECUADRO */}
        <section
          aria-label="Seleccionar evento y sesión"
          className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1b1c25] p-3 shadow-lg sm:p-4"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0">
              <label
                htmlFor="resultados-temporada"
                className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300"
              >
                <CalendarDays
                  className="h-4 w-4 text-[#e10600]"
                  aria-hidden="true"
                />
                Temporada
              </label>
              <div className="relative">
                <select
                  id="resultados-temporada"
                  value={temporada}
                  onChange={cambiarTemporada}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white dark:border-white/10 dark:bg-[#101117] px-3 py-2.5 pr-10 text-base sm:text-sm font-semibold text-[#15151d] dark:text-white outline-none transition-colors hover:border-slate-400 dark:hover:border-white/25 focus:border-[#e10600] focus:ring-2 focus:ring-[#e10600]/20"
                >
                  {TEMPORADAS.map((anio) => (
                    <option key={anio} value={anio}>
                      Temporada {anio}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="resultados-gp"
                className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300"
              >
                <MapPin className="h-4 w-4 text-[#e10600]" aria-hidden="true" />
                Gran Premio
              </label>
              <div className="relative">
                <select
                  id="resultados-gp"
                  value={ronda}
                  onChange={cambiarRonda}
                  disabled={cargandoCarreras || carreras.length === 0}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white dark:border-white/10 dark:bg-[#101117] px-3 py-2.5 pr-10 text-base sm:text-sm font-semibold text-[#15151d] dark:text-white outline-none transition-colors hover:border-slate-400 dark:hover:border-white/25 focus:border-[#e10600] focus:ring-2 focus:ring-[#e10600]/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {carreras.length === 0 && (
                    <option value="1">Sin Grandes Premios disponibles</option>
                  )}
                  {carreras.map((carrera) => (
                    <option key={carrera.round} value={carrera.round}>
                      Ronda {carrera.round} - {carrera.raceName}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* Pestañas debajo de los selectores, sin otro bloque alto */}
          <div
            className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 dark:border-white/10 pt-3"
            role="group"
            aria-label="Tipo de sesión"
          >
            {pestanas.map(({ id, nombre, Icono }) => {
              const disponible = estadosSesion[id] === "disponible";
              const motivo =
                estadosSesion[id] === "sin_cobertura"
                  ? "OpenF1 no tiene datos de prácticas anteriores a 2023"
                  : estadosSesion[id] === "error"
                    ? "No se pudo comprobar la disponibilidad"
                    : "Resultados todavía no publicados";

              return (
                <button
                  key={id}
                  type="button"
                  disabled={!disponible}
                  title={disponible ? nombre : motivo}
                  onClick={() => cambiarSesion(id)}
                  aria-pressed={disponible && tipoSesion === id}
                  className={`relative inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-extrabold uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e10600] ${
                    !disponible
                      ? "cursor-not-allowed border-slate-100 dark:border-white/5 bg-slate-100 dark:bg-[#20212a] text-slate-500 opacity-60"
                      : tipoSesion === id
                        ? "border-[#e10600] text-white"
                        : "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#252631] text-slate-600 dark:text-slate-300 hover:border-[#e10600]/50 hover:text-[#15151d] dark:hover:text-white"
                  }`}
                >
                  {disponible && tipoSesion === id && (
                    <motion.span
                      layoutId="indicador-sesion-resultados"
                      className="absolute inset-0 rounded-md bg-[#e10600]"
                      transition={
                        reducirMovimiento
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 420, damping: 34 }
                      }
                      aria-hidden="true"
                    />
                  )}
                  <Icono
                    className="relative z-10 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="relative z-10">{nombre}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ESTADOS DE CARGA Y ERROR */}
        {estaCargando && (
          <>
            <div className="dark:hidden">
              <SkeletonFilas cantidad={8} etiqueta="Cargando resultados" />
            </div>
            <div className="hidden dark:block">
              <SkeletonFilas
                oscuro
                cantidad={8}
                etiqueta="Cargando resultados"
              />
            </div>
          </>
        )}

        {!estaCargando && mensajeError && (
          <div
            className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/20 dark:text-red-200"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            Error: {mensajeError}
          </div>
        )}

        {!estaCargando && !mensajeError && !hayResultadosPublicados && (
          <div
            className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1b1c25] p-5 text-sm text-slate-600 dark:text-slate-300"
            role="status"
          >
            <Clock3
              className="h-5 w-5 shrink-0 text-[#e10600]"
              aria-hidden="true"
            />
            {falloDisponibilidad
              ? "No se pudo comprobar la disponibilidad de algunas sesiones. Volvé a intentarlo más tarde."
              : "Todavía no hay resultados publicados para este Gran Premio. Las pestañas se habilitarán cuando estén disponibles."}
          </div>
        )}

        {!estaCargando &&
          !mensajeError &&
          hayResultadosPublicados &&
          sinResultados && (
            <div
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1b1c25] p-5 text-sm text-slate-600 dark:text-slate-300"
              role="status"
            >
              <Info
                className="h-5 w-5 shrink-0 text-[#e10600]"
                aria-hidden="true"
              />
              No hay resultados disponibles de esta sesión.
            </div>
          )}

        {/* DATOS Y TABLA DE RESULTADOS */}
        {!estaCargando &&
          !mensajeError &&
          estadosSesion[tipoSesion] === "disponible" &&
          datos && (
            <motion.div
              key={`${temporada}-${ronda}-${tipoSesion}`}
              initial={reducirMovimiento ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reducirMovimiento ? 0 : 0.3,
                ease: "easeOut",
              }}
              className="space-y-3"
            >
              {/* GRAN PREMIO: FRANJA PEQUEÑA SOBRE LA TABLA */}
              <section className="relative isolate flex min-h-[104px] items-center overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-[#1b1c25] sm:min-h-[92px] sm:px-5">
                {/* Bandera del GP: efecto claro y suave como Calendario; oscuro original en dark. */}
                {banderaGP && (
                  <>
                    <BanderaFondoGP key={banderaGP} archivo={banderaGP} />
                    <div
                      className="pointer-events-none absolute inset-0 bg-white/75 dark:bg-gradient-to-r dark:from-[#11121a]/85 dark:via-[#11121a]/60 dark:to-[#11121a]/80"
                      aria-hidden="true"
                    />
                  </>
                )}
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 z-20 w-1 bg-[#e10600]"
                  aria-hidden="true"
                />
                <div className="relative z-10 flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                  <div className="min-w-0">
                    <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#c9211b] dark:text-[#ff4b47]">
                      {nombresSesion[tipoSesion]}
                    </p>
                    <h2 className="m-0 mt-1 font-racing text-lg font-extrabold uppercase italic leading-tight text-[#15151d] dark:text-white sm:text-xl">
                      {datos.nombre}
                    </h2>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin
                        className="h-3.5 w-3.5 shrink-0 text-[#e10600]"
                        aria-hidden="true"
                      />
                      {datos.circuito?.circuitName || "Circuito no disponible"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays
                        className="h-3.5 w-3.5 shrink-0 text-[#e10600]"
                        aria-hidden="true"
                      />
                      {datos.fecha
                        ? formatearFecha(datos.fecha)
                        : "Fecha no disponible"}
                    </span>
                  </div>
                </div>
              </section>

              <section
                className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1b1c25] shadow-xl"
                aria-label="Tabla de resultados"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 px-4 py-3 sm:px-5">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#15151d] dark:text-white">
                    <Trophy
                      className="h-5 w-5 text-[#e10600]"
                      aria-hidden="true"
                    />
                    Clasificación de la sesión
                  </h3>
                  <span className="rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {datos.resultados.length} pilotos
                  </span>
                </div>

                {/* MÓVIL: cada resultado se lee completo, sin scroll horizontal. */}
                <div className="divide-y divide-slate-200 dark:divide-white/10 md:hidden">
                  {datos.resultados.map((resultado, indice) => {
                    const idPiloto = esPractica
                      ? null
                      : resultado.Driver.driverId;
                    const nombrePiloto = esPractica
                      ? resultado.nombre
                      : `${resultado.Driver.givenName} ${resultado.Driver.familyName}`;
                    const colorEquipo = esPractica
                      ? resultado.color || "#e10600"
                      : obtenerColorEscuderia(
                          resultado.Constructor?.constructorId,
                        );
                    const puesto = Number(resultado.position);
                    const podio = puesto >= 1 && puesto <= 3;
                    const metricas = esPractica
                      ? esClasificacionSprint
                        ? [
                            ["SQ1", resultado.sq1],
                            ["SQ2", resultado.sq2],
                            ["SQ3", resultado.sq3],
                            ["Vueltas", resultado.vueltas],
                          ]
                        : [
                            ["Mejor vuelta", resultado.mejorVuelta],
                            ["Diferencia", resultado.diferencia],
                            ["Vueltas", resultado.vueltas],
                          ]
                      : esClasificacion
                        ? [
                            ["Q1", resultado.Q1],
                            ["Q2", resultado.Q2],
                            ["Q3", resultado.Q3],
                          ]
                        : [
                            ["Parrilla", resultado.grid],
                            [
                              "Tiempo / Estado",
                              resultado.Time?.time || resultado.status,
                            ],
                            ["Puntos", resultado.points],
                          ];

                    return (
                      <article
                        key={idPiloto || resultado.numero || indice}
                        className={`p-4 ${podio ? "bg-[#e10600]/[0.045] dark:bg-[#e10600]/[0.055]" : ""}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#292b35] font-racing text-base font-extrabold text-[#15151d] dark:text-white"
                            style={
                              tipoSesion === "carrera"
                                ? ESTILOS_PODIO_CARRERA[puesto]
                                : undefined
                            }
                          >
                            {resultado.positionText ??
                              resultado.position ??
                              "—"}
                          </span>
                          {esPractica ? (
                            <span
                              className="shrink-0 font-racing text-sm font-extrabold"
                              style={{ color: colorEquipo }}
                            >
                              #{resultado.numero}
                            </span>
                          ) : temporada === "2026" ? (
                            <FotoPiloto
                              idPiloto={idPiloto}
                              nombre={nombrePiloto}
                              colorEquipo={colorEquipo}
                              temporada={temporada}
                              tamano="md"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            {esPractica ? (
                              <strong className="block break-words text-sm text-[#15151d] dark:text-white">
                                {nombrePiloto}
                              </strong>
                            ) : (
                              <Link
                                to={`/pilotos/${idPiloto}?temporada=${temporada}`}
                                className="inline-flex items-start gap-1 break-words text-sm font-bold text-[#15151d] dark:text-white no-underline hover:text-[#ff4b47]"
                              >
                                {nombrePiloto}
                                <ArrowUpRight
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                              </Link>
                            )}
                            <p className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: colorEquipo }}
                                aria-hidden="true"
                              />
                              <span className="min-w-0 break-words">
                                {esPractica
                                  ? resultado.escuderia
                                  : resultado.Constructor?.name || "—"}
                              </span>
                            </p>
                          </div>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {metricas.map(([etiqueta, valor]) => (
                            <div
                              key={etiqueta}
                              className="min-w-0 rounded-lg bg-slate-100 dark:bg-[#111219] px-2.5 py-2"
                            >
                              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {etiqueta}
                              </dt>
                              <dd className="mt-1 break-words font-mono text-xs font-semibold tabular-nums text-[#15151d] dark:text-white">
                                {valor !== null &&
                                valor !== undefined &&
                                valor !== ""
                                  ? valor
                                  : "—"}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </article>
                    );
                  })}
                </div>

                {/* TABLET Y PC: mantener la tabla original sin cambios. */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[740px] border-collapse text-left text-sm">
                    <thead className="bg-slate-100 dark:bg-[#111219] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <tr>
                        <th
                          scope="col"
                          className="px-4 py-4 text-center sm:px-6"
                        >
                          Pos.
                        </th>
                        <th scope="col" className="px-4 py-4 sm:px-6">
                          Piloto
                        </th>
                        {esPractica ? (
                          esClasificacionSprint ? (
                            <>
                              <th scope="col" className="px-4 py-4">
                                SQ1
                              </th>
                              <th scope="col" className="px-4 py-4">
                                SQ2
                              </th>
                              <th scope="col" className="px-4 py-4">
                                SQ3
                              </th>
                              <th
                                scope="col"
                                className="px-4 py-4 text-right sm:pr-6"
                              >
                                Vueltas
                              </th>
                            </>
                          ) : (
                            <>
                              <th scope="col" className="px-4 py-4">
                                Mejor vuelta
                              </th>
                              <th scope="col" className="px-4 py-4">
                                Diferencia
                              </th>
                              <th
                                scope="col"
                                className="px-4 py-4 text-right sm:pr-6"
                              >
                                Vueltas
                              </th>
                            </>
                          )
                        ) : esClasificacion ? (
                          <>
                            <th scope="col" className="px-4 py-4">
                              Q1
                            </th>
                            <th scope="col" className="px-4 py-4">
                              Q2
                            </th>
                            <th scope="col" className="px-4 py-4">
                              Q3
                            </th>
                          </>
                        ) : (
                          <>
                            <th scope="col" className="px-4 py-4">
                              Parrilla
                            </th>
                            <th scope="col" className="px-4 py-4">
                              Tiempo / Estado
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-4 text-right sm:pr-6"
                            >
                              Puntos
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {datos.resultados.map((resultado, indice) => {
                        const idPiloto = esPractica
                          ? null
                          : resultado.Driver.driverId;
                        const nombrePiloto = esPractica
                          ? resultado.nombre
                          : `${resultado.Driver.givenName} ${resultado.Driver.familyName}`;
                        const colorEquipo = esPractica
                          ? resultado.color || "#e10600"
                          : obtenerColorEscuderia(
                              resultado.Constructor?.constructorId,
                            );
                        const puesto = Number(resultado.position);
                        const podio = puesto >= 1 && puesto <= 3;

                        return (
                          <motion.tr
                            key={idPiloto || resultado.numero || indice}
                            initial={
                              reducirMovimiento ? false : { opacity: 0, x: -8 }
                            }
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: reducirMovimiento ? 0 : 0.24,
                              delay: reducirMovimiento
                                ? 0
                                : Math.min(indice, 10) * 0.025,
                            }}
                            className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${podio ? "bg-[#e10600]/[0.045] dark:bg-[#e10600]/[0.055]" : ""}`}
                          >
                            <td className="px-4 py-4 text-center sm:px-6">
                              <span
                                className="inline-flex min-w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#292b35] px-2 py-1.5 font-black text-[#15151d] dark:text-white"
                                style={
                                  tipoSesion === "carrera"
                                    ? ESTILOS_PODIO_CARRERA[puesto]
                                    : undefined
                                }
                              >
                                {resultado.positionText ??
                                  resultado.position ??
                                  "—"}
                              </span>
                            </td>
                            <td className="px-4 py-4 sm:px-6">
                              <div className="flex items-center gap-3">
                                {esPractica ? (
                                  <span
                                    className="min-w-9 text-sm font-extrabold"
                                    style={{ color: colorEquipo }}
                                  >
                                    #{resultado.numero}
                                  </span>
                                ) : temporada === "2026" ? (
                                  <FotoPiloto
                                    idPiloto={idPiloto}
                                    nombre={nombrePiloto}
                                    colorEquipo={colorEquipo}
                                    temporada={temporada}
                                    tamano="md"
                                  />
                                ) : null}
                                <div className="min-w-0">
                                  {esPractica ? (
                                    <span className="font-bold text-[#15151d] dark:text-white">
                                      {nombrePiloto}
                                    </span>
                                  ) : (
                                    <Link
                                      to={`/pilotos/${idPiloto}?temporada=${temporada}`}
                                      className="group inline-flex items-center gap-1.5 font-bold text-[#15151d] dark:text-white no-underline transition-colors hover:text-[#ff4b47]"
                                    >
                                      {nombrePiloto}
                                      <ArrowUpRight
                                        className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-[#ff4b47]"
                                        aria-hidden="true"
                                      />
                                    </Link>
                                  )}
                                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span
                                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                                      style={{ backgroundColor: colorEquipo }}
                                      aria-hidden="true"
                                    />
                                    <span>
                                      {esPractica
                                        ? resultado.escuderia
                                        : resultado.Constructor?.name || "—"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            {esPractica ? (
                              esClasificacionSprint ? (
                                <>
                                  <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                                    {resultado.sq1 || "—"}
                                  </td>
                                  <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                                    {resultado.sq2 || "—"}
                                  </td>
                                  <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                                    {resultado.sq3 || "—"}
                                  </td>
                                  <td className="px-4 py-4 text-right font-bold tabular-nums text-[#15151d] dark:text-white sm:pr-6">
                                    {resultado.vueltas ?? "—"}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-4 font-mono text-xs tabular-nums font-bold text-[#15151d] dark:text-white">
                                    {resultado.mejorVuelta || "—"}
                                  </td>
                                  <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                                    {resultado.diferencia || "—"}
                                  </td>
                                  <td className="px-4 py-4 text-right font-bold tabular-nums text-[#15151d] dark:text-white sm:pr-6">
                                    {resultado.vueltas ?? "—"}
                                  </td>
                                </>
                              )
                            ) : esClasificacion ? (
                              <>
                                <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                                  {resultado.Q1 || "—"}
                                </td>
                                <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                                  {resultado.Q2 || "—"}
                                </td>
                                <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                                  {resultado.Q3 || "—"}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-4 font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                                  {resultado.grid ?? "—"}
                                </td>
                                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                                  {resultado.Time?.time ||
                                    resultado.status ||
                                    "—"}
                                </td>
                                <td className="px-4 py-4 text-right font-black tabular-nums text-[#15151d] dark:text-white sm:pr-6">
                                  <span className="rounded-lg bg-[#e10600]/15 px-3 py-1.5 text-[#ba1f19] dark:text-[#ff5b56]">
                                    {resultado.points ?? "—"}
                                  </span>
                                </td>
                              </>
                            )}
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {datos.resultados.length === 0 && (
                  <p className="border-t border-slate-200 dark:border-white/10 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    No hay resultados disponibles para esta sesión.
                  </p>
                )}
              </section>
            </motion.div>
          )}
      </div>
    </main>
  );
}

export default Resultados;
