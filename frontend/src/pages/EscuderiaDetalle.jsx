import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Link, useParams, useSearchParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Flag,
  Globe2,
  LoaderCircle,
  Medal,
  Trophy,
  UserRound,
} from "lucide-react";
import FotoPiloto from "../components/FotoPiloto";
import { obtenerColorEscuderia } from "../utils/coloresF1";

// Imágenes guardadas en frontend/public/escuderias/.
// El nombre del archivo no siempre coincide con el ID de la API.
const nombresLogo = {
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

// Autos de 2026 guardados en frontend/public/escuderias/coches/*.avif.
const nombresAuto = {
  alpine: "alpinecar",
  aston_martin: "astoncar",
  audi: "audicar",
  cadillac: "cadillaccar",
  ferrari: "ferraricar",
  haas: "haascar",
  mclaren: "mclarencar",
  mercedes: "mercedescar",
  red_bull: "redbullcar",
  rb: "rbcar",
  racing_bulls: "rbcar",
  williams: "williamscar",
};

// Solo se usa para la parte visual del encabezado.
const fondos = {
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
};

// Bandera rectangular de la nacionalidad, con el mismo estilo de Clasificaciones.
const CODIGOS_NACIONALIDAD = {
  american: "us",
  australian: "au",
  argentine: "ar",
  argentinian: "ar",
  austrian: "at",
  belgian: "be",
  brazilian: "br",
  british: "gb",
  canadian: "ca",
  chinese: "cn",
  danish: "dk",
  dutch: "nl",
  finnish: "fi",
  french: "fr",
  german: "de",
  hungarian: "hu",
  indian: "in",
  indonesian: "id",
  irish: "ie",
  italian: "it",
  japanese: "jp",
  malaysian: "my",
  mexican: "mx",
  monegasque: "mc",
  "new zealander": "nz",
  "new zealand": "nz",
  polish: "pl",
  portuguese: "pt",
  russian: "ru",
  southafrican: "za",
  "south african": "za",
  spanish: "es",
  swedish: "se",
  swiss: "ch",
  thai: "th",
  turkish: "tr",
  venezuelan: "ve",
  // También se contemplan algunos nombres de países.
  australia: "au",
  brazil: "br",
  france: "fr",
  germany: "de",
  italy: "it",
  japan: "jp",
  monaco: "mc",
  netherlands: "nl",
  spain: "es",
  "united kingdom": "gb",
  "united states": "us",
};

function BanderaEscuderia({ nacionalidad }) {
  const codigo =
    CODIGOS_NACIONALIDAD[
      String(nacionalidad || "")
        .trim()
        .toLowerCase()
    ];

  return (
    <span
      className="relative inline-flex h-3 w-[18px] shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-white/20 bg-black/20"
      aria-hidden="true"
    >
      <Globe2 className="absolute h-3 w-3 text-white/85" />
      {codigo && (
        <img
          src={`https://flagcdn.com/w80/${codigo}.png`}
          alt=""
          loading="lazy"
          decoding="async"
          className="relative h-full w-full object-cover"
          onError={(evento) => {
            evento.currentTarget.style.display = "none";
          }}
        />
      )}
    </span>
  );
}

// Pilotos titulares de 2026: no dependen del orden en el que llega
// el array "pilotos" (que también puede incluir pilotos de reserva).
// Haas: Bearman y Câmara desde el GP de São Paulo de noviembre de 2026.
const TITULARES_2026 = {
  alpine: ["gasly", "colapinto"],
  aston_martin: ["alonso", "stroll"],
  audi: ["hulkenberg", "bortoleto"],
  cadillac: ["perez", "bottas"],
  ferrari: ["leclerc", "hamilton"],
  haas: ["bearman", "camara"],
  mclaren: ["norris", "piastri"],
  mercedes: ["russell", "antonelli"],
  red_bull: ["verstappen", "hadjar"],
  rb: ["lawson", "lindblad"],
  racing_bulls: ["lawson", "lindblad"],
  williams: ["albon", "sainz"],
};

function normalizarIdentificador(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function obtenerPilotosTitulares2026(idEscuderia, pilotos) {
  const apellidos = TITULARES_2026[idEscuderia];
  if (!apellidos) return [];

  // Buscar por apellido o driverId, sin incluir reservas como suplentes.
  return apellidos
    .map((apellido) =>
      pilotos.find(
        (piloto) =>
          normalizarIdentificador(piloto.familyName) === apellido ||
          normalizarIdentificador(piloto.driverId).endsWith(apellido),
      ),
    )
    .filter(Boolean);
}

const EXTENSIONES_LOGO = ["png", "avif", "webp", "jpg", "jpeg", "svg"];

function LogoEscuderia({ id, nombre }) {
  const archivo = nombresLogo[id];
  const [indice, setIndice] = useState(0);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    setIndice(0);
    setFallo(false);
  }, [id]);

  if (!archivo || fallo) return null;

  return (
    <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/25 p-2 backdrop-blur-sm sm:h-16 sm:w-20">
      <img
        src={`/escuderias/${archivo}.${EXTENSIONES_LOGO[indice]}`}
        alt={`Logo de ${nombre}`}
        className="max-h-full max-w-full object-contain"
        loading="eager"
        decoding="async"
        onError={() => {
          if (indice + 1 < EXTENSIONES_LOGO.length) {
            setIndice((anterior) => anterior + 1);
          } else {
            setFallo(true);
          }
        }}
      />
    </div>
  );
}

