import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  AlertCircle,
  ArrowRight,
  CarFront,
  ChevronDown,
  ChevronUp,
  Flag,
  LoaderCircle,
  Trophy,
} from "lucide-react";
import { obtenerColorEscuderia } from "../utils/coloresF1";
import FotoPiloto from "./FotoPiloto";

const TEMPORADA = 2026;

// Formatear los puntos usando el formato de Argentina.
function formatearPuntos(puntos) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
  }).format(Number(puntos ?? 0));
}

// Tabla reutilizable para pilotos y escuderías.
function TablaClasificacion({ titulo, Icono, datos, tipo }) {
  const [expandido, setExpandido] = useState(false);
  const esPiloto = tipo === "pilotos";
  const elementosVisibles = datos.slice(0, expandido ? 10 : 5);

  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-t-4 border-slate-200 border-t-[#e10600] bg-white p-4 shadow-sm sm:p-5 dark:border-[#373944] dark:border-t-[#e10600] dark:bg-[#1c1e27] dark:shadow-none">
      {/* ENCABEZADO */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 font-racing text-lg font-bold text-[#15151d] dark:text-white">
          <Icono
            className="h-5 w-5 shrink-0 text-[#e10600]"
            strokeWidth={2.2}
            aria-hidden="true"
          />
          {titulo}
        </h3>

        <span className="rounded-md bg-slate-100 px-2 py-1 font-nav text-xs font-semibold text-slate-600 dark:bg-[#2a2c37] dark:text-[#bcc2ce]">
          Mundial {TEMPORADA}
        </span>
      </div>

      {/* CONTENIDO DE LA TABLA */}
      {datos.length === 0 ? (
        <p className="rounded-lg bg-slate-100 p-4 font-nav text-sm text-slate-600 dark:bg-[#13151d] dark:text-[#b8bdc9]">
          No hay clasificaciones disponibles.
        </p>
      ) : (
        <>
          {/* ENCABEZADO DE COLUMNAS */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 font-nav text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-white/15 dark:text-[#a8afbc]">
            <span>{esPiloto ? "PILOTO" : "ESCUDERÍA"}</span>
            <span>PTS</span>
          </div>

          {/* FILAS DE LA CLASIFICACIÓN */}
          <ol className="m-0 list-none p-0">
            {elementosVisibles.map((elemento) => {
              const id = esPiloto ? elemento.id_piloto : elemento.id_escuderia;

              const destino = esPiloto
                ? `/pilotos/${id}?temporada=${TEMPORADA}`
                : `/escuderias/${id}?temporada=${TEMPORADA}`;

              const colorEquipo = obtenerColorEscuderia(elemento.id_escuderia);

              return (
                <li
                  key={id}
                  className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-200 py-3 transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <Link
                    to={destino}
                    className="group flex min-w-0 flex-1 items-center gap-2.5 no-underline sm:gap-3"
                  >
                    {/* POSICIÓN */}
                    <span className="w-7 shrink-0 font-racing text-base font-extrabold tabular-nums text-[#e10600]">
                      {elemento.posicion}°
                    </span>

                    {/* INDICADOR DEL EQUIPO */}
                    {!esPiloto && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: colorEquipo }}
                        aria-hidden="true"
                      />
                    )}

                    {/* FOTO DEL PILOTO (SOLO TEMPORADA 2026) */}
                    {esPiloto && (
                      <FotoPiloto
                        idPiloto={elemento.id_piloto}
                        nombre={elemento.nombre}
                        colorEquipo={colorEquipo}
                        temporada={TEMPORADA}
                        tamano="sm"
                      />
                    )}

                    {/* DORSAL DEL PILOTO */}
                    {esPiloto && elemento.numero != null && (
                      <span
                        className="shrink-0 font-racing text-xs font-extrabold tabular-nums"
                        style={{ color: colorEquipo }}
                      >
                        #{elemento.numero}
                      </span>
                    )}

                    {/* NOMBRE */}
                    <span className="min-w-0 break-words font-nav text-sm font-bold leading-tight text-[#22242c] transition-colors group-hover:text-[#e10600] dark:text-[#e8e9ed] dark:group-hover:text-[#ff6464]">
                      {elemento.nombre}
                    </span>
                  </Link>

                  {/* PUNTOS */}
                  <strong className="shrink-0 font-racing text-sm font-bold tabular-nums text-[#15151d] dark:text-white">
                    {formatearPuntos(elemento.puntos)}
                  </strong>
                </li>
              );
            })}
          </ol>

          {/* EXPANDIR TOP 5 / TOP 10 */}
          {datos.length > 5 && (
            <button
              type="button"
              onClick={() => setExpandido((anterior) => !anterior)}
              aria-expanded={expandido}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 font-nav text-sm font-bold text-[#282a34] transition-colors hover:border-[#e10600] hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e10600] dark:border-[#444652] dark:bg-[#2a2c37] dark:text-white dark:hover:border-[#e10600] dark:hover:bg-[#353744]"
            >
              {expandido
                ? "Mostrar Top 5"
                : `Mostrar Top ${Math.min(datos.length, 10)}`}
              {expandido ? (
                <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
            </button>
          )}
        </>
      )}

      {/* CLASIFICACIÓN COMPLETA */}
      <Link
        to="/clasificaciones"
        className="mt-auto inline-flex w-fit items-center gap-2 pt-5 font-nav text-sm font-bold text-[#d10c16] no-underline transition-colors hover:text-[#ff3838] dark:text-[#ff5e65] dark:hover:text-[#ff898d]"
      >
        Ver clasificación completa
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </Link>
    </article>
  );
}

function TablasInicio() {
  const [datos, setDatos] = useState({
    pilotos: [],
    escuderias: [],
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Consultar las clasificaciones del Inicio desde MySQL.
  useEffect(() => {
    const controller = new AbortController();

    async function cargarClasificaciones() {
      setCargando(true);
      setError("");

      try {
        const respuesta = await fetch(
          `http://localhost:3001/api/tablas-inicio?temporada=${TEMPORADA}`,
          { signal: controller.signal },
        );

        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar las clasificaciones");
        }

        const resultado = await respuesta.json();

        if (!controller.signal.aborted) {
          setDatos({
            pilotos: resultado.pilotos || [],
            escuderias: resultado.escuderias || [],
          });
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

    cargarClasificaciones();
    return () => controller.abort();
  }, []);

  return (
    <section className="@container w-full min-w-0">
      {/* ENCABEZADO */}
      <div className="mb-5">
        <p className="mb-1 font-nav text-xs font-bold uppercase tracking-[0.2em] text-[#e10600]">
          CAMPEONATO MUNDIAL
        </p>

        <h2 className="flex items-center gap-2 font-racing text-2xl font-extrabold text-[#15151d] dark:text-white">
          <Trophy
            className="h-6 w-6 shrink-0 text-[#e10600]"
            strokeWidth={2.2}
            aria-hidden="true"
          />
          Clasificaciones
        </h2>

        <p className="mt-2 font-nav text-sm text-slate-600 dark:text-[#adb3c0]">
          Los protagonistas de la temporada {TEMPORADA}
        </p>
      </div>

      {/* CARGANDO */}
      {cargando && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 font-nav text-sm text-slate-600 dark:border-[#373944] dark:bg-[#1c1e27] dark:text-[#b8bdc9]"
        >
          <LoaderCircle
            className="h-5 w-5 shrink-0 animate-spin text-[#e10600]"
            aria-hidden="true"
          />
          Cargando clasificaciones...
        </p>
      )}

      {/* ERROR */}
      {!cargando && error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-5 font-nav text-sm text-red-700 dark:border-[#693039] dark:bg-[#351c22] dark:text-[#ff9999]"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* TABLAS DE PILOTOS Y ESCUDERÍAS */}
      {!cargando && !error && (
        <div className="grid grid-cols-1 gap-4 @min-[550px]:grid-cols-2">
          <TablaClasificacion
            titulo="Pilotos"
            Icono={CarFront}
            datos={datos.pilotos}
            tipo="pilotos"
          />
          <TablaClasificacion
            titulo="Escuderías"
            Icono={Flag}
            datos={datos.escuderias}
            tipo="escuderias"
          />
        </div>
      )}
    </section>
  );
}

export default TablasInicio;
