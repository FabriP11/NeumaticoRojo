import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
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
function RetratoPiloto({ idPiloto, nombre, temporada }) {
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
    <div className="relative flex h-[200px] w-full items-end justify-center overflow-hidden sm:h-[400px] lg:h-[400px]">
      <div
        className="pointer-events-none absolute bottom-[-175px] left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full border border-white/15 bg-black/10"
        aria-hidden="true"
      />
      {archivo && !falloImagen ? (
        <img
          key={archivo}
          src={`/pilotos/2026/${archivo}.avif`}
          alt={`Fotografía de ${nombre} en la temporada 2026`}
          className="pointer-events-none relative z-10 block h-full w-full max-w-[480px] translate-y-[5px] origin-bottom scale-[1.00] object-contain object-bottom drop-shadow-[0_12px_18px_rgba(0,0,0,.35)]"
          loading="eager"
          decoding="async"
          onError={() => setFalloImagen(true)}
        />
      ) : (
        <div className="relative z-10 flex h-full items-center justify-center text-white/55">
          <UserRound
            className="h-32 w-32"
            strokeWidth={1.25}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}

function PilotoDetalle() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const temporada = searchParams.get("temporada") || "2026";

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
          `http://localhost:3001/api/pilotos/${encodeURIComponent(id)}?temporada=${temporada}`,
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
            to="/clasificaciones"
            className="inline-flex w-fit items-center gap-2 font-nav text-base font-bold text-[#d10c16] no-underline dark:text-[#ff6a6a]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a clasificaciones
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
          to="/clasificaciones"
          className="group inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-nav text-base font-bold text-slate-700 no-underline transition-colors hover:text-[#e10600] dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeft
            className="h-4 w-4 transition-transform group-hover:-translate-x-1"
            aria-hidden="true"
          />
          Volver a clasificaciones
        </Link>

        {/* Cabecera deportiva: cambia según la escudería de la temporada seleccionada. */}
        <section
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
                ? "lg:grid-cols-[minmax(0,1fr)_minmax(300px,42%)]"
                : "lg:grid-cols-1"
            }`}
          >
            <div className="relative flex min-w-0 flex-col justify-center gap-5 p-6 sm:p-8 lg:p-10">
              <p className="m-0 flex items-center gap-2 font-nav text-sm font-bold uppercase tracking-[.22em] text-white/90">
                <UserRound className="h-4 w-4" aria-hidden="true" />
                Perfil de piloto
              </p>

              <div>
                <h1 className="m-0 max-w-3xl font-racing text-3xl font-extrabold uppercase italic leading-tight tracking-tight text-white sm:text-5xl lg:text-[clamp(2.3rem,4vw,4.4rem)]">
                  {nombre}
                </h1>
                {dorsal && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-1 font-racing text-sm font-extrabold text-white backdrop-blur-sm">
                    #{dorsal}
                    <span className="font-nav font-semibold text-white/75">
                      Dorsal
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 font-nav text-base font-semibold text-white/95">
                <span className="inline-flex items-center gap-2">
                  <Globe2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {piloto.nationality}
                </span>
                {idEquipo ? (
                  <Link
                    to={`/escuderias/${idEquipo}?temporada=${temporada}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-black/25 px-3 py-1.5 text-white no-underline transition-colors hover:bg-black/40"
                  >
                    <Flag className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {escuderias}
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

              <div className="mt-1 inline-flex w-fit items-center gap-2 rounded-lg border border-white/20 bg-black/25 px-4 py-2.5 font-nav text-base font-bold text-white backdrop-blur-sm">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Temporada {temporada}
              </div>
            </div>

            {mostrarRetrato && (
              <RetratoPiloto
                key={`${id}-${temporada}`}
                idPiloto={id}
                nombre={nombre}
                temporada={temporada}
              />
            )}
          </div>
        </section>

        {/* Estadísticas: mantenemos los datos existentes. */}
        <section
          aria-label="Estadísticas del piloto"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {estadisticas.map(({ titulo, valor, Icono }) => (
            <article
              key={titulo}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300 dark:border-white/10 dark:bg-[#20212b] dark:shadow-md dark:hover:border-white/20"
            >
              <div className="mb-4 flex items-center gap-2 font-nav text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                <Icono
                  className="h-5 w-5 shrink-0 text-[#e10600]"
                  aria-hidden="true"
                />
                {titulo}
              </div>
              <strong className="block font-racing text-3xl font-extrabold tracking-tight text-[#15151d] sm:text-4xl dark:text-white">
                {valor}
              </strong>
            </article>
          ))}
        </section>

        {/* Resultados de la temporada: conserva exactamente la estructura anterior. */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-white/10 dark:bg-[#20212b] dark:shadow-lg">
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

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#15151d]">
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
                {carreras.map((carrera) => {
                  const resultado = carrera.Results?.[0];
                  return (
                    <tr
                      key={carrera.round}
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
                    </tr>
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
