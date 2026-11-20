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
  LoaderCircle,
  Medal,
  Trophy,
} from "lucide-react";

// Mantener los colores identificativos de las escuderías.
const coloresEscuderias = {
  red_bull: "#3671C6",
  ferrari: "#E8002D",
  mercedes: "#27F4D2",
  mclaren: "#FF8700",
  aston_martin: "#229971",
  alpine: "#FF87BC",
  williams: "#64C4FF",
  haas: "#B6BABD",
  sauber: "#52E252",
  rb: "#6692FF",
  racing_bulls: "#6692FF",
  alphatauri: "#6692FF",
  toro_rosso: "#469BFF",
  renault: "#FFF500",
  racing_point: "#F596C8",
  force_india: "#F596C8",
  alfa: "#900000",
  audi: "#D13B46",
  cadillac: "#D8DCE5",
};

function obtenerColorEscuderia(id) {
  return coloresEscuderias[id] || "#888B98";
}

// Nombres de los archivos guardados en frontend/public/escuderias/.
// El ID del backend puede diferir del nombre del archivo de imagen.
const nombresImagenEscuderia = {
  alpine: "alpine",
  aston_martin: "aston",
  audi: "audi",
  cadillac: "cadillac",
  ferrari: "ferrari",
  haas: "haas",
  mclaren: "mclaren",
  mercedes: "mercedes",
  red_bull: "redbull",
  rb: "visarb",
  racing_bulls: "visarb",
  williams: "williams",
};

const nombresCompletos2026 = {
  mercedes: "Mercedes-AMG PETRONAS F1 Team",
  ferrari: "Scuderia Ferrari HP",
  mclaren: "McLaren Mastercard F1 Team",
  red_bull: "Oracle Red Bull Racing",
  rb: "Visa Cash App Racing Bulls F1 Team",
  racing_bulls: "Visa Cash App Racing Bulls F1 Team",
  aston_martin: "Aston Martin Aramco F1 Team",
  alpine: "BWT Alpine F1 Team",
  williams: "Atlassian Williams Racing",
  haas: "TGR Haas F1 Team",
  audi: "Audi Revolut F1 Team",
  cadillac: "Cadillac Formula 1 Team",
};

// Como Windows puede ocultar las extensiones, admitir formatos habituales.
const EXTENSIONES = ["webp", "png", "jpg", "jpeg", "avif", "svg"];

const banderasPorNacionalidad = {
  British: "gb",
  German: "de",
  Italian: "it",
  French: "fr",
  Austrian: "at",
  Swiss: "ch",
  American: "us",
  Dutch: "nl",
  Australian: "au",
  Canadian: "ca",
  Japanese: "jp",
  Chinese: "cn",
  Spanish: "es",
  Russian: "ru",
};

function BanderaCircular({ nacionalidad }) {
  const codigo = banderasPorNacionalidad[nacionalidad];
  const [errorImagen, setErrorImagen] = useState(false);

  if (!codigo || errorImagen) {
    return (
      <Globe2 className="h-4 w-4 shrink-0 text-[#e10600]" aria-hidden="true" />
    );
  }

  return (
    <span className="inline-flex h-5 w-5 shrink-0 overflow-hidden rounded-full border border-black/10 bg-gray-200 dark:border-white/20">
      <img
        src={`https://flagcdn.com/w40/${codigo}.png`}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setErrorImagen(true)}
      />
    </span>
  );
}

function ImagenEscuderia({ id, nombre, color }) {
  const archivo = nombresImagenEscuderia[id];
  const [indiceExtension, setIndiceExtension] = useState(0);
  const existeOpcion = archivo && indiceExtension < EXTENSIONES.length;

  if (!existeOpcion) {
    return (
      <div
        className="relative flex h-48 items-center justify-center overflow-hidden px-6 sm:h-56 xl:h-64"
        style={{ backgroundColor: color }}
      >
        <div className="pointer-events-none absolute -right-12 -top-10 h-52 w-36 rotate-45 bg-black/15" />
        <div className="pointer-events-none absolute -bottom-20 left-12 h-48 w-24 rotate-45 bg-white/10" />
        <span className="relative z-10 text-center font-racing text-2xl font-extrabold uppercase italic tracking-tight text-white drop-shadow-md sm:text-3xl">
          {nombre}
        </span>
      </div>
    );
  }

  return (
    <div className="relative h-48 overflow-hidden bg-[#15151d] sm:h-56 xl:h-64">
      <img
        src={`/escuderias/${archivo}.${EXTENSIONES[indiceExtension]}`}
        alt={`Imagen de ${nombre}`}
        className="h-full w-full object-cover object-center scale-[1.00] transition-transform duration-500 group-hover:scale-[1.25] motion-reduce:transform-none"
        onError={() => setIndiceExtension((actual) => actual + 1)}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent" />
    </div>
  );
}

