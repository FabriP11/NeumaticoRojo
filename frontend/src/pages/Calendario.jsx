import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CalendarRange,
  CalendarX2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Flag,
  Globe2,
  LoaderCircle,
  MapPin,
} from "lucide-react";

const ZONA_ARGENTINA = "America/Argentina/Buenos_Aires";
const TEMPORADAS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];

// Países que devuelve el calendario de F1 (Jolpica/Ergast).
// Se utilizan códigos ISO para mostrar las banderas circulares.
const BANDERAS = {
  Australia: "au",
  Bahrain: "bh",
  Belgium: "be",
  Brazil: "br",
  Canada: "ca",
  China: "cn",
  France: "fr",
  Germany: "de",
  Hungary: "hu",
  Italy: "it",
  Japan: "jp",
  Mexico: "mx",
  Monaco: "mc",
  Netherlands: "nl",
  Austria: "at",
  Portugal: "pt",
  Qatar: "qa",
  Russia: "ru",
  "Saudi Arabia": "sa",
  Saudi: "sa",
  Singapore: "sg",
  Spain: "es",
  Turkey: "tr",
  Türkiye: "tr",
  UK: "gb",
  "Great Britain": "gb",
  "United Kingdom": "gb",
  USA: "us",
  "United States": "us",
  "United States of America": "us",
  "United Arab Emirates": "ae",
  UAE: "ae",
  Azerbaijan: "az",
};

// Fondos PNG guardados en frontend/public/circuitos/calendario/.
// Preferimos identificar el circuito, ya que puede haber varios GP en un mismo país.
const FONDOS_POR_CIRCUITO = {
  albert_park: "australiagp",
  shanghai: "chinagp",
  suzuka: "japongp",
  miami: "miamigp",
  villeneuve: "canadagp",
  monaco: "monacogp",
  catalunya: "barcelonagp",
  red_bull_ring: "austriagp",
  silverstone: "granbretañagp",
  spa: "belgicagp",
  hungaroring: "hungriagp",
  zandvoort: "holandagp",
  monza: "monzagp",
  baku: "bakugp",
  marina_bay: "singapurgp",
  americas: "usagp",
  rodriguez: "mexicogp",
  interlagos: "brasilgp",
  losail: "catargp",
  yas_marina: "dubaigp",
  vegas: "vegasgp",
  las_vegas: "vegasgp",
  madring: "madringgp",
  madrid: "madringgp",
  sepang: "malasyagp",
};

