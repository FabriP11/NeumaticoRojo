import { useEffect, useState } from "react";
import { Link } from "react-router";
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

const TEMPORADA = "2026";

function FavoritosInicio() {
  const { usuario, comprobandoSesion } = useAuth();

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
          `http://localhost:3001/api/resumen-favoritos?temporada=${TEMPORADA}`,
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
    "flex min-w-0 flex-col rounded-xl border border-slate-200 border-t-4 bg-white p-4 shadow-sm transition-colors sm:p-5 dark:border-[#373944] dark:bg-[#1c1e27] dark:shadow-none";

  const claseEtiqueta =
    "inline-flex flex-wrap items-center gap-2 font-nav text-xs font-bold uppercase tracking-[0.12em] text-slate-600 dark:text-[#b8bdc9]";

  const claseEstadisticas =
    "mt-5 grid grid-cols-3 gap-2 border-t border-slate-200 pt-4 dark:border-white/10";

  const claseEstadistica =
    "min-w-0 rounded-lg bg-slate-100 px-2 py-3 dark:bg-[#13151d]";

  const claseTituloEstadistica =
    "block font-nav text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#a8afbc]";

  const claseValorEstadistica =
    "mt-1 block break-words font-racing text-xl font-bold tabular-nums text-[#15151d] sm:text-2xl dark:text-white";

  const claseEnlace =
    "mt-auto inline-flex w-fit items-center gap-2 pt-5 font-nav text-sm font-bold text-[#d10c16] no-underline transition-colors hover:text-[#ff3838] dark:text-[#ff5e65] dark:hover:text-[#ff898d]";

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
          <Pencil className="h-4 w-4 shrink-0" aria-hidden="true" />
          Editar favoritos
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
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
          <article
            className={claseTarjeta}
            style={{ borderTopColor: colorPiloto }}
          >
            <span className={claseEtiqueta}>
              <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colorPiloto }}
                aria-hidden="true"
              />
              PILOTO FAVORITO
            </span>

            <h3 className="mt-5 flex min-h-12 flex-wrap items-center gap-3 font-racing text-lg font-bold leading-tight text-[#15151d] dark:text-white">
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
                  <p className="mt-3 font-nav text-xs text-slate-500 dark:text-[#a8afbc]">
                    Sin clasificación disponible en {TEMPORADA}.
                  </p>
                )}

                <Link
                  to={`/pilotos/${piloto.id}?temporada=${TEMPORADA}`}
                  className={claseEnlace}
                >
                  Ver perfil del piloto
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <Link to="/mi-perfil" className={claseEnlace}>
                Elegir mi piloto favorito
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            )}
          </article>

          {/* ESCUDERÍA FAVORITA */}
          <article
            className={claseTarjeta}
            style={{ borderTopColor: colorEscuderia }}
          >
            <span className={claseEtiqueta}>
              <Flag className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colorEscuderia }}
                aria-hidden="true"
              />
              ESCUDERÍA FAVORITA
            </span>

            <h3 className="mt-5 flex min-h-12 items-center font-racing text-lg font-bold leading-tight text-[#15151d] dark:text-white">
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
                  <p className="mt-3 font-nav text-xs text-slate-500 dark:text-[#a8afbc]">
                    Sin clasificación disponible en {TEMPORADA}.
                  </p>
                )}

                <Link
                  to={`/escuderias/${escuderia.id}?temporada=${TEMPORADA}`}
                  className={claseEnlace}
                >
                  Ver perfil de escudería
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <Link to="/mi-perfil" className={claseEnlace}>
                Elegir mi escudería favorita
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            )}
          </article>
        </div>
      )}
    </section>
  );
}

export default FavoritosInicio;
