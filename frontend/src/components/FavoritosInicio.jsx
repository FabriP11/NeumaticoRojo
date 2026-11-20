import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  Flag,
  LoaderCircle,
  Pencil,
  Star,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { obtenerColorEscuderia } from "../utils/coloresF1";
import FondoTarjetaInicio from "./FondoTarjetaInicio";

const TEMPORADA = "2026";

// Nombres de las fotografías dentro de public/images/inicio/favoritos/.
// Los identificadores provienen de MySQL/Jolpica, no del nombre mostrado.
const FOTOS_PILOTOS = {
  norris: "lando_norris",
  piastri: "oscar_piastri",
  russell: "george_russell",
  antonelli: "kimi_antonelli",
  leclerc: "charles_leclerc",
  hamilton: "lewis_hamilton",
  verstappen: "max_verstappen",
  hadjar: "isack_hadjar",
  lawson: "liam_lawson",
  lindblad: "arvid_lindblad",
  sainz: "carlos_sainz",
  albon: "alexander_albon",
  alonso: "fernando_alonso",
  stroll: "lance_stroll",
  gasly: "pierre_gasly",
  colapinto: "franco_colapinto",
  ocon: "esteban_ocon",
  bearman: "oliver_bearman",
  hulkenberg: "nico_hulkenberg",
  bortoleto: "gabriel_bortoleto",
  perez: "sergio_perez",
  bottas: "valtteri_bottas",
};

const FOTOS_ESCUDERIAS = {
  mclaren: "mclaren",
  mercedes: "mercedes",
  ferrari: "ferrari",
  red_bull: "red_bull",
  red_bull_racing: "red_bull",
  rb: "racing_bulls",
  racing_bulls: "racing_bulls",
  williams: "williams",
  aston_martin: "aston_martin",
  alpine: "alpine",
  haas: "haas",
  sauber: "audi",
  audi: "audi",
  cadillac: "cadillac",
};

