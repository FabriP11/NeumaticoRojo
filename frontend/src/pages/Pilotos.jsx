import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Link, useSearchParams } from "react-router";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Flag,
  Globe2,
  Medal,
  Trophy,
  UserRound,
} from "lucide-react";
import { obtenerColorEscuderia } from "../utils/coloresF1";
import { obtenerArchivoPiloto } from "../components/FotoPiloto";
import { SkeletonTarjetas } from "../components/Skeletons";

const TEMPORADAS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];

// Mismos degradados que las cabeceras de PilotoDetalle y EscuderiaDetalle.
const FONDOS_ESCUDERIAS = {
  mercedes: ["#034c49", "#13bea9"],
  ferrari: ["#720016", "#f00630"],
  red_bull: ["#142a50", "#3974c8"],
  mclaren: ["#844400", "#ff8700"],
  rb: ["#0738a8", "#4678ec"],
  racing_bulls: ["#0738a8", "#4678ec"],
  alpine: ["#044d70", "#148fce"],
  aston_martin: ["#064741", "#149b85"],
  williams: ["#073c9d", "#4d83ec"],
  haas: ["#101116", "#31333d"],
  audi: ["#17171c", "#595a65"],
  cadillac: ["#1b2431", "#56617a"],
  sauber: ["#16301f", "#4db54a"],
  alfa: ["#49111c", "#b31732"],
  alfa_romeo: ["#49111c", "#b31732"],
  renault: ["#38311a", "#bd9223"],
  racing_point: ["#622c49", "#d67da4"],
  toro_rosso: ["#17224c", "#3267ac"],
  alpha_tauri: ["#132b3d", "#47728b"],
  alphatauri: ["#132b3d", "#47728b"],
};

const NOMBRES_ESCUDERIAS = {
  alpine: "Alpine",
  aston_martin: "Aston Martin",
  audi: "Audi",
  cadillac: "Cadillac",
  ferrari: "Ferrari",
  haas: "Haas",
  mclaren: "McLaren",
  mercedes: "Mercedes",
  red_bull: "Red Bull",
  rb: "Racing Bulls",
  racing_bulls: "Racing Bulls",
  williams: "Williams",
};

function obtenerFondoEquipo(idEquipo, colorEquipo) {
  const [inicio, fin] = FONDOS_ESCUDERIAS[idEquipo] || ["#18202b", colorEquipo];
  return `linear-gradient(115deg, ${inicio} 0%, ${fin} 100%)`;
}

