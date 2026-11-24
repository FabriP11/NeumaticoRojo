import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Flag,
  Globe2,
  Info,
  LoaderCircle,
  Trophy,
  UserRound,
} from "lucide-react";
import { obtenerColorEscuderia } from "../utils/coloresF1";
import FotoPiloto from "../components/FotoPiloto";

const TEMPORADAS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];

// Nacionalidades que devuelve la API de F1 (Jolpica/Ergast).
// Los códigos ISO permiten mostrar las banderas de manera circular.
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

function BanderaCircular({ nacionalidad }) {
  const clave = String(nacionalidad || "")
    .trim()
    .toLowerCase();
  const codigo = CODIGOS_NACIONALIDAD[clave];

  if (!nacionalidad) return null;

  return (
    <span
      title={nacionalidad}
      className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-500 shadow-sm dark:border-white/15 dark:bg-[#313540] dark:text-slate-300"
    >
      <Globe2 className="absolute h-3.5 w-3.5" aria-hidden="true" />
      {codigo && (
        <img
          src={`https://flagcdn.com/w80/${codigo}.png`}
          alt={`Bandera correspondiente a ${nacionalidad}`}
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

function ColorEscuderia({ id, nombre }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      title={nombre || "Escudería"}
      style={{ backgroundColor: obtenerColorEscuderia(id) }}
      aria-hidden="true"
    />
  );
}

const CLASE_CABECERA =
  "whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-4 font-nav text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:border-[#383b46] dark:bg-[#22242e] dark:text-[#aeb4c2] sm:px-6";

const CLASE_CELDA =
  "border-b border-slate-100 px-4 py-4 align-middle dark:border-white/10 sm:px-6";

function Clasificaciones() {
  const reducirMovimiento = useReducedMotion();
  const [temporada, setTemporada] = useState("2026");
  const [tipo, setTipo] = useState("pilotos");
  const esTemporadaActual = temporada === "2026";

  // Una entrada de caché independiente para cada temporada.
  const clasificaciones = useQuery({
    queryKey: ["publico", "clasificaciones", temporada],
    queryFn: async ({ signal }) => {
      const respuesta = await fetch(
        `/api/clasificaciones?temporada=${temporada}`,
        { signal },
      );

      if (!respuesta.ok) {
        throw new Error("No se pudieron obtener las clasificaciones");
      }

      const datos = await respuesta.json();
      if (
        !Array.isArray(datos?.pilotos) ||
        !Array.isArray(datos?.constructores)
      ) {
        throw new Error("Formato de clasificaciones incorrecto");
      }
      return datos;
    },
    staleTime: esTemporadaActual ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchInterval: esTemporadaActual ? 5 * 60 * 1000 : false,
    refetchIntervalInBackground: false,
  });

  // Los dorsales son complementarios: si fallan, conservamos la clasificación.
  const dorsales = useQuery({
    queryKey: ["publico", "dorsales-temporada", temporada],
    queryFn: async ({ signal }) => {
      const respuesta = await fetch(
        `/api/dorsales-temporada?temporada=${temporada}`,
        { signal },
      );
      if (!respuesta.ok) {
        throw new Error("No se pudieron consultar los dorsales");
      }
      const datos = await respuesta.json();
      if (
        !datos ||
        typeof datos.pilotos !== "object" ||
        !datos.pilotos ||
        Array.isArray(datos.pilotos)
      ) {
        throw new Error("Formato de dorsales incorrecto");
      }
      return datos.pilotos;
    },
    staleTime: esTemporadaActual ? 30 * 60 * 1000 : 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 0,
  });

  const pilotos = clasificaciones.data?.pilotos ?? [];
  const constructores = clasificaciones.data?.constructores ?? [];
  const detallesPilotos = dorsales.data ?? {};
  const cargando = !clasificaciones.data && clasificaciones.isPending;
  // Si falla una actualización, seguimos mostrando los datos guardados.
  const error =
    !clasificaciones.data && clasificaciones.isError
      ? clasificaciones.error?.message ||
        "No se pudieron cargar las clasificaciones"
      : "";

  const elementos = tipo === "pilotos" ? pilotos : constructores;

  return (
    <main className="mx-auto min-h-[65vh] w-full max-w-[1500px] px-4 pb-16 pt-8 text-[#15151d] sm:px-6 lg:px-8 lg:pt-10 dark:text-white">
      {/* ENCABEZADO */}
      <div className="mb-8 flex flex-col gap-5 border-l-4 border-[#e10600] pl-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-1 font-nav text-xs font-bold uppercase tracking-[0.2em] text-[#e10600]">
            CAMPEONATO MUNDIAL
          </p>
          <h1 className="m-0 flex flex-wrap items-center gap-3 font-racing text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">
            <Trophy
              className="h-7 w-7 shrink-0 text-[#e10600]"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            Clasificaciones
          </h1>
          <p className="mt-2 font-nav text-base text-slate-600 dark:text-[#b8bdc9]">
            Consultá las posiciones de pilotos y constructores de cada
            temporada.
          </p>
        </div>

        {/* SELECTOR DE TEMPORADAS */}
        <div className="w-full shrink-0 sm:w-auto">
          <label
            htmlFor="clasificaciones-temporada"
            className="mb-1 block font-nav text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#aeb4c2]"
          >
            Elegir temporada
          </label>
          <div className="relative">
            <CalendarDays
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#e10600]"
              aria-hidden="true"
            />
            <select
              id="clasificaciones-temporada"
              value={temporada}
              onChange={(evento) => setTemporada(evento.target.value)}
              className="w-full min-w-44 appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 font-nav text-base font-bold text-[#15151d] shadow-sm outline-none transition-colors hover:border-[#e10600] focus-visible:border-[#e10600] focus-visible:ring-2 focus-visible:ring-[#e10600]/20 dark:border-[#424653] dark:bg-[#20212b] dark:text-white dark:focus-visible:ring-[#e10600]/30"
            >
              {TEMPORADAS.map((anio) => (
                <option key={anio} value={anio}>
                  Temporada {anio}
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

      {/* PESTAÑAS PILOTOS / CONSTRUCTORES */}
      <div
        className="mb-6 flex w-full gap-2 border-b border-slate-200 dark:border-[#393c47]"
        aria-label="Tipo de clasificación"
      >
        <button
          type="button"
          onClick={() => setTipo("pilotos")}
          aria-pressed={tipo === "pilotos"}
          className={`inline-flex items-center justify-center gap-2 border-b-2 px-4 py-3 font-nav text-base font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e10600] sm:px-6 ${
            tipo === "pilotos"
              ? "border-[#e10600] text-[#e10600] dark:text-[#ff6666]"
              : "border-transparent text-slate-500 hover:text-[#e10600] dark:text-[#aeb4c2] dark:hover:text-white"
          }`}
        >
          <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
          Pilotos
        </button>
        <button
          type="button"
          onClick={() => setTipo("constructores")}
          aria-pressed={tipo === "constructores"}
          className={`inline-flex items-center justify-center gap-2 border-b-2 px-4 py-3 font-nav text-base font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e10600] sm:px-6 ${
            tipo === "constructores"
              ? "border-[#e10600] text-[#e10600] dark:text-[#ff6666]"
              : "border-transparent text-slate-500 hover:text-[#e10600] dark:text-[#aeb4c2] dark:hover:text-white"
          }`}
        >
          <Flag className="h-4 w-4 shrink-0" aria-hidden="true" />
          Constructores
        </button>
      </div>

      {/* CARGANDO / ERROR */}
      {cargando && (
        <div
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 font-nav text-base text-slate-600 dark:border-white/10 dark:bg-[#1c1e27] dark:text-slate-300"
          role="status"
        >
          <LoaderCircle
            className="h-5 w-5 shrink-0 animate-spin text-[#e10600]"
            aria-hidden="true"
          />
          Cargando clasificaciones...
        </div>
      )}

      {!cargando && error && (
        <div
          className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 font-nav text-base text-red-700 dark:border-red-500/20 dark:bg-[#321c24] dark:text-red-300"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          Error: {error}
        </div>
      )}

      {/* TABLA DE POSICIONES */}
      {!cargando && !error && (
        <motion.div
          key={`${temporada}-${tipo}`}
          initial={reducirMovimiento ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reducirMovimiento ? 0 : 0.27,
            ease: "easeOut",
          }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#373944] dark:bg-[#1c1e27] dark:shadow-none"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-[#373944] sm:px-6">
            <div className="flex items-center gap-2">
              {tipo === "pilotos" ? (
                <UserRound
                  className="h-5 w-5 text-[#e10600]"
                  aria-hidden="true"
                />
              ) : (
                <Flag className="h-5 w-5 text-[#e10600]" aria-hidden="true" />
              )}
              <h2 className="m-0 font-racing text-lg font-bold uppercase text-[#15151d] dark:text-white">
                {tipo === "pilotos"
                  ? "Mundial de pilotos"
                  : "Mundial de constructores"}
              </h2>
            </div>
            <span className="rounded-md bg-slate-100 px-3 py-1 font-nav text-xs font-bold uppercase tracking-wide text-slate-600 dark:bg-[#2a2c37] dark:text-[#bcc2ce]">
              {temporada} · {elementos.length}{" "}
              {tipo === "pilotos" ? "pilotos" : "escuderías"}
            </span>
          </div>

          {/* MÓVIL: tarjetas legibles sin desplazar la tabla horizontalmente. */}
          <div className="divide-y divide-slate-200 md:hidden dark:divide-white/10">
            {tipo === "pilotos" &&
              pilotos.map((piloto) => {
                const idPiloto = piloto.Driver.driverId;
                const detalles = detallesPilotos[idPiloto] || {};
                const idEquipo =
                  detalles.id_escuderia || piloto.Constructors?.[0]?.constructorId;
                const numero = detalles.numero ?? piloto.Driver.permanentNumber;
                const colorEquipo = obtenerColorEscuderia(idEquipo);
                const nombre = `${piloto.Driver.givenName} ${piloto.Driver.familyName}`;

                return (
                  <article
                    key={idPiloto}
                    className={`p-4 ${Number(piloto.position) <= 3 ? "bg-red-50/50 dark:bg-red-950/10" : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-racing text-lg font-extrabold text-[#e10600] dark:bg-[#292b35]">
                        {piloto.position}
                      </span>
                      {temporada === "2026" ? (
                        <FotoPiloto
                          idPiloto={idPiloto}
                          nombre={nombre}
                          colorEquipo={colorEquipo}
                          temporada={temporada}
                          tamano="md"
                        />
                      ) : (
                        <BanderaCircular nacionalidad={piloto.Driver.nationality} />
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/pilotos/${idPiloto}?temporada=${temporada}`}
                          className="inline-flex min-w-0 items-start gap-1 break-words font-nav text-sm font-bold text-[#242731] no-underline hover:text-[#e10600] dark:text-white dark:hover:text-[#ff6b6b]"
                        >
                          {nombre}
                          <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-[#aeb4c2]">
                          {numero != null && String(numero).trim() !== "" && (
                            <strong style={{ color: colorEquipo }}>#{numero}</strong>
                          )}
                          {piloto.Constructors?.length > 0 ? (
                            piloto.Constructors.map((equipo) => (
                              <span key={equipo.constructorId} className="inline-flex items-center gap-1">
                                <ColorEscuderia id={equipo.constructorId} nombre={equipo.name} />
                                {equipo.name}
                              </span>
                            ))
                          ) : (
                            <span>Sin escudería</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-[#111219]">
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Victorias</dt>
                        <dd className="mt-1 font-racing text-base font-bold tabular-nums">{piloto.wins}</dd>
                      </div>
                      <div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-[#111219]">
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Puntos</dt>
                        <dd className="mt-1 font-racing text-base font-extrabold tabular-nums">{piloto.points}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}

            {tipo === "constructores" &&
              constructores.map((constructor) => {
                const equipo = constructor.Constructor;
                const idEquipo = equipo.constructorId;

                return (
                  <article
                    key={idEquipo}
                    className={`p-4 ${Number(constructor.position) <= 3 ? "bg-red-50/50 dark:bg-red-950/10" : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-racing text-lg font-extrabold text-[#e10600] dark:bg-[#292b35]">
                        {constructor.position}
                      </span>
                      <span className="h-7 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: obtenerColorEscuderia(idEquipo) }} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/escuderias/${idEquipo}?temporada=${temporada}`}
                          className="inline-flex min-w-0 items-start gap-1 break-words font-nav text-sm font-bold text-[#242731] no-underline hover:text-[#e10600] dark:text-white dark:hover:text-[#ff6b6b]"
                        >
                          {equipo.name}
                          <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        </Link>
                        {equipo.nationality && (
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <BanderaCircular nacionalidad={equipo.nationality} />
                            {equipo.nationality}
                          </div>
                        )}
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-[#111219]">
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Victorias</dt>
                        <dd className="mt-1 font-racing text-base font-bold tabular-nums">{constructor.wins}</dd>
                      </div>
                      <div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-[#111219]">
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Puntos</dt>
                        <dd className="mt-1 font-racing text-base font-extrabold tabular-nums">{constructor.points}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
          </div>

          {/* TABLET Y PC: se conserva la tabla completa de siempre. */}
          <div className="hidden w-full overflow-x-auto md:block">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className={`${CLASE_CABECERA} w-20 text-center`}
                  >
                    POS.
                  </th>
                  <th scope="col" className={CLASE_CABECERA}>
                    {tipo === "pilotos" ? "PILOTO" : "ESCUDERÍA"}
                  </th>
                  <th
                    scope="col"
                    className={`${CLASE_CABECERA} w-28 text-center`}
                  >
                    VICTORIAS
                  </th>
                  <th
                    scope="col"
                    className={`${CLASE_CABECERA} w-32 text-right`}
                  >
                    PUNTOS
                  </th>
                </tr>
              </thead>

              <tbody>
                {tipo === "pilotos" &&
                  pilotos.map((piloto, indice) => {
                    const idPiloto = piloto.Driver.driverId;
                    const detalles = detallesPilotos[idPiloto] || {};
                    const idEquipo =
                      detalles.id_escuderia ||
                      piloto.Constructors?.[0]?.constructorId;
                    const numero =
                      detalles.numero ?? piloto.Driver.permanentNumber;
                    const colorEquipo = obtenerColorEscuderia(idEquipo);

                    return (
                      <motion.tr
                        key={idPiloto}
                        layout={!reducirMovimiento ? "position" : false}
                        initial={
                          reducirMovimiento ? false : { opacity: 0, x: -8 }
                        }
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: reducirMovimiento ? 0 : 0.2,
                          delay: reducirMovimiento
                            ? 0
                            : Math.min(indice, 10) * 0.025,
                        }}
                        className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${Number(piloto.position) <= 3 ? "bg-red-50/50 dark:bg-red-950/10" : ""}`}
                      >
                        <td className={`${CLASE_CELDA} text-center`}>
                          <span className="font-racing text-base font-extrabold tabular-nums text-[#e10600]">
                            {piloto.position}
                          </span>
                        </td>

                        <td className={CLASE_CELDA}>
                          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                            {numero != null && String(numero).trim() !== "" && (
                              <span
                                className="shrink-0 font-racing text-sm font-extrabold tabular-nums"
                                style={{ color: colorEquipo }}
                              >
                                #{numero}
                              </span>
                            )}
                            {temporada === "2026" ? (
                              <FotoPiloto
                                idPiloto={idPiloto}
                                nombre={`${piloto.Driver.givenName} ${piloto.Driver.familyName}`}
                                colorEquipo={colorEquipo}
                                temporada={temporada}
                                tamano="md"
                              />
                            ) : (
                              <BanderaCircular
                                nacionalidad={piloto.Driver.nationality}
                              />
                            )}
                            <Link
                              to={`/pilotos/${idPiloto}?temporada=${temporada}`}
                              className="group inline-flex min-w-0 items-center gap-1 font-nav text-base font-bold text-[#242731] no-underline transition-colors hover:text-[#e10600] dark:text-[#edf0f7] dark:hover:text-[#ff6b6b]"
                            >
                              {piloto.Driver.givenName}{" "}
                              {piloto.Driver.familyName}
                              <ArrowUpRight
                                className="h-3.5 w-3.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-100"
                                aria-hidden="true"
                              />
                            </Link>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-nav text-xs text-slate-500 dark:text-[#aeb4c2]">
                            {piloto.Constructors?.length > 0 ? (
                              piloto.Constructors.map((equipo) => (
                                <span
                                  key={equipo.constructorId}
                                  className="inline-flex items-center gap-1.5"
                                >
                                  <ColorEscuderia
                                    id={equipo.constructorId}
                                    nombre={equipo.name}
                                  />
                                  {equipo.name}
                                </span>
                              ))
                            ) : (
                              <span>Sin escudería</span>
                            )}
                          </div>
                        </td>

                        <td className={`${CLASE_CELDA} text-center`}>
                          <span className="font-racing text-sm font-bold tabular-nums text-[#343844] dark:text-[#e0e3eb]">
                            {piloto.wins}
                          </span>
                        </td>
                        <td className={`${CLASE_CELDA} text-right`}>
                          <strong className="font-racing text-base font-extrabold tabular-nums text-[#15151d] dark:text-white">
                            {piloto.points}
                          </strong>
                        </td>
                      </motion.tr>
                    );
                  })}

                {tipo === "constructores" &&
                  constructores.map((constructor, indice) => {
                    const equipo = constructor.Constructor;
                    const idEquipo = equipo.constructorId;

                    return (
                      <motion.tr
                        key={idEquipo}
                        layout={!reducirMovimiento ? "position" : false}
                        initial={
                          reducirMovimiento ? false : { opacity: 0, x: -8 }
                        }
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: reducirMovimiento ? 0 : 0.2,
                          delay: reducirMovimiento
                            ? 0
                            : Math.min(indice, 10) * 0.025,
                        }}
                        className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${Number(constructor.position) <= 3 ? "bg-red-50/50 dark:bg-red-950/10" : ""}`}
                      >
                        <td className={`${CLASE_CELDA} text-center`}>
                          <span className="font-racing text-base font-extrabold tabular-nums text-[#e10600]">
                            {constructor.position}
                          </span>
                        </td>

                        <td className={CLASE_CELDA}>
                          <div className="flex min-w-0 flex-wrap items-center gap-3">
                            <ColorEscuderia
                              id={idEquipo}
                              nombre={equipo.name}
                            />
                            <Link
                              to={`/escuderias/${idEquipo}?temporada=${temporada}`}
                              className="group inline-flex min-w-0 items-center gap-1 font-nav text-base font-bold text-[#242731] no-underline transition-colors hover:text-[#e10600] dark:text-[#edf0f7] dark:hover:text-[#ff6b6b]"
                            >
                              {equipo.name}
                              <ArrowUpRight
                                className="h-3.5 w-3.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-100"
                                aria-hidden="true"
                              />
                            </Link>
                          </div>

                          {equipo.nationality && (
                            <div className="mt-1.5 flex items-center gap-2 font-nav text-xs text-slate-500 dark:text-[#aeb4c2]">
                              <BanderaCircular
                                nacionalidad={equipo.nationality}
                              />
                              <span>{equipo.nationality}</span>
                            </div>
                          )}
                        </td>

                        <td className={`${CLASE_CELDA} text-center`}>
                          <span className="font-racing text-sm font-bold tabular-nums text-[#343844] dark:text-[#e0e3eb]">
                            {constructor.wins}
                          </span>
                        </td>
                        <td className={`${CLASE_CELDA} text-right`}>
                          <strong className="font-racing text-base font-extrabold tabular-nums text-[#15151d] dark:text-white">
                            {constructor.points}
                          </strong>
                        </td>
                      </motion.tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {elementos.length === 0 && (
            <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-6 font-nav text-sm text-slate-600 dark:border-white/10 dark:text-[#b8bdc9]">
              <Info
                className="h-4 w-4 shrink-0 text-[#e10600]"
                aria-hidden="true"
              />
              No hay clasificaciones disponibles.
            </div>
          )}
        </motion.div>
      )}
    </main>
  );
}

export default Clasificaciones;