function nombreArchivo(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function fondoPiloto(piloto) {
  if (!piloto?.id) return null;
  const archivo = FOTOS_PILOTOS[piloto.id] || nombreArchivo(piloto.nombre);
  return `/images/inicio/favoritos/pilotos/${archivo}.png`;
}

function fondoEscuderia(escuderia) {
  if (!escuderia?.id) return null;
  const archivo =
    FOTOS_ESCUDERIAS[escuderia.id] || nombreArchivo(escuderia.nombre);
  return `/images/inicio/favoritos/escuderias/${archivo}.jfif`;
}

function FavoritosInicio() {
  const { usuario, comprobandoSesion } = useAuth();
  const reducirMovimiento = useReducedMotion();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Obtener los favoritos y sus estadísticas desde MySQL.
  useEffect(() => {
    if (!usuario) {
      setDatos(null);
      setCargando(false);
      setError("");
      return;
    }

    const controller = new AbortController();

    async function obtenerFavoritos() {
      setCargando(true);
      setError("");
      setDatos(null);

      try {
        const respuesta = await fetch(
          `/api/resumen-favoritos?temporada=${TEMPORADA}`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );

        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar tus favoritos");
        }

        const resultado = await respuesta.json();

        if (!controller.signal.aborted) {
          setDatos(resultado);
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

    obtenerFavoritos();

    return () => controller.abort();
  }, [usuario?.id_usuario]);

  // No mostrar favoritos si no hay sesión iniciada.
  if (comprobandoSesion || !usuario) {
    return null;
  }

  const piloto = datos?.piloto;
  const escuderia = datos?.escuderia;

  const colorPiloto = obtenerColorEscuderia(piloto?.id_escuderia);
  const colorEscuderia = obtenerColorEscuderia(escuderia?.id);

  function mostrarEstadistica(valor) {
    return valor ?? "—";
  }

  const claseTarjeta =
    "group relative isolate flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/20 border-t-4 bg-[#171923] p-4 text-white shadow-[0_12px_30px_rgba(0,0,0,0.20)] sm:p-5";

  const claseEtiqueta =
    "inline-flex flex-wrap items-center gap-2 font-nav text-xs font-bold uppercase tracking-[0.12em] text-white/85";

  const claseEstadisticas =
    "mt-5 grid grid-cols-3 gap-2 border-t border-white/20 pt-4";

  const claseEstadistica =
    "min-w-0 rounded-lg border border-white/10 bg-black/35 px-2 py-3 backdrop-blur-[3px]";

  const claseTituloEstadistica =
    "block font-nav text-[10px] font-bold uppercase tracking-wide text-white/70";

  const claseValorEstadistica =
    "mt-1 block break-words font-racing text-xl font-bold tabular-nums text-white sm:text-2xl";

  const claseEnlace =
    "group mt-auto inline-flex w-fit items-center gap-2 pt-5 font-nav text-sm font-bold text-[#ff8b86] no-underline transition-colors hover:text-white";

  return (
    <section className="@container w-full min-w-0">
      {/* ENCABEZADO */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 font-nav text-xs font-bold uppercase tracking-[0.2em] text-[#e10600]">
            TU FÓRMULA 1
          </p>

          <h2 className="flex items-center gap-2 font-racing text-2xl font-extrabold text-[#15151d] dark:text-white">
            <Star
              className="h-6 w-6 shrink-0 text-[#e10600]"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            Mis favoritos
          </h2>

          <p className="mt-2 font-nav text-sm text-slate-600 dark:text-[#adb3c0]">
            Seguimiento personalizado · Temporada {TEMPORADA}
          </p>
        </div>

        <Link
          to="/mi-perfil"
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 font-nav text-sm font-bold text-[#d10c16] no-underline transition-colors hover:bg-red-50 dark:border-[#623036] dark:text-[#ff6969] dark:hover:bg-[#302028]"
        >
          <Pencil
            className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
            aria-hidden="true"
          />
          Editar favoritos
          <ArrowRight
            className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </Link>
      </div>

      {/* CARGA Y ERROR */}
      {cargando && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 font-nav text-sm text-slate-600 dark:border-[#373944] dark:bg-[#1c1e27] dark:text-[#b8bdc9]"
        >
          <LoaderCircle
            className="h-5 w-5 shrink-0 animate-spin text-[#e10600]"
            aria-hidden="true"
          />
          Cargando tus favoritos...
        </p>
      )}

      {!cargando && error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-5 font-nav text-sm text-red-700 dark:border-[#693039] dark:bg-[#351c22] dark:text-[#ff9999]"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* TARJETAS */}
      {!cargando && !error && datos && (
        <div className="grid grid-cols-1 gap-4 @min-[550px]:grid-cols-2">
          {/* PILOTO FAVORITO */}
          <motion.article
            initial={reducirMovimiento ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            whileHover={reducirMovimiento ? undefined : { y: -3 }}
            transition={{
              duration: reducirMovimiento ? 0 : 0.42,
              ease: "easeOut",
            }}
            className={claseTarjeta}
            style={{ borderTopColor: colorPiloto }}
          >
            <FondoTarjetaInicio src={fondoPiloto(piloto)} />
            <div className="relative z-10 flex h-full flex-col">
              <span className={claseEtiqueta}>
                <UserRound
                  className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                  aria-hidden="true"
                />
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorPiloto }}
                  aria-hidden="true"
                />
                PILOTO FAVORITO
              </span>

              <h3 className="mt-5 flex min-h-12 flex-wrap items-center gap-3 font-racing text-lg font-bold leading-tight text-white">
                {piloto ? (
                  <>
                    {piloto.numero != null && (
                      <span
                        className="inline-flex shrink-0 items-center justify-center rounded-lg border bg-[#161820] px-2.5 py-1.5 font-racing text-base font-extrabold"
                        style={{ color: colorPiloto, borderColor: colorPiloto }}
                      >
                        #{piloto.numero}
                      </span>
                    )}
                    <span className="min-w-0 break-words">{piloto.nombre}</span>
                  </>
                ) : (
                  "Todavía no elegiste un piloto"
                )}
              </h3>

              {piloto ? (
                <>
                  <div className={claseEstadisticas}>
                    <div className={claseEstadistica}>
                      <span className={claseTituloEstadistica}>POSICIÓN</span>
                      <strong className={claseValorEstadistica}>
                        {mostrarEstadistica(piloto.posicion)}
                      </strong>
                    </div>
                    <div className={claseEstadistica}>
                      <span className={claseTituloEstadistica}>PUNTOS</span>
                      <strong className={claseValorEstadistica}>
                        {mostrarEstadistica(piloto.puntos)}
                      </strong>
                    </div>
                    <div className={claseEstadistica}>
                      <span className={claseTituloEstadistica}>VICTORIAS</span>
                      <strong className={claseValorEstadistica}>
                        {mostrarEstadistica(piloto.victorias)}
                      </strong>
                    </div>
                  </div>

                  {piloto.posicion == null && (
                    <p className="mt-3 font-nav text-xs text-white/70">
                      Sin clasificación disponible en {TEMPORADA}.
                    </p>
                  )}

                  <Link
                    to={`/pilotos/${piloto.id}?temporada=${TEMPORADA}`}
                    className={claseEnlace}
                  >
                    Ver perfil del piloto
                    <ArrowRight
                      className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden="true"
                    />
                  </Link>
                </>
              ) : (
                <Link to="/mi-perfil" className={claseEnlace}>
                  Elegir mi piloto favorito
                  <ArrowRight
                    className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                    aria-hidden="true"
                  />
                </Link>
              )}
            </div>
          </motion.article>

          {/* ESCUDERÍA FAVORITA */}
          <motion.article
            initial={reducirMovimiento ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            whileHover={reducirMovimiento ? undefined : { y: -3 }}
            transition={{
              duration: reducirMovimiento ? 0 : 0.42,
              ease: "easeOut",
            }}
            className={claseTarjeta}
            style={{ borderTopColor: colorEscuderia }}
          >
            <FondoTarjetaInicio src={fondoEscuderia(escuderia)} />
            <div className="relative z-10 flex h-full flex-col">
              <span className={claseEtiqueta}>
                <Flag
                  className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                  aria-hidden="true"
                />
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorEscuderia }}
                  aria-hidden="true"
                />
                ESCUDERÍA FAVORITA
              </span>

              <h3 className="mt-5 flex min-h-12 items-center font-racing text-lg font-bold leading-tight text-white">
                {escuderia
                  ? escuderia.nombre
                  : "Todavía no elegiste una escudería"}
              </h3>

              {escuderia ? (
                <>
                  <div className={claseEstadisticas}>
                    <div className={claseEstadistica}>
                      <span className={claseTituloEstadistica}>POSICIÓN</span>
                      <strong className={claseValorEstadistica}>
                        {mostrarEstadistica(escuderia.posicion)}
                      </strong>
                    </div>
                    <div className={claseEstadistica}>
                      <span className={claseTituloEstadistica}>PUNTOS</span>
                      <strong className={claseValorEstadistica}>
                        {mostrarEstadistica(escuderia.puntos)}
                      </strong>
                    </div>
                    <div className={claseEstadistica}>
                      <span className={claseTituloEstadistica}>VICTORIAS</span>
                      <strong className={claseValorEstadistica}>
                        {mostrarEstadistica(escuderia.victorias)}
                      </strong>
                    </div>
                  </div>

                  {escuderia.posicion == null && (
                    <p className="mt-3 font-nav text-xs text-white/70">
                      Sin clasificación disponible en {TEMPORADA}.
                    </p>
                  )}

                  <Link
                    to={`/escuderias/${escuderia.id}?temporada=${TEMPORADA}`}
                    className={claseEnlace}
                  >
                    Ver perfil de escudería
                    <ArrowRight
                      className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden="true"
                    />
                  </Link>
                </>
              ) : (
                <Link to="/mi-perfil" className={claseEnlace}>
                  Elegir mi escudería favorita
                  <ArrowRight
                    className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                    aria-hidden="true"
                  />
                </Link>
              )}
            </div>
          </motion.article>
        </div>
      )}
    </section>
  );
}

export default FavoritosInicio;
