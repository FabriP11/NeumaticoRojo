import { useEffect, useState } from "react";
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
  UsersRound,
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

const EXTENSIONES_LOGO = ["webp", "png", "jpg", "jpeg", "avif", "svg"];

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
    <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-black/25 p-2 backdrop-blur-sm sm:h-20 sm:w-28">
      <img
        src={`/escuderias/${archivo}.${EXTENSIONES_LOGO[indice]}`}
        alt={`Logo de ${nombre}`}
        className="max-h-full max-w-full object-contain"
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
  const archivo = nombresAuto[id];
  const [fallo, setFallo] = useState(false);

  useEffect(() => setFallo(false), [id]);

  if (!archivo || fallo) return null;

  return (
    <img
      src={`/escuderias/coches/${archivo}.avif`}
      alt={`Monoplaza 2026 de ${nombre}`}
      className="pointer-events-none relative z-10 mx-auto block w-full max-w-[1000px] object-contain drop-shadow-[0_20px_16px_rgba(0,0,0,0.30)]"
      loading="lazy"
      decoding="async"
      onError={() => setFallo(true)}
    />
  );
}

function EscuderiaDetalle() {
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
          `http://localhost:3001/api/escuderias/${encodeURIComponent(id)}?temporada=${temporada}`,
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

  return (
    <main className="min-h-screen bg-[#f4f5f8] px-4 py-8 text-gray-900 sm:px-6 lg:py-12 dark:bg-[#15151d] dark:text-white">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-7">
        <Link
          to={volver}
          className="group inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 font-nav text-base font-bold text-gray-700 no-underline transition-colors hover:text-[#e10600] dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver a escuderías
        </Link>

        {/* Encabezado visual con logo, color y coche de la escudería. */}
        <section
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

          <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between lg:p-10">
            <div className="min-w-0">
              <p className="mb-3 flex items-center gap-2 font-nav text-sm font-bold uppercase tracking-[.22em] text-white/85">
                <Flag className="h-4 w-4" /> Perfil de escudería
              </p>
              <h1 className="m-0 max-w-3xl font-racing text-3xl font-extrabold uppercase italic tracking-tight text-white sm:text-5xl">
                {escuderia.name}
              </h1>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-nav text-base font-semibold text-white/90">
                <span className="inline-flex items-center gap-2">
                  <Globe2 className="h-4 w-4" /> {escuderia.nationality}
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> Temporada {temporada}
                </span>
              </div>

              {es2026 && pilotosTitulares2026.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {pilotosTitulares2026.map((piloto) => (
                    <div
                      key={piloto.driverId}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 py-1.5 pl-1.5 pr-3 backdrop-blur-sm"
                    >
                      <FotoPiloto
                        idPiloto={piloto.driverId}
                        nombre={`${piloto.givenName} ${piloto.familyName}`}
                        colorEquipo={color}
                        temporada={temporada}
                        tamano="sm"
                      />
                      <span className="font-nav text-sm font-bold text-white">
                        {piloto.givenName} {piloto.familyName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-start gap-3 sm:justify-between lg:justify-end">
              {es2026 && (
                <LogoEscuderia key={id} id={id} nombre={escuderia.name} />
              )}

              <div className="w-48 rounded-xl border border-white/15 bg-black/30 p-3 backdrop-blur-sm sm:w-56">
                <label
                  htmlFor="esc-temporada"
                  className="mb-2 flex items-center gap-2 font-nav text-xs font-bold uppercase tracking-widest text-white/80"
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
                    className="w-full appearance-none rounded-lg border border-white/20 bg-[#232530] px-3 py-2.5 pr-9 font-nav text-base font-bold text-white outline-none focus:border-white/60"
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
            <div className="relative z-10 px-4 pb-5 sm:px-8 sm:pb-7 lg:px-10">
              <AutoEscuderia key={id} id={id} nombre={escuderia.name} />
            </div>
          )}
        </section>

        {/* Estadísticas originales, sin modificar sus valores. */}
        <section
          aria-label="Estadísticas de la escudería"
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
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
          ].map(({ titulo, Icono, valor }) => (
            <div
              key={titulo}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#20212b]"
            >
              <div className="mb-4 flex items-center gap-2 font-nav text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <Icono className="h-5 w-5 text-[#e10600]" /> {titulo}
              </div>
              <strong className="block font-racing text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                {valor}
              </strong>
            </div>
          ))}
        </section>

        {/* Lista de pilotos con fotografía real solo para la temporada 2026. */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7 dark:border-white/10 dark:bg-[#20212b]">
          <div className="mb-6 flex items-start gap-3 border-l-4 border-[#e10600] pl-4">
            <UsersRound className="mt-1 h-6 w-6 shrink-0 text-[#e10600]" />
            <div>
              <p className="mb-1 font-nav text-sm font-bold uppercase tracking-[.2em] text-[#e10600]">
                Plantilla
              </p>
              <h2 className="m-0 font-racing text-xl font-extrabold uppercase italic tracking-tight text-gray-900 sm:text-2xl dark:text-white">
                Pilotos de la temporada {temporada}
              </h2>
            </div>
          </div>

          {pilotos.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {pilotos.map((piloto) => (
                <Link
                  key={piloto.driverId}
                  to={`/pilotos/${piloto.driverId}?temporada=${temporada}`}
                  className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-white/10 dark:bg-[#15151d] dark:text-white dark:hover:border-white/25 dark:hover:bg-[#292b36]"
                  style={{ borderLeftWidth: 4, borderLeftColor: color }}
                >
                  {es2026 ? (
                    <FotoPiloto
                      idPiloto={piloto.driverId}
                      nombre={`${piloto.givenName} ${piloto.familyName}`}
                      colorEquipo={color}
                      temporada={temporada}
                      tamano="lg"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-200 dark:bg-white/5">
                      <UserRound
                        className="h-7 w-7"
                        style={{ color }}
                        aria-hidden="true"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="m-0 font-racing text-base font-bold text-gray-900 sm:text-lg dark:text-white">
                      {piloto.givenName} {piloto.familyName}
                    </h3>
                    <p className="mt-1 font-nav text-sm text-gray-600 dark:text-gray-400">
                      {piloto.nationality}
                    </p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-gray-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#e10600] dark:text-gray-400" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-gray-500 dark:border-white/10 dark:bg-[#15151d] dark:text-gray-400">
              No hay pilotos disponibles para esta temporada.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

export default EscuderiaDetalle;