function obtenerImagenFondoGP(carrera) {
  const id = String(carrera.Circuit?.circuitId || "").toLowerCase();
  const nombre = String(carrera.raceName || "").toLowerCase();
  const pais = String(carrera.Circuit?.Location?.country || "").toLowerCase();

  let archivo = FONDOS_POR_CIRCUITO[id];

  // Alternativa para nombres de circuito que puedan variar según la API.
  if (!archivo) {
    if (nombre.includes("miami")) archivo = "miamigp";
    else if (nombre.includes("las vegas")) archivo = "vegasgp";
    else if (nombre.includes("madrid")) archivo = "madringgp";
    else if (nombre.includes("barcelona") || nombre.includes("catalunya"))
      archivo = "barcelonagp";
    else if (nombre.includes("abu dhabi")) archivo = "dubaigp";
    else if (nombre.includes("são paulo") || nombre.includes("sao paulo"))
      archivo = "brasilgp";
    else if (nombre.includes("emilia romagna"))
      archivo = null; // No usar Monza para Imola.
    else if (nombre.includes("italian")) archivo = "monzagp";
    else if (nombre.includes("australian")) archivo = "australiagp";
    else if (nombre.includes("austrian")) archivo = "austriagp";
    else if (nombre.includes("belgian")) archivo = "belgicagp";
    else if (nombre.includes("brazilian")) archivo = "brasilgp";
    else if (nombre.includes("canadian")) archivo = "canadagp";
    else if (nombre.includes("chinese")) archivo = "chinagp";
    else if (nombre.includes("japanese")) archivo = "japongp";
    else if (nombre.includes("mexico")) archivo = "mexicogp";
    else if (nombre.includes("monaco")) archivo = "monacogp";
    else if (nombre.includes("dutch")) archivo = "holandagp";
    else if (nombre.includes("hungarian")) archivo = "hungriagp";
    else if (nombre.includes("british")) archivo = "granbretañagp";
    else if (nombre.includes("azerbaijan")) archivo = "bakugp";
    else if (nombre.includes("singapore")) archivo = "singapurgp";
    else if (nombre.includes("qatar")) archivo = "catargp";
    else if (nombre.includes("malaysian")) archivo = "malasyagp";
    else if (nombre.includes("spanish")) archivo = "barcelonagp";
    else if (nombre.includes("united states")) archivo = "usagp";
  }

  // Último recurso: países con un único fondo disponible.
  if (!archivo) {
    const fondosPorPais = {
      australia: "australiagp",
      china: "chinagp",
      japan: "japongp",
      canada: "canadagp",
      monaco: "monacogp",
      austria: "austriagp",
      belgium: "belgicagp",
      hungary: "hungriagp",
      netherlands: "holandagp",
      "great britain": "granbretañagp",
      uk: "granbretañagp",
      azerbaijan: "bakugp",
      singapore: "singapurgp",
      qatar: "catargp",
      malaysia: "malasyagp",
      mexico: "mexicogp",
      brazil: "brasilgp",
      "united arab emirates": "dubaigp",
      uae: "dubaigp",
    };
    archivo = fondosPorPais[pais];
  }

  return archivo ? `/circuitos/calendario/${archivo}.png` : null;
}

