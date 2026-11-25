import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Flag,
  Globe2,
  LoaderCircle,
  Medal,
  Trophy,
  UserRound,
  ListOrdered,
} from "lucide-react";
import { obtenerColorEscuderia } from "../utils/coloresF1";
import { obtenerArchivoPiloto } from "../components/FotoPiloto";
import { obtenerImagenFondoGP } from "../utils/imagenesGP";

// Misma paleta de fondo que usamos en el perfil de las escuderías.
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

function obtenerFondoEquipo(idEquipo, color) {
  const [inicio, fin] = FONDOS_ESCUDERIAS[idEquipo] || ["#18202b", color];
  return `linear-gradient(115deg, ${inicio} 0%, ${fin} 100%)`;
}

// Los retratos 2026 se encuentran en frontend/public/pilotos/2026/*.avif.
// No se muestran fotos de 2026 al consultar temporadas anteriores.
function RetratoPiloto({ idPiloto, nombre, temporada, reducirMovimiento }) {
  const archivo =
    String(temporada) === "2026"
      ? obtenerArchivoPiloto(idPiloto, nombre)
      : null;
  const [falloImagen, setFalloImagen] = useState(false);

  useEffect(() => {
    setFalloImagen(false);
  }, [archivo, temporada]);

  if (String(temporada) !== "2026") return null;

  return (
    <div className="relative flex h-full min-h-[250px] w-full min-w-0 items-end justify-center overflow-hidden sm:min-h-[400px]">
      <div
        className="pointer-events-none absolute -bottom-24 left-1/2 h-[260px] w-[260px] -translate-x-1/2 rounded-full border border-white/15 bg-black/10 sm:-bottom-[175px] sm:h-[460px] sm:w-[460px]"
        aria-hidden="true"
      />
      {archivo && !falloImagen ? (
        <motion.img
          key={archivo}
          initial={reducirMovimiento ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reducirMovimiento ? 0 : 0.6,
            ease: "easeOut",
          }}
          src={`/pilotos/2026/${archivo}.avif`}
          alt={`Fotografía de ${nombre} en la temporada 2026`}
          className="pointer-events-none relative top-2 z-10 block h-full w-full max-w-[480px] origin-bottom scale-[0.93] object-contain object-bottom drop-shadow-[0_12px_18px_rgba(0,0,0,.35)] sm:top-0 sm:scale-100"
          loading="eager"
          decoding="async"
          onError={() => setFalloImagen(true)}
        />
      ) : (
        <div className="relative z-10 flex h-full items-center justify-center text-white/55">
          <UserRound
            className="h-16 w-16 sm:h-32 sm:w-32"
            strokeWidth={1.25}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}

function PilotoDetalle() {
  const reducirMovimiento = useReducedMotion();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const temporada = searchParams.get("temporada") || "2026";

  const location = useLocation();
  const volverA = location.state?.volverA;
  const vieneDeEscuderia =
    typeof volverA === "string" &&
    /^\/escuderias\/[a-z0-9_-]+\?temporada=\d{4}$/i.test(volverA);
  const destinoVolver = vieneDeEscuderia
    ? volverA
    : `/clasificaciones?temporada=${temporada}`;
  const textoVolver = vieneDeEscuderia
    ? "Volver a escudería"
    : "Volver a clasificaciones";

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function obtenerPiloto() {
      setCargando(true);
      setError("");
      setDatos(null);

      try {
        const respuesta = await fetch(
          `/api/pilotos/${encodeURIComponent(id)}?temporada=${temporada}`,
          { signal: controller.signal },
        );

        if (!respuesta.ok) {
          throw new Error("No se pudo obtener el piloto");
        }

        const resultado = await respuesta.json();

        if (!resultado.piloto) {
          throw new Error("Piloto no encontrado");
        }

        if (!controller.signal.aborted) {
          setDatos(resultado);
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

    obtenerPiloto();
    return () => controller.abort();
  }, [id, temporada]);

  const clasePagina =
    "min-h-screen bg-[#f4f5f8] px-4 py-8 font-nav text-[#15151d] sm:px-6 lg:py-12 dark:bg-[#15151d] dark:text-white";

  if (cargando || error) {
    return (
      <main className={clasePagina}>
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
          <Link
            to={destinoVolver}
            className="inline-flex w-fit items-center gap-2 font-nav text-base font-bold text-[#d10c16] no-underline dark:text-[#ff6a6a]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {textoVolver}
          </Link>
          <div
            className={`flex items-center gap-3 rounded-2xl border p-6 ${
              error
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-[#351c22] dark:text-red-200"
                : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-[#20212b] dark:text-gray-300"
            }`}
            role={error ? "alert" : "status"}
          >
            {error ? (
              <AlertCircle
                className="h-5 w-5 shrink-0 text-[#e10600]"
                aria-hidden="true"
              />
            ) : (
              <LoaderCircle
                className="h-5 w-5 shrink-0 animate-spin text-[#e10600]"
                aria-hidden="true"
              />
            )}
            {error ? `Error: ${error}` : "Cargando piloto..."}
          </div>
        </div>
      </main>
    );
  }

  if (!datos) return null;

  const { piloto, clasificacion, podios, resultados } = datos;
  const nombre = `${piloto.givenName} ${piloto.familyName}`;
  const equipos = clasificacion?.Constructors || [];
  const escuderias =
    equipos.map((equipo) => equipo.name).join(", ") || "Sin datos de escudería";
  const idEquipo = equipos[0]?.constructorId;
  const colorEquipo = idEquipo ? obtenerColorEscuderia(idEquipo) : "#e10600";
  const fondoEquipo = obtenerFondoEquipo(idEquipo, colorEquipo);
  const dorsal = piloto.permanentNumber;
  const mostrarRetrato = String(temporada) === "2026";

  const estadisticas = [
    { titulo: "POSICIÓN", valor: clasificacion?.position ?? "—", Icono: Medal },
    { titulo: "PUNTOS", valor: clasificacion?.points ?? "—", Icono: Flag },
    { titulo: "VICTORIAS", valor: clasificacion?.wins ?? "—", Icono: Trophy },
    { titulo: "PODIOS", valor: podios ?? "—", Icono: Medal },
  ];

  const carreras = Array.isArray(resultados) ? resultados : [];

  return (
    <main className={clasePagina}>
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-7">
        <Link
          to={destinoVolver}
          className="group inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-nav text-base font-bold text-slate-700 no-underline transition-colors hover:text-[#e10600] dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeft
            className="h-4 w-4 transition-transform group-hover:-translate-x-1"
            aria-hidden="true"
          />
          {textoVolver}
        </Link>

        {/* Cabecera deportiva: cambia según la escudería de la temporada seleccionada. */}
        <motion.section
          key={`${id}-${temporada}`}
          initial={reducirMovimiento ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reducirMovimiento ? 0 : 0.42,
            ease: "easeOut",
          }}
          className="relative isolate overflow-hidden rounded-[26px] border border-black/10 text-white shadow-xl"
          style={{ background: fondoEquipo }}
          aria-label={`Perfil de ${nombre}`}
        >
          {/* Tramas diagonales y de puntos como en los perfiles de escuderías. */}
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
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.30),rgba(0,0,0,.04)_90%)]"
            aria-hidden="true"
          />

          <div
            className={`relative z-10 grid min-w-0 grid-cols-1 ${
              mostrarRetrato
                ? "h-[395px] grid-cols-[minmax(0,1fr)_minmax(108px,39%)] sm:h-[480px] sm:grid-cols-[minmax(0,1fr)_minmax(260px,42%)] lg:h-[520px]"
                : "grid-cols-1"
            }`}
          >
            <div
              className={`relative flex min-w-0 flex-col justify-center ${
                mostrarRetrato
                  ? "justify-start gap-2 py-4 pl-3 pr-1 sm:justify-center sm:gap-5 sm:p-8 lg:p-10"
                  : "gap-5 p-6 sm:p-8 lg:p-10"
              }`}
            >
              <p className="m-0 flex items-center gap-1.5 font-nav text-[10px] font-bold uppercase tracking-[.12em] text-white/90 sm:gap-2 sm:text-sm sm:tracking-[.22em]">
                <UserRound className="h-4 w-4" aria-hidden="true" />
                Perfil de piloto
              </p>

              <div>
                <h1
                  className={`m-0 max-w-3xl break-words font-racing font-extrabold uppercase italic leading-tight tracking-tight text-white ${
                    mostrarRetrato
                      ? "text-[clamp(1.15rem,6vw,1.8rem)] sm:text-5xl lg:text-[clamp(2.3rem,4vw,4.4rem)]"
                      : "text-3xl sm:text-5xl lg:text-[clamp(2.3rem,4vw,4.4rem)]"
                  }`}
                >
                  {nombre}
                </h1>
                {dorsal && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/20 px-2 py-1 font-racing text-xs font-extrabold text-white backdrop-blur-sm sm:mt-3 sm:gap-2 sm:px-3 sm:text-sm">
                    #{dorsal}
                    <span className="font-nav font-semibold text-white/75">
                      Dorsal
                    </span>
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col items-start gap-2 font-nav text-xs font-semibold text-white/95 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-3 sm:text-base">
                <span className="inline-flex items-center gap-2">
                  <Globe2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {piloto.nationality}
                </span>
                {idEquipo ? (
                  <Link
                    to={`/escuderias/${idEquipo}?temporada=${temporada}`}
                    className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-lg border border-white/20 bg-black/25 px-2 py-1.5 text-white no-underline transition-colors hover:bg-black/40 sm:gap-2 sm:px-3"
                  >
                    <Flag className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 break-words">{escuderias}</span>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 opacity-80"
                      aria-hidden="true"
                    />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Flag className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {escuderias}
                  </span>
                )}
              </div>

              <div className="mt-1 inline-flex max-w-full w-fit items-center gap-1.5 rounded-lg border border-white/20 bg-black/25 px-2 py-2 font-nav text-xs font-bold text-white backdrop-blur-sm sm:gap-2 sm:px-4 sm:py-2.5 sm:text-base">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                <span className="sm:hidden">{temporada}</span>
                <span className="hidden sm:inline">Temporada {temporada}</span>
              </div>

              {/* Estadísticas dentro de la cabecera, solo en móviles con retrato. */}
              {mostrarRetrato && (
                <div
                  className="mt-auto grid grid-cols-2 gap-1.5 pt-1 sm:hidden"
                  aria-label="Estadísticas de la temporada"
                >
                  {estadisticas.map(({ titulo, valor, Icono }) => (
                    <div
                      key={titulo}
                      className="min-w-0 rounded-lg border border-white/25 bg-black/25 px-1.5 py-1.5 text-white backdrop-blur-[2px]"
                    >
                      <span className="flex items-center gap-1 font-nav text-[8px] font-bold uppercase leading-tight tracking-wide text-white/85">
                        <Icono className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {titulo}
                      </span>
                      <strong className="mt-0.5 block truncate font-racing text-base font-extrabold leading-tight text-white">
                        {valor}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {mostrarRetrato && (
              <RetratoPiloto
                key={`${id}-${temporada}`}
                idPiloto={id}
                nombre={nombre}
                temporada={temporada}
                reducirMovimiento={reducirMovimiento}
              />
            )}
          </div>
        </motion.section>

        {/* Estadísticas: mantenemos los datos existentes. */}
        <section
          aria-label="Estadísticas del piloto"
          className={`${mostrarRetrato ? "hidden sm:grid" : "grid"} grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4`}
        >
          {estadisticas.map(({ titulo, valor, Icono }, indice) => (
            <motion.article
              key={titulo}
              initial={reducirMovimiento ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              whileHover={reducirMovimiento ? undefined : { y: -3 }}
              transition={{
                duration: reducirMovimiento ? 0 : 0.32,
                delay: reducirMovimiento ? 0 : indice * 0.055,
              }}
              className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-slate-300 sm:p-5 dark:border-white/10 dark:bg-[#20212b] dark:shadow-md dark:hover:border-white/20"
            >
              <div className="mb-2 flex items-center gap-1.5 font-nav text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:mb-4 sm:gap-2 sm:text-xs sm:tracking-widest dark:text-gray-400">
                <Icono
                  className="h-5 w-5 shrink-0 text-[#e10600]"
                  aria-hidden="true"
                />
                {titulo}
              </div>
              <strong className="block font-racing text-2xl font-extrabold tracking-tight text-[#15151d] sm:text-4xl dark:text-white">
                {valor}
              </strong>
            </motion.article>
          ))}
        </section>

        {/* Historial: tarjetas en móvil y tabla original desde pantallas medianas. */}
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-7 dark:border-white/10 dark:bg-[#20212b] dark:shadow-lg">
          <div className="mb-6 flex items-start gap-3 border-l-4 border-[#e10600] pl-4">
            <ListOrdered
              className="mt-1 h-6 w-6 shrink-0 text-[#e10600]"
              aria-hidden="true"
            />
            <div>
              <p className="mb-1 font-nav text-xs font-bold uppercase tracking-[0.2em] text-[#d10c16] dark:text-[#ff5a55]">
                Historial deportivo
              </p>
              <h2 className="m-0 font-racing text-xl font-extrabold uppercase italic tracking-tight text-[#15151d] sm:text-2xl dark:text-white">
                Resultados de la temporada {temporada}
              </h2>
            </div>
          </div>

          {/* Vista compacta en móvil: todas las columnas visibles sin scroll horizontal. */}
          {carreras.length > 0 && (
            <div className="grid gap-2 md:hidden">
              {carreras.map((carrera) => {
                const resultado = carrera.Results?.[0];
                const imagenFondoGP = obtenerImagenFondoGP(carrera);
                return (
                  <article
                    key={carrera.round}
                    className="relative isolate min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#15151d]"
                  >
                    {/* El fondo es absoluto: no altera la altura ni el ancho de la tarjeta. */}
                    {imagenFondoGP && (
                      <div
                        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                        aria-hidden="true"
                      >
                        <img
                          src={imagenFondoGP}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full scale-[1.06] object-cover object-center opacity-85 blur-[1px] dark:opacity-80"
                          onError={(evento) => {
                            evento.currentTarget.style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-white/75 dark:bg-[#101116]/70" />
                      </div>
                    )}
                    <div className="relative z-10 mb-3 flex min-w-0 items-start gap-2">
                      <span className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-[#e10600]/10 px-1 font-racing text-sm font-extrabold text-[#b90000] dark:bg-[#e10600]/15 dark:text-[#ff7772]">
                        {carrera.round}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                          Gran Premio · Ronda {carrera.round}
                        </p>
                        <h3 className="mt-0.5 break-words font-nav text-sm font-bold leading-snug text-[#15151d] dark:text-white">
                          {carrera.raceName}
                        </h3>
                      </div>
                    </div>
                    <div className="relative z-10 grid grid-cols-3 gap-2">
                      <div className="min-w-0 rounded-lg bg-white px-2 py-2 text-center dark:bg-[#20212b]">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                          Parrilla
                        </span>
                        <strong className="mt-1 block font-racing text-base text-[#15151d] dark:text-white">
                          {resultado?.grid ?? "—"}
                        </strong>
                      </div>
                      <div className="min-w-0 rounded-lg bg-white px-2 py-2 text-center dark:bg-[#20212b]">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                          Posición
                        </span>
                        <strong className="mt-1 block font-racing text-base text-[#15151d] dark:text-white">
                          {resultado?.positionText || "—"}
                        </strong>
                      </div>
                      <div className="min-w-0 rounded-lg bg-[#e10600]/10 px-2 py-2 text-center dark:bg-[#e10600]/15">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-[#a30808] dark:text-[#ffaba7]">
                          Puntos
                        </span>
                        <strong className="mt-1 block font-racing text-base text-[#b90000] dark:text-[#ff7772]">
                          {resultado?.points ?? "—"}
                        </strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Tabla original para tablets y computadoras. */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block dark:border-white/10 dark:bg-[#15151d]">
            <table className="w-full min-w-[650px] border-collapse text-left font-nav text-sm">
              <thead className="bg-slate-100 font-nav text-xs uppercase tracking-wider text-slate-600 dark:bg-[#292b36] dark:text-gray-300">
                <tr>
                  <th scope="col" className="px-4 py-4 font-bold sm:px-5">
                    RONDA
                  </th>
                  <th scope="col" className="px-4 py-4 font-bold sm:px-5">
                    GRAN PREMIO
                  </th>
                  <th scope="col" className="px-4 py-4 font-bold sm:px-5">
                    PARRILLA
                  </th>
                  <th scope="col" className="px-4 py-4 font-bold sm:px-5">
                    POSICIÓN
                  </th>
                  <th scope="col" className="px-4 py-4 font-bold sm:px-5">
                    PUNTOS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {carreras.map((carrera, indice) => {
                  const resultado = carrera.Results?.[0];
                  return (
                    <motion.tr
                      key={carrera.round}
                      initial={
                        reducirMovimiento ? false : { opacity: 0, x: -6 }
                      }
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{
                        duration: reducirMovimiento ? 0 : 0.22,
                        delay: reducirMovimiento ? 0 : (indice % 8) * 0.025,
                      }}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-4 font-bold text-slate-600 sm:px-5 dark:text-gray-300">
                        {carrera.round}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#15151d] sm:px-5 dark:text-white">
                        {carrera.raceName}
                      </td>
                      <td className="px-4 py-4 text-slate-600 sm:px-5 dark:text-gray-300">
                        {resultado?.grid ?? "—"}
                      </td>
                      <td className="px-4 py-4 font-bold text-[#15151d] sm:px-5 dark:text-white">
                        {resultado?.positionText || "—"}
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <span className="inline-flex min-w-12 justify-center rounded-lg bg-[#e10600]/10 px-3 py-1 font-racing font-bold text-[#b90000] dark:bg-[#e10600]/15 dark:text-[#ff7772]">
                          {resultado?.points ?? "—"}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {carreras.length === 0 && (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 font-nav text-sm text-slate-600 dark:border-white/10 dark:bg-[#15151d] dark:text-gray-300">
              No hay resultados disponibles para esta temporada.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

export default PilotoDetalle;