function Escuderias() {
  const reducirMovimiento = useReducedMotion();
  const [searchParams] = useSearchParams();
  const [temporada, setTemporada] = useState(
    searchParams.get("temporada") || "2026",
  );
  const [escuderias, setEscuderias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Obtener los datos originales desde el backend, sin modificar el endpoint.
  useEffect(() => {
    const controller = new AbortController();

    async function obtenerEscuderias() {
      setCargando(true);
      setError("");
      setEscuderias([]);

      try {
        const respuesta = await fetch(
          `/api/clasificaciones?temporada=${temporada}`,
          { signal: controller.signal },
        );

        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar las escuderías");
        }

        const datos = await respuesta.json();

        if (!Array.isArray(datos.constructores)) {
          throw new Error("Formato de datos incorrecto");
        }

        if (!controller.signal.aborted) {
          setEscuderias(datos.constructores);
        }
      } catch (error) {
        if (error.name !== "AbortError" && !controller.signal.aborted) {
          setError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    obtenerEscuderias();
    return () => controller.abort();
  }, [temporada]);

  return (
    <main className="min-h-screen bg-[#f4f5f8] px-4 py-8 text-[#15151d] dark:bg-[#15151d] dark:text-white sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-[1500px]">
        {/* ENCABEZADO */}
        <header className="mb-8 flex flex-col gap-6 border-b border-black/10 pb-7 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
          <div className="border-l-4 border-[#e10600] pl-4">
            <p className="mb-2 font-nav text-xs font-bold uppercase tracking-[0.22em] text-[#e10600]">
              FÓRMULA 1 · CAMPEONATO MUNDIAL
            </p>
            <h1 className="flex items-center gap-3 font-racing text-3xl font-extrabold uppercase italic tracking-tight sm:text-4xl lg:text-5xl">
              <Flag
                className="h-8 w-8 shrink-0 text-[#e10600] sm:h-10 sm:w-10"
                strokeWidth={2.2}
                aria-hidden="true"
              />
              Escuderías
            </h1>
            <p className="mt-3 max-w-2xl font-nav text-base leading-relaxed text-gray-600 dark:text-gray-400">
              Conocé los equipos que participan en el Campeonato Mundial de
              Fórmula 1.
            </p>
          </div>

          {/* SELECTOR DE TEMPORADA */}
          <div className="w-full sm:w-64">
            <label
              htmlFor="escuderias-temporada"
              className="mb-2 block font-nav text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              Seleccionar temporada
            </label>
            <div className="relative">
              <CalendarDays
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#e10600]"
                aria-hidden="true"
              />
              <select
                id="escuderias-temporada"
                className="w-full cursor-pointer appearance-none rounded-xl border border-gray-300 bg-white py-3 pl-12 pr-11 font-nav text-base font-bold text-[#15151d] outline-none transition-colors hover:border-[#e10600]/60 focus:border-[#e10600] focus:ring-2 focus:ring-[#e10600]/20 dark:border-white/15 dark:bg-[#20212b] dark:text-white"
                value={temporada}
                onChange={(e) => setTemporada(e.target.value)}
              >
                {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((anio) => (
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

        {/* ESTADOS */}
        {cargando && (
          <div
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 font-nav text-gray-600 dark:border-white/10 dark:bg-[#20212b] dark:text-gray-300"
            role="status"
          >
            <LoaderCircle
              className="h-5 w-5 animate-spin text-[#e10600]"
              aria-hidden="true"
            />
            Cargando escuderías...
          </div>
        )}
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

        {/* TARJETAS: imagen del equipo + estadísticas originales */}
        {!cargando && !error && escuderias.length > 0 && (
          <motion.div
            key={temporada}
            initial={reducirMovimiento ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducirMovimiento ? 0 : 0.24 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {escuderias.map((equipo, indice) => {
              const idEscuderia = equipo.Constructor.constructorId;
              const colorEquipo = obtenerColorEscuderia(idEscuderia);

              return (
                <Link
                  key={idEscuderia}
                  to={`/escuderias/${idEscuderia}?temporada=${temporada}`}
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
                    <ImagenEscuderia
                      id={idEscuderia}
                      nombre={equipo.Constructor.name}
                      color={colorEquipo}
                    />

                    <div className="flex flex-col gap-2.5 p-4">
                      {/* POSICIÓN Y TEMPORADA */}
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 font-nav text-[11px] font-bold uppercase tracking-wide dark:border-white/10 dark:bg-[#15151d]">
                          <Medal
                            className="h-4 w-4 text-[#e10600]"
                            aria-hidden="true"
                          />
                          Posición {equipo.position}
                        </span>
                        <span className="font-racing text-xs font-bold tracking-[0.15em] text-gray-500 dark:text-gray-400">
                          {temporada}
                        </span>
                      </div>

                      {/* NOMBRE Y NACIONALIDAD */}
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full"
                          style={{ backgroundColor: colorEquipo }}
                          aria-hidden="true"
                        />

                        <h2 className="min-w-0 font-racing text-base font-extrabold uppercase italic leading-tight sm:text-lg">
                          {temporada === "2026"
                            ? nombresCompletos2026[idEscuderia] ||
                              equipo.Constructor.name
                            : equipo.Constructor.name}
                        </h2>
                      </div>
                      <p className="m-0 flex items-center gap-2 font-nav text-sm text-gray-600 dark:text-gray-400">
                        <BanderaCircular
                          nacionalidad={equipo.Constructor.nationality}
                        />
                        {equipo.Constructor.nationality}
                      </p>

                      {/* PUNTOS Y VICTORIAS */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/5 dark:bg-[#15151d]">
                          <span className="mb-2 block font-nav text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Puntos
                          </span>
                          <strong className="font-racing text-xl font-extrabold tabular-nums">
                            {equipo.points}
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
                            {equipo.wins}
                          </strong>
                        </div>
                      </div>

                      {/* ENLACE AL PERFIL */}
                      <div className="mt-1 flex items-center justify-between border-t border-gray-200 pt-3 font-nav text-sm font-bold text-[#d50700] transition-colors group-hover:text-[#a60500] dark:border-white/10 dark:text-[#ff5757] dark:group-hover:text-white">
                        Ver perfil de escudería
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

        {!cargando && !error && escuderias.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-center font-nav text-gray-600 dark:border-white/10 dark:bg-[#20212b] dark:text-gray-300">
            No hay escuderías disponibles para esta temporada.
          </p>
        )}
      </div>
    </main>
  );
}

export default Escuderias;