function BanderaCircular({ pais }) {
  const codigo = BANDERAS[pais];

  return (
    <span
      className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-500 shadow-sm dark:border-white/15 dark:bg-[#313540] dark:text-slate-300"
      aria-hidden="true"
    >
      <Globe2 className="absolute h-5 w-5" />
      {codigo && (
        <img
          src={`https://flagcdn.com/w80/${codigo}.png`}
          alt=""
          loading="lazy"
          className="relative h-full w-full object-cover"
          onError={(evento) => {
            evento.currentTarget.style.display = "none";
          }}
        />
      )}
    </span>
  );
}

// Las horas del backend están expresadas en UTC.
function crearFechaUTC(fecha, hora) {
  if (!fecha) return null;

  const horaTexto = String(hora || "12:00:00Z").trim();
  const horaConZona = /(?:Z|[+-]\d{2}:\d{2})$/i.test(horaTexto)
    ? horaTexto
    : `${horaTexto}Z`;
  const resultado = new Date(`${fecha}T${horaConZona}`);

  return Number.isNaN(resultado.getTime()) ? null : resultado;
}

function obtenerFecha(carrera) {
  return crearFechaUTC(carrera.date, carrera.time);
}

function formatearFecha(carrera) {
  const fecha = obtenerFecha(carrera);
  if (!fecha) return "Fecha por confirmar";

  return fecha.toLocaleDateString("es-AR", {
    timeZone: ZONA_ARGENTINA,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatearHora(carrera) {
  if (!carrera.time) return "Horario no disponible";

  const fecha = obtenerFecha(carrera);
  if (!fecha) return "Horario no disponible";

  return fecha.toLocaleTimeString("es-AR", {
    timeZone: ZONA_ARGENTINA,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatearSesion(sesion) {
  const fecha = crearFechaUTC(sesion.date, sesion.time);
  if (!fecha) return "Horario por confirmar";

  return fecha.toLocaleString("es-AR", {
    timeZone: ZONA_ARGENTINA,
    weekday: "short",
    day: "2-digit",
    month: "short",
    ...(sesion.time
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : {}),
  });
}

function obtenerSesiones(carrera) {
  return [
    { nombre: "Práctica libre 1", datos: carrera.FirstPractice },
    { nombre: "Práctica libre 2", datos: carrera.SecondPractice },
    { nombre: "Práctica libre 3", datos: carrera.ThirdPractice },
    {
      nombre: "Clasificación sprint",
      datos: carrera.SprintQualifying || carrera.SprintShootout,
    },
    { nombre: "Clasificación", datos: carrera.Qualifying },
    { nombre: "Sprint", datos: carrera.Sprint },
    { nombre: "Carrera", datos: { date: carrera.date, time: carrera.time } },
  ]
    .filter((sesion) => sesion.datos?.date)
    .sort((a, b) => {
      const fechaA = crearFechaUTC(a.datos.date, a.datos.time)?.getTime() ?? 0;
      const fechaB = crearFechaUTC(b.datos.date, b.datos.time)?.getTime() ?? 0;
      return fechaA - fechaB;
    });
}

const claseMensaje =
  "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 font-nav text-base text-slate-600 dark:border-white/10 dark:bg-[#1c1e27] dark:text-slate-300";

function Calendario() {
  const [carreras, setCarreras] = useState([]);
  const [temporadaSeleccionada, setTemporadaSeleccionada] = useState("2026");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Consultar las carreras de la temporada elegida en el backend.
  useEffect(() => {
    const controller = new AbortController();

    async function obtenerCalendario() {
      setCargando(true);
      setError("");

      try {
        const respuesta = await fetch(
          `http://localhost:3001/api/carreras?temporada=${temporadaSeleccionada}`,
          { signal: controller.signal },
        );

        if (!respuesta.ok) {
          throw new Error("No se pudo obtener el calendario");
        }

        const datos = await respuesta.json();
        if (!Array.isArray(datos.carreras)) {
          throw new Error("Formato de datos incorrecto");
        }

        if (!controller.signal.aborted) {
          setCarreras(datos.carreras);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    obtenerCalendario();
    return () => controller.abort();
  }, [temporadaSeleccionada]);

  const ahora = new Date();
  const proximaCarrera = carreras.find((carrera) => {
    const fecha = obtenerFecha(carrera);
    return fecha && fecha >= ahora;
  });
  const temporada = carreras[0]?.season || temporadaSeleccionada;

  return (
    <main className="mx-auto min-h-[65vh] w-full max-w-[1500px] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-10">
      {/* ENCABEZADO Y SELECTOR DE TEMPORADA */}
      <div className="mb-8 flex flex-col gap-5 border-l-4 border-[#e10600] pl-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-1 font-nav text-xs font-bold uppercase tracking-[0.2em] text-[#e10600]">
            FÓRMULA 1 · GRANDES PREMIOS
          </p>
          <h1 className="m-0 flex flex-wrap items-center gap-3 font-racing text-2xl font-extrabold uppercase tracking-tight text-[#15151d] sm:text-3xl dark:text-white">
            <CalendarRange
              className="h-7 w-7 shrink-0 text-[#e10600]"
              aria-hidden="true"
            />
            Calendario {temporada}
          </h1>
          <p className="mt-2 font-nav text-base text-slate-600 dark:text-[#b8bdc9]">
            Consultá todos los Grandes Premios de la temporada y sus horarios en
            Argentina.
          </p>
        </div>

        <div className="relative w-full shrink-0 sm:w-auto">
          <label
            htmlFor="calendario-temporada"
            className="mb-1 block font-nav text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#aeb4c2]"
          >
            Elegir temporada
          </label>
          <div className="relative">
            <select
              id="calendario-temporada"
              className="w-full min-w-44 appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-4 pr-10 font-nav text-base font-bold text-[#15151d] shadow-sm outline-none transition-colors hover:border-[#e10600] focus-visible:border-[#e10600] focus-visible:ring-2 focus-visible:ring-[#e10600]/20 dark:border-[#424653] dark:bg-[#20212b] dark:text-white dark:focus-visible:ring-[#e10600]/30"
              value={temporadaSeleccionada}
              onChange={(evento) =>
                setTemporadaSeleccionada(evento.target.value)
              }
            >
              {TEMPORADAS.map((temporada) => (
                <option key={temporada} value={temporada}>
                  Temporada {temporada}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#e10600]"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* ESTADOS DE CARGA, ERROR Y LISTADO */}
      {cargando ? (
        <div className={claseMensaje} role="status">
          <LoaderCircle
            className="h-5 w-5 shrink-0 animate-spin text-[#e10600]"
            aria-hidden="true"
          />
          Cargando calendario...
        </div>
      ) : error ? (
        <div
          className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 font-nav text-base text-red-700 dark:border-red-500/20 dark:bg-[#321c24] dark:text-red-300"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          Error: {error}
        </div>
      ) : carreras.length === 0 ? (
        <div className={claseMensaje}>
          <CalendarX2
            className="h-5 w-5 shrink-0 text-[#e10600]"
            aria-hidden="true"
          />
          No hay carreras disponibles para esta temporada.
        </div>
      ) : (
        <>
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="font-nav text-sm font-semibold text-slate-600 dark:text-[#b8bdc9]">
              <span className="font-racing font-bold tabular-nums text-[#15151d] dark:text-white">
                {carreras.length}
              </span>{" "}
              Grandes Premios
            </p>
            <span className="font-nav text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#9ba2b2]">
              Horarios ART · UTC-3
            </span>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
            {carreras.map((carrera) => {
              const esProxima = carrera.round === proximaCarrera?.round;
              const fecha = obtenerFecha(carrera);
              const esPasada = Boolean(fecha && fecha < ahora);
              const pais = carrera.Circuit?.Location?.country;
              const sesiones = obtenerSesiones(carrera);
              const imagenFondoGP = obtenerImagenFondoGP(carrera);

              // Pasar temporada y ronda para abrir directamente los resultados de este GP.
              const destinoResultados = `/resultados?temporada=${temporadaSeleccionada}&ronda=${carrera.round}`;

              return (
                <article
                  key={`${carrera.season}-${carrera.round}`}
                  className={`group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-t-4 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:bg-[#1c1e27] dark:shadow-none dark:hover:bg-[#222531] ${
                    esProxima
                      ? "border-[#e8c7ca] border-t-[#e10600] dark:border-[#70383e] dark:border-t-[#e10600]"
                      : "border-slate-200 border-t-slate-300 dark:border-[#373944] dark:border-t-[#484c59]"
                  }`}
                >
                  {/* Fondo suave: imagen borrosa y una capa clara/oscura para preservar el contraste. */}
                  {imagenFondoGP && (
                    <div
                      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                      aria-hidden="true"
                    >
                      <img
                        src={imagenFondoGP}
                        alt=""
                        loading="lazy"
                        className="h-full w-full scale-[1.06] object-cover object-center opacity-85 blur-[1.00px] transition-transform duration-500 group-hover:scale-[1.11] dark:opacity-80"
                        onError={(evento) => {
                          evento.currentTarget.style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-white/75 dark:bg-[#101116]/65" />
                    </div>
                  )}

                  {/* Enlace sobre toda la tarjeta; el desplegable queda por encima. */}
                  <Link
                    to={destinoResultados}
                    className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e10600]"
                    aria-label={`Ver resultados de ${carrera.raceName}, temporada ${temporadaSeleccionada}, ronda ${carrera.round}`}
                  />

                  <div className="relative flex h-full flex-col p-5 sm:p-6">
                    {/* RONDA Y ESTADO */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-racing text-sm font-extrabold uppercase tracking-[0.1em] text-[#e10600]">
                        RONDA {carrera.round}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-nav text-xs font-bold uppercase tracking-wide ${
                          esProxima
                            ? "bg-red-100 text-[#b70a08] dark:bg-[#e10600]/20 dark:text-[#ff7771]"
                            : esPasada
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-[#c3c8d2]"
                        }`}
                      >
                        {esProxima ? (
                          <Flag
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                        ) : esPasada ? (
                          <CheckCircle2
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                        ) : (
                          <Clock3
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        {esProxima
                          ? "PRÓXIMA"
                          : esPasada
                            ? "FECHA PASADA"
                            : "PENDIENTE"}
                      </span>
                    </div>

                    {/* GRAN PREMIO Y PAÍS CON BANDERA CIRCULAR */}
                    <div className="mt-5 flex min-w-0 items-start gap-3">
                      <BanderaCircular pais={pais} />
                      <div className="min-w-0">
                        <h2 className="m-0 break-words font-racing text-lg font-extrabold uppercase leading-snug text-[#15151d] sm:text-xl dark:text-white">
                          {carrera.raceName}
                        </h2>
                        {pais && (
                          <p className="mt-1 font-nav text-sm font-semibold text-slate-500 dark:text-[#aeb4c2]">
                            {pais}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="mt-4 flex items-start gap-2 font-nav text-sm leading-relaxed text-slate-600 dark:text-[#b8bdc9]">
                      <MapPin
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#e10600]"
                        aria-hidden="true"
                      />
                      {carrera.Circuit?.circuitName || "Circuito por confirmar"}
                    </p>

                    {/* FECHA Y HORA LOCAL DE ARGENTINA */}
                    <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/95 p-4 dark:border-[#373944] dark:bg-[#14161f]/90">
                      <div className="flex items-center gap-3">
                        <CalendarDays
                          className="h-4 w-4 shrink-0 text-[#e10600]"
                          aria-hidden="true"
                        />
                        <span className="font-nav text-sm font-semibold text-[#343844] dark:text-[#e0e3eb]">
                          {formatearFecha(carrera)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock3
                          className="h-4 w-4 shrink-0 text-[#e10600]"
                          aria-hidden="true"
                        />
                        <span className="font-nav text-sm font-semibold text-[#343844] dark:text-[#e0e3eb]">
                          {formatearHora(carrera)}{" "}
                          <span className="text-slate-500 dark:text-[#aeb4c2]">
                            ARG
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Indicador visual del enlace a resultados. */}
                    <div className="mt-4 flex items-center gap-1.5 font-nav text-sm font-bold text-[#e10600]">
                      Ver resultados de este GP
                      <ArrowUpRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </div>

                    {/* DESPLEGABLE DE SESIONES (independiente del enlace) */}
                    <details className="group relative z-20 mt-auto pt-5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 font-nav text-sm font-bold text-[#242731] transition-colors hover:border-[#e10600]/50 hover:text-[#e10600] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e10600] dark:border-[#444755] dark:bg-[#272a35]/95 dark:text-white dark:hover:bg-[#303440] [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays
                            className="h-4 w-4 shrink-0 text-[#e10600]"
                            aria-hidden="true"
                          />
                          Ver horarios del fin de semana
                        </span>
                        <ChevronDown
                          className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                          aria-hidden="true"
                        />
                      </summary>

                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white/95 dark:border-[#373944] dark:bg-[#14161f]/95">
                        {sesiones.map((sesion) => (
                          <div
                            key={sesion.nombre}
                            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-slate-200 px-3 py-2.5 last:border-b-0 dark:border-[#373944]"
                          >
                            <span className="font-nav text-sm font-semibold text-[#343844] dark:text-[#e0e3eb]">
                              {sesion.nombre}
                            </span>
                            <span className="font-nav text-sm tabular-nums text-slate-600 dark:text-[#b8bdc9]">
                              {formatearSesion(sesion.datos)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

export default Calendario;