// Los AVIF de 2026 son retratos verticales: object-top recorta desde la cabeza
// para mostrar el rostro y parte del pecho, sin agrandar la tarjeta.
function ImagenPiloto({ idPiloto, nombre, idEquipo, temporada, numero }) {
  const archivo =
    temporada === "2026" ? obtenerArchivoPiloto(idPiloto, nombre) : null;
  const [falloImagen, setFalloImagen] = useState(false);
  const colorEquipo = obtenerColorEscuderia(idEquipo);

  useEffect(() => {
    setFalloImagen(false);
  }, [archivo]);

  return (
    <div
      className="relative h-48 overflow-hidden sm:h-56 xl:h-64"
      style={{ background: obtenerFondoEquipo(idEquipo, colorEquipo) }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "repeating-linear-gradient(132deg, transparent 0px, transparent 75px, rgba(255,255,255,.16) 76px, rgba(255,255,255,.16) 125px, transparent 126px, transparent 175px)",
        }}
        aria-hidden="true"
      />

      {archivo && !falloImagen ? (
        <img
          src={`/pilotos/2026/${archivo}.avif`}
          alt={`Retrato de ${nombre}`}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full origin-top drop-shadow-[0_8px_16px_rgba(0,0,0,.22)] transition-transform duration-500 motion-reduce:transform-none ${
            archivo === "hirakawa"
              ? "object-contain object-top scale-[5] sm:scale-[3] sm:group-hover:scale-[3.10]"
              : "object-cover object-top group-hover:scale-[1.05]"
          }`}
          onError={() => setFalloImagen(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-white/80">
          <UserRound
            className="h-16 w-16"
            strokeWidth={1.2}
            aria-hidden="true"
          />
          <span className="px-4 font-nav text-xs font-semibold">
            {temporada === "2026"
              ? "Fotografía no disponible"
              : `Sin fotografía de la temporada ${temporada}`}
          </span>
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent"
        aria-hidden="true"
      />
      {numero != null && String(numero).trim() !== "" && (
        <span className="absolute bottom-3 left-3 rounded-lg border border-white/20 bg-black/45 px-3 py-1 font-racing text-base font-extrabold text-white shadow-sm backdrop-blur-sm">
          #{numero}
        </span>
      )}
    </div>
  );
}

function Pilotos() {
  const reducirMovimiento = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const temporadaConsultada = searchParams.get("temporada") || "2026";
  const temporada = TEMPORADAS.includes(temporadaConsultada)
    ? temporadaConsultada
    : "2026";

  const [pilotos, setPilotos] = useState([]);
  const [detallesPilotos, setDetallesPilotos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function cargarPilotos() {
      setCargando(true);
      setError("");
      setPilotos([]);
      setDetallesPilotos({});

      try {
        // La clasificación ya contiene los datos necesarios para cada tarjeta.
        // Los dorsales de MySQL complementan el número y el equipo, si están disponibles.
        const [respuesta, respuestaDorsales] = await Promise.all([
          fetch(`/api/clasificaciones?temporada=${temporada}`, {
            signal: controller.signal,
          }),
          fetch(`/api/dorsales-temporada?temporada=${temporada}`, {
            signal: controller.signal,
          }).catch(() => null),
        ]);

        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar los pilotos");
        }

        const datos = await respuesta.json();
        if (!Array.isArray(datos.pilotos)) {
          throw new Error("Formato de pilotos incorrecto");
        }

        let dorsales = {};
        if (respuestaDorsales?.ok) {
          try {
            const adicionales = await respuestaDorsales.json();
            if (
              adicionales?.pilotos &&
              typeof adicionales.pilotos === "object" &&
              !Array.isArray(adicionales.pilotos)
            ) {
              dorsales = adicionales.pilotos;
            }
          } catch {
            // Los dorsales son opcionales: mostrar los datos de la API.
          }
        }

        if (!controller.signal.aborted) {
          setPilotos(
            datos.pilotos.filter((piloto) => piloto?.Driver?.driverId),
          );
          setDetallesPilotos(dorsales);
        }
      } catch (e) {
        if (e.name !== "AbortError" && !controller.signal.aborted) {
          setError(e.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargarPilotos();
    return () => controller.abort();
  }, [temporada]);

  return (
    <main className="min-h-screen bg-[#f4f5f8] px-4 py-5 text-[#15151d] dark:bg-[#15151d] dark:text-white sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="mb-5 flex flex-col gap-4 border-b border-black/10 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 border-l-4 border-[#e10600] pl-3 sm:pl-4">
            <p className="mb-1 font-nav text-[10px] font-bold uppercase tracking-[0.16em] text-[#e10600]">
              FÓRMULA 1 · CAMPEONATO MUNDIAL
            </p>
            <h1 className="m-0 flex items-center gap-2 font-racing text-2xl font-extrabold uppercase italic tracking-tight sm:text-3xl lg:text-4xl">
              <UserRound
                className="h-6 w-6 shrink-0 text-[#e10600] sm:h-7 sm:w-7"
                strokeWidth={2.2}
                aria-hidden="true"
              />
              Pilotos
            </h1>
            <p className="mt-1.5 max-w-2xl font-nav text-sm leading-snug text-gray-600 dark:text-gray-400">
              Conocé a los pilotos que participan en el Campeonato Mundial de
              Fórmula 1 y explorá sus estadísticas.
            </p>
          </div>

          <div className="w-full shrink-0 sm:w-60">
            <label
              htmlFor="pilotos-temporada"
              className="mb-1 block font-nav text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              Seleccionar temporada
            </label>
            <div className="relative">
              <CalendarDays
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#e10600]"
                aria-hidden="true"
              />
              <select
                id="pilotos-temporada"
                className="w-full cursor-pointer appearance-none rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-10 font-nav text-sm font-bold text-[#15151d] outline-none transition-colors hover:border-[#e10600]/60 focus:border-[#e10600] focus:ring-2 focus:ring-[#e10600]/20 dark:border-white/15 dark:bg-[#20212b] dark:text-white"
                value={temporada}
                onChange={(evento) =>
                  setSearchParams({ temporada: evento.target.value })
                }
              >
                {TEMPORADAS.map((anio) => (
                  <option key={anio} value={anio}>
                    Temporada {anio}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                aria-hidden="true"
              />
            </div>
          </div>
        </header>

        {cargando && <SkeletonTarjetas cantidad={6} etiqueta="Cargando pilotos" />}

        {!cargando && error && (
          <div
            className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-50 p-5 text-red-700 dark:bg-red-950/30 dark:text-red-200"
            role="alert"
          >
            <AlertCircle
              className="h-5 w-5 shrink-0 text-[#e10600]"
              aria-hidden="true"
            />
            Error: {error}
          </div>
        )}

        {!cargando && !error && pilotos.length > 0 && (
          <motion.div
            key={temporada}
            initial={reducirMovimiento ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducirMovimiento ? 0 : 0.24 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          >
            {pilotos.map((piloto, indice) => {
              const idPiloto = piloto.Driver.driverId;
              const nombre = `${piloto.Driver.givenName} ${piloto.Driver.familyName}`;
              const detalles = detallesPilotos[idPiloto] || {};
              const idEquipo =
                detalles.id_escuderia ||
                piloto.Constructors?.[0]?.constructorId;
              const colorEquipo = obtenerColorEscuderia(idEquipo);
              const numero = detalles.numero ?? piloto.Driver.permanentNumber;
              const equipoEnTemporada = piloto.Constructors?.find(
                (equipo) => equipo.constructorId === idEquipo,
              );
              const nombreEscuderia =
                equipoEnTemporada?.name ||
                NOMBRES_ESCUDERIAS[idEquipo] ||
                piloto.Constructors?.[0]?.name ||
                "Sin escudería";

              return (
                <Link
                  key={idPiloto}
                  to={`/pilotos/${idPiloto}?temporada=${temporada}`}
                  state={{ volverA: `/pilotos?temporada=${temporada}` }}
                  className="group block min-w-0 rounded-2xl no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e10600]"
                >
                  <motion.article
                    initial={reducirMovimiento ? false : { opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    whileHover={reducirMovimiento ? undefined : { y: -4 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{
                      duration: reducirMovimiento ? 0 : 0.33,
                      delay: reducirMovimiento ? 0 : (indice % 6) * 0.055,
                    }}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-t-4 border-gray-200 bg-white text-[#15151d] shadow-sm transition-[border-color,box-shadow] duration-200 group-hover:shadow-xl dark:border-white/10 dark:bg-[#20212b] dark:text-white dark:shadow-lg"
                    style={{ borderTopColor: colorEquipo }}
                  >
                    <ImagenPiloto
                      idPiloto={idPiloto}
                      nombre={nombre}
                      idEquipo={idEquipo}
                      temporada={temporada}
                      numero={numero}
                    />

                    <div className="flex flex-1 flex-col gap-2.5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 font-nav text-[11px] font-bold uppercase tracking-wide dark:border-white/10 dark:bg-[#15151d]">
                          <Medal
                            className="h-4 w-4 text-[#e10600]"
                            aria-hidden="true"
                          />
                          Posición {piloto.position ?? "—"}
                        </span>
                        <span className="font-racing text-xs font-bold tracking-[0.15em] text-gray-500 dark:text-gray-400">
                          {temporada}
                        </span>
                      </div>

                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full"
                          style={{ backgroundColor: colorEquipo }}
                          aria-hidden="true"
                        />
                        <h2 className="min-w-0 font-racing text-base font-extrabold uppercase italic leading-tight sm:text-lg">
                          {nombre}
                        </h2>
                      </div>

                      <p className="m-0 flex min-w-0 items-center gap-2 font-nav text-sm text-gray-600 dark:text-gray-400">
                        <Flag
                          className="h-4 w-4 shrink-0 text-[#e10600]"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 break-words">
                          {nombreEscuderia}
                        </span>
                      </p>
                      <p className="m-0 flex items-center gap-2 font-nav text-xs text-gray-500 dark:text-gray-400">
                        <Globe2
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        {piloto.Driver.nationality ||
                          "Nacionalidad no disponible"}
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/5 dark:bg-[#15151d]">
                          <span className="mb-1 block font-nav text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Puntos
                          </span>
                          <strong className="font-racing text-xl font-extrabold tabular-nums">
                            {piloto.points ?? "—"}
                          </strong>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/5 dark:bg-[#15151d]">
                          <span className="mb-1 flex items-center gap-1.5 font-nav text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            <Trophy
                              className="h-3.5 w-3.5 text-[#e10600]"
                              aria-hidden="true"
                            />
                            Victorias
                          </span>
                          <strong className="font-racing text-xl font-extrabold tabular-nums">
                            {piloto.wins ?? "—"}
                          </strong>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-gray-200 pt-3 font-nav text-sm font-bold text-[#d50700] transition-colors group-hover:text-[#a60500] dark:border-white/10 dark:text-[#ff5757] dark:group-hover:text-white">
                        Ver perfil de piloto
                        <ArrowUpRight
                          className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </motion.article>
                </Link>
              );
            })}
          </motion.div>
        )}

        {!cargando && !error && pilotos.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-center font-nav text-gray-600 dark:border-white/10 dark:bg-[#20212b] dark:text-gray-300">
            No hay pilotos disponibles para esta temporada.
          </p>
        )}
      </div>
    </main>
  );
}

export default Pilotos;