function AutoEscuderia({ id, nombre }) {
  const reducirMovimiento = useReducedMotion();
  const archivo = nombresAuto[id];
  const [fallo, setFallo] = useState(false);

  useEffect(() => setFallo(false), [id]);

  if (!archivo || fallo) return null;

  return (
    <motion.img
      initial={reducirMovimiento ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducirMovimiento ? 0 : 0.55, ease: "easeOut" }}
      src={`/escuderias/coches/${archivo}.avif`}
      alt={`Monoplaza 2026 de ${nombre}`}
      className="pointer-events-none relative z-10 mx-auto block h-[155px] w-full max-w-[950px] object-contain drop-shadow-[0_15px_14px_rgba(0,0,0,0.30)] sm:h-[180px] lg:h-[205px]"
      loading="lazy"
      decoding="async"
      onError={() => setFallo(true)}
    />
  );
}

function EscuderiaDetalle() {
  const reducirMovimiento = useReducedMotion();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const temporada = searchParams.get("temporada") || "2026";

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function cargarEscuderia() {
      setCargando(true);
      setError("");
      setDatos(null);

      try {
        const respuesta = await fetch(
          `/api/escuderias/${encodeURIComponent(id)}?temporada=${temporada}`,
          { signal: controller.signal },
        );
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            resultado.mensaje || "No se pudo cargar la escudería",
          );
        }

        if (!controller.signal.aborted) setDatos(resultado);
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }

    cargarEscuderia();
    return () => controller.abort();
  }, [id, temporada]);

  const volver = `/escuderias?temporada=${temporada}`;

  if (cargando || error) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 py-10 md:px-8">
        <Link
          to={volver}
          className="mb-5 inline-flex items-center gap-2 font-nav text-base font-bold text-[#e10600] no-underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a escuderías
        </Link>
        <div
          className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 text-gray-700 dark:border-white/10 dark:bg-[#20212b] dark:text-gray-200"
          role={error ? "alert" : "status"}
        >
          {error ? (
            <AlertCircle className="h-5 w-5 text-[#e10600]" />
          ) : (
            <LoaderCircle className="h-5 w-5 animate-spin text-[#e10600]" />
          )}
          {error || "Cargando escudería..."}
        </div>
      </main>
    );
  }

  if (!datos) return null;

  const { escuderia, pilotos = [], clasificacion } = datos;
  const color = obtenerColorEscuderia(id) || "#888B98";
  const [fondoInicio, fondoFin] = fondos[id] || ["#1b1c27", color];
  const es2026 = String(temporada) === "2026";
  const pilotosTitulares2026 = es2026
    ? obtenerPilotosTitulares2026(id, pilotos)
    : [];
  // Los titulares de 2026 aparecen arriba del coche. En temporadas anteriores,
  // mantener el acceso a los pilotos aunque se elimine la sección «Plantilla».
  const pilotosEncabezado = es2026 ? pilotosTitulares2026 : pilotos;

  return (
    <main className="bg-[#f4f5f8] px-4 pb-8 pt-4 text-gray-900 sm:px-6 dark:bg-[#15151d] dark:text-white">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3">
        <Link
          to={volver}
          className="group inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-nav text-sm font-bold text-gray-700 no-underline transition-colors hover:text-[#e10600] dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver a escuderías
        </Link>

        {/* Encabezado visual con logo, color y coche de la escudería. */}
        <motion.section
          key={`${id}-${temporada}`}
          initial={reducirMovimiento ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reducirMovimiento ? 0 : 0.42,
            ease: "easeOut",
          }}
          className="relative isolate overflow-hidden rounded-[26px] border border-black/10 text-white shadow-xl"
          style={{
            background: `linear-gradient(115deg, ${fondoInicio} 0%, ${fondoFin} 100%)`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(132deg, transparent 0px, transparent 75px, rgba(255,255,255,.16) 76px, rgba(255,255,255,.16) 125px, transparent 126px, transparent 175px)",
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,.9) 1px, transparent 1px)",
              backgroundSize: "5px 5px",
              maskImage: "linear-gradient(to right, black, transparent)",
              WebkitMaskImage: "linear-gradient(to right, black, transparent)",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between lg:px-7 lg:pt-5 lg:pb-0">
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-2 font-nav text-xs font-bold uppercase tracking-[.22em] text-white/85">
                <Flag className="h-4 w-4" /> Perfil de escudería
              </p>
              <h1 className="m-0 max-w-3xl font-racing text-3xl font-extrabold uppercase italic tracking-tight text-white sm:text-4xl">
                {escuderia.name}
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-nav text-sm font-semibold text-white/90">
                <span className="inline-flex items-center gap-2">
                  <BanderaEscuderia nacionalidad={escuderia.nationality} />{" "}
                  {escuderia.nationality}
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> Temporada {temporada}
                </span>
              </div>

              {pilotosEncabezado.length > 0 && (
                <div
                  className="mt-3 flex flex-wrap gap-2"
                  aria-label="Perfiles de pilotos"
                >
                  {pilotosEncabezado.map((piloto) => (
                    <Link
                      key={piloto.driverId}
                      to={`/pilotos/${piloto.driverId}?temporada=${temporada}`}
                      state={{
                        volverA: `/escuderias/${id}?temporada=${temporada}`,
                      }}
                      aria-label={`Ver perfil de ${piloto.givenName} ${piloto.familyName}`}
                      className="group inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-white/20 bg-black/30 py-1 pl-1 pr-2.5 text-white no-underline backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-black/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      {es2026 ? (
                        <FotoPiloto
                          idPiloto={piloto.driverId}
                          nombre={`${piloto.givenName} ${piloto.familyName}`}
                          colorEquipo={color}
                          temporada={temporada}
                          tamano="sm"
                        />
                      ) : (
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                          <UserRound className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                      <span className="min-w-0 font-nav text-xs font-bold text-white">
                        {piloto.givenName} {piloto.familyName}
                      </span>
                      <ArrowUpRight
                        className="h-3.5 w-3.5 shrink-0 text-white/80 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-start gap-2 sm:justify-between lg:justify-end">
              {es2026 && (
                <LogoEscuderia key={id} id={id} nombre={escuderia.name} />
              )}

              <div className="w-44 rounded-xl border border-white/15 bg-black/30 p-2 backdrop-blur-sm sm:w-48">
                <label
                  htmlFor="esc-temporada"
                  className="mb-1 flex items-center gap-2 font-nav text-[11px] font-bold uppercase tracking-widest text-white/80"
                >
                  <CalendarDays className="h-4 w-4" /> Temporada
                </label>
                <div className="relative">
                  <select
                    id="esc-temporada"
                    value={temporada}
                    onChange={(e) =>
                      setSearchParams({ temporada: e.target.value })
                    }
                    className="w-full appearance-none rounded-lg border border-white/20 bg-[#232530] px-3 py-2 pr-9 font-nav text-sm font-bold text-white outline-none focus:border-white/60"
                  >
                    {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((anio) => (
                      <option key={anio} value={anio}>
                        Temporada {anio}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>

          {es2026 && (
            <div className="relative z-10 px-3 pb-2 sm:px-5 lg:-mt-2 lg:px-7 lg:pb-3">
              <AutoEscuderia key={id} id={id} nombre={escuderia.name} />
            </div>
          )}
        </motion.section>

        {/* Estadísticas originales, sin modificar sus valores. */}
        <section
          aria-label="Estadísticas de la escudería"
          className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3"
        >
          {[
            {
              titulo: "Posición",
              Icono: Medal,
              valor: clasificacion?.position ?? "—",
            },
            {
              titulo: "Puntos",
              Icono: Flag,
              valor: clasificacion?.points ?? "—",
            },
            {
              titulo: "Victorias",
              Icono: Trophy,
              valor: clasificacion?.wins ?? "—",
            },
          ].map(({ titulo, Icono, valor }, indice) => (
            <motion.div
              key={titulo}
              initial={reducirMovimiento ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              whileHover={reducirMovimiento ? undefined : { y: -3 }}
              transition={{
                duration: reducirMovimiento ? 0 : 0.3,
                delay: reducirMovimiento ? 0 : indice * 0.075,
              }}
              className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#20212b]"
            >
              <div className="mb-1 flex items-center gap-1.5 font-nav text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <Icono className="h-4 w-4 text-[#e10600]" /> {titulo}
              </div>
              <strong className="block font-racing text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
                {valor}
              </strong>
            </motion.div>
          ))}
        </section>
      </div>
    </main>
  );
}

export default EscuderiaDetalle;
