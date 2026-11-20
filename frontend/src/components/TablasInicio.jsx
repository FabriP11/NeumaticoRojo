import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
import FondoTarjetaInicio from "./FondoTarjetaInicio";

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
  const reducirMovimiento = useReducedMotion();
  const esPiloto = tipo === "pilotos";
  const elementosVisibles = datos.slice(0, expandido ? 10 : 5);

  return (
    <motion.article
      initial={reducirMovimiento ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      whileHover={reducirMovimiento ? undefined : { y: -2 }}
      transition={{ duration: reducirMovimiento ? 0 : 0.42, ease: "easeOut" }}
      className="group relative isolate flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/20 border-t-4 border-t-[#e10600] bg-[#171923] p-4 text-white shadow-[0_12px_30px_rgba(0,0,0,0.20)] sm:p-5"
    >
      <FondoTarjetaInicio
        src={
          esPiloto
            ? "/images/inicio/clasificaciones/pilotos.jpg"
            : "/images/inicio/clasificaciones/escuderias.jpg"
        }
        alternativas={
          esPiloto
            ? [
                "/images/inicio/clasificaciones/pilotos.png",
                "/images/inicio/clasificaciones/pilotos.jfif",
              ]
            : [
                "/images/inicio/clasificaciones/escuderias.jfif",
                "/images/inicio/clasificaciones/escuderias.png",
              ]
        }
      />
      <div className="relative z-10 flex h-full flex-col">
        {/* ENCABEZADO */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-2 font-racing text-lg font-bold text-white">
            <Icono
              className="h-5 w-5 shrink-0 text-[#e10600]"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            {titulo}
          </h3>

          <span className="rounded-md border border-white/15 bg-black/30 px-2 py-1 font-nav text-xs font-semibold text-white/85 backdrop-blur-sm">
            Mundial {TEMPORADA}
          </span>
        </div>

        {/* CONTENIDO DE LA TABLA */}
        {datos.length === 0 ? (
          <p className="rounded-lg border border-white/10 bg-black/35 p-4 font-nav text-sm text-white/80">
            No hay clasificaciones disponibles.
          </p>
        ) : (
          <>
            {/* ENCABEZADO DE COLUMNAS */}
            <div className="flex items-center justify-between gap-3 border-b border-white/20 pb-3 font-nav text-xs font-bold uppercase tracking-[0.12em] text-white/70">
              <span>{esPiloto ? "PILOTO" : "ESCUDERÍA"}</span>
              <span>PTS</span>
            </div>

            {/* FILAS DE LA CLASIFICACIÓN */}
            <ol className="m-0 list-none p-0">
              <AnimatePresence initial={false}>
                {elementosVisibles.map((elemento) => {
                  const id = esPiloto
                    ? elemento.id_piloto
                    : elemento.id_escuderia;

                  const destino = esPiloto
                    ? `/pilotos/${id}?temporada=${TEMPORADA}`
                    : `/escuderias/${id}?temporada=${TEMPORADA}`;

                  const colorEquipo = obtenerColorEscuderia(
                    elemento.id_escuderia,
                  );

                  return (
                    <motion.li
                      key={id}
                      layout={!reducirMovimiento}
                      initial={
                        reducirMovimiento ? false : { opacity: 0, height: 0 }
                      }
                      animate={{ opacity: 1, height: "auto" }}
                      exit={
                        reducirMovimiento
                          ? { opacity: 0 }
                          : { opacity: 0, height: 0 }
                      }
                      transition={{ duration: reducirMovimiento ? 0 : 0.22 }}
                      className="flex min-w-0 items-center justify-between gap-3 overflow-hidden border-b border-white/15 py-3 transition-colors hover:bg-white/10"
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
                        <span className="min-w-0 break-words font-nav text-sm font-bold leading-tight text-white transition-colors group-hover:text-[#ff8883]">
                          {elemento.nombre}
                        </span>
                      </Link>

                      {/* PUNTOS */}
                      <strong className="shrink-0 font-racing text-sm font-bold tabular-nums text-white">
                        {formatearPuntos(elemento.puntos)}
                      </strong>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>

            {/* EXPANDIR TOP 5 / TOP 10 */}
            {datos.length > 5 && (
              <button
                type="button"
                onClick={() => setExpandido((anterior) => !anterior)}
                aria-expanded={expandido}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-black/35 px-4 py-2.5 font-nav text-sm font-bold text-white backdrop-blur-sm transition-colors hover:border-[#ff6660] hover:bg-black/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e10600]"
              >
                {expandido
                  ? "Mostrar Top 5"
                  : `Mostrar Top ${Math.min(datos.length, 10)}`}
                {expandido ? (
                  <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronDown
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                )}
              </button>
            )}
          </>
        )}

        {/* CLASIFICACIÓN COMPLETA */}
        <Link
          to="/clasificaciones"
          className="group mt-auto inline-flex w-fit items-center gap-2 pt-5 font-nav text-sm font-bold text-[#ff8b86] no-underline transition-colors hover:text-white"
        >
          Ver clasificación completa
          <ArrowRight
            className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </Link>
      </div>
    </motion.article>
  );
}

function TablasInicio() {
  // Conserva la clasificación del Inicio al navegar, sin mostrar otra carga.
  const consulta = useQuery({
    queryKey: ["publico", "tablas-inicio", TEMPORADA],
    queryFn: async ({ signal }) => {
      const respuesta = await fetch(
        `/api/tablas-inicio?temporada=${TEMPORADA}`,
        { signal },
      );

      if (!respuesta.ok) {
        throw new Error("No se pudieron cargar las clasificaciones");
      }

      const resultado = await respuesta.json();
      if (
        !Array.isArray(resultado?.pilotos) ||
        !Array.isArray(resultado?.escuderias)
      ) {
        throw new Error("La respuesta de clasificaciones no es válida");
      }
      return resultado;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
  });

  const datos = consulta.data ?? { pilotos: [], escuderias: [] };
  const cargando = !consulta.data && consulta.isPending;
  // Una actualización fallida nunca oculta los últimos datos correctos.
  const error =
    !consulta.data && consulta.isError
      ? consulta.error?.message || "No se pudieron cargar las clasificaciones"
      : "";

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
