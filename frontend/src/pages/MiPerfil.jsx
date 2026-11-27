import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router";
import FotoPiloto, { obtenerArchivoPiloto } from "../components/FotoPiloto";
import FondoTarjetaInicio from "../components/FondoTarjetaInicio";
import { obtenerColorEscuderia } from "../utils/coloresF1";
import { fondoPiloto, fondoEscuderia } from "../utils/fondosFavoritos";
import {
  AlertCircle,
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  BellRing,
  Send,
  RefreshCw,
  Flag,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Save,
  Star,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchConSesion } from "../utils/fetchConSesion";

const TARJETA =
  "rounded-2xl border border-slate-200 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.09)] dark:border-white/10 dark:bg-[#1b1c25] dark:shadow-[0_14px_35px_rgba(0,0,0,0.18)]";
const SELECT =
  "w-full appearance-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 pr-11 text-base sm:text-sm text-[#15151d] outline-none transition-colors focus:border-[#e10600] focus:ring-2 focus:ring-[#e10600]/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-[#111219] dark:text-white";

function MiPerfil() {
  const { usuario, comprobandoSesion, iniciarSesion } = useAuth();

  const [pilotos, setPilotos] = useState([]);
  const [escuderias, setEscuderias] = useState([]);
  const [pilotoSeleccionado, setPilotoSeleccionado] = useState("");
  const [escuderiaSeleccionada, setEscuderiaSeleccionada] = useState("");
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorGuardado, setErrorGuardado] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardandoAvatar, setGuardandoAvatar] = useState(false);
  const [errorAvatar, setErrorAvatar] = useState("");
  const [mensajeAvatar, setMensajeAvatar] = useState("");
  const [avatarSeleccionado, setAvatarSeleccionado] = useState("");

  // Canal de Telegram: configuración independiente de las sesiones de Race Week.
  const [canales, setCanales] = useState(null);
  const [eleccionCanales, setEleccionCanales] = useState({ correo: true, telegram: false });
  const [cargandoCanales, setCargandoCanales] = useState(true);
  const [guardandoCanales, setGuardandoCanales] = useState(false);
  const [enlaceTelegram, setEnlaceTelegram] = useState("");
  const [gestionandoTelegram, setGestionandoTelegram] = useState(false);
  const [probandoTelegram, setProbandoTelegram] = useState(false);
  const [errorTelegram, setErrorTelegram] = useState("");

  async function actualizarCanales() {
    const respuesta = await fetchConSesion("/api/notificaciones/canales", {
      credentials: "include",
      cache: "no-store",
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudieron cargar los canales");
    setCanales(datos);
    setEleccionCanales({ correo: Boolean(datos.correo), telegram: Boolean(datos.telegram) });
    if (datos.vinculado) setEnlaceTelegram("");
    return datos;
  }

  useEffect(() => {
    if (!usuario) return;
    let vigente = true;
    async function comprobar() {
      try {
        await actualizarCanales();
      } catch (error) {
        if (vigente) setErrorTelegram(error.message);
      } finally {
        if (vigente) setCargandoCanales(false);
      }
    }
    void comprobar();
    // Al volver de Telegram, comprobar si el usuario pulsó Iniciar.
    function alVolver() {
      if (document.visibilityState === "visible") void comprobar();
    }
    window.addEventListener("focus", alVolver);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vigente = false;
      window.removeEventListener("focus", alVolver);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [usuario?.id_usuario]);

  async function crearEnlaceTelegram() {
    setGestionandoTelegram(true);
    setErrorTelegram("");
    try {
      const respuesta = await fetchConSesion("/api/notificaciones/telegram/enlace", {
        method: "POST",
        credentials: "include",
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudo crear el enlace");
      setEnlaceTelegram(datos.url);
      toast.success("Enlace preparado. Abrí Telegram y pulsá Iniciar.");
    } catch (error) {
      setErrorTelegram(error.message);
      toast.error(error.message);
    } finally {
      setGestionandoTelegram(false);
    }
  }

  async function guardarCanalesTelegram() {
    setGuardandoCanales(true);
    setErrorTelegram("");
    try {
      const respuesta = await fetchConSesion("/api/notificaciones/canales", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eleccionCanales),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudieron guardar los canales");
      await actualizarCanales();
      toast.success("Canales de notificación guardados");
    } catch (error) {
      setErrorTelegram(error.message);
      toast.error(error.message);
    } finally {
      setGuardandoCanales(false);
    }
  }

  async function probarMensajeTelegram() {
    setProbandoTelegram(true);
    setErrorTelegram("");
    try {
      const respuesta = await fetchConSesion("/api/notificaciones/telegram/prueba", {
        method: "POST",
        credentials: "include",
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudo enviar la prueba");
      toast.success("Mensaje de prueba enviado a Telegram");
    } catch (error) {
      setErrorTelegram(error.message);
      toast.error(error.message);
    } finally {
      setProbandoTelegram(false);
    }
  }

  async function quitarVinculacionTelegram() {
    if (!window.confirm("¿Querés desvincular Telegram de tu cuenta?")) return;
    setGestionandoTelegram(true);
    setErrorTelegram("");
    try {
      const respuesta = await fetchConSesion("/api/notificaciones/telegram", {
        method: "DELETE",
        credentials: "include",
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudo desvincular Telegram");
      setEnlaceTelegram("");
      await actualizarCanales();
      toast.success("Telegram desvinculado correctamente");
    } catch (error) {
      setErrorTelegram(error.message);
      toast.error(error.message);
    } finally {
      setGestionandoTelegram(false);
    }
  }

  const pilotoAvatar = pilotos.find(
    (piloto) => String(piloto.id_piloto) === String(usuario?.id_piloto_avatar),
  );

  const nombreAvatar = pilotoAvatar
    ? `${pilotoAvatar.nombre} ${pilotoAvatar.apellido}`
    : usuario?.nombre_avatar || "";

  // Cargar opciones y favoritos guardados en MySQL.
  useEffect(() => {
    if (!usuario) return;

    const controller = new AbortController();

    async function cargarDatos() {
      setCargandoDatos(true);
      setErrorCarga("");

      try {
        const [respuestaOpciones, respuestaCuenta] = await Promise.all([
          fetch("/api/opciones-favoritos", {
            signal: controller.signal,
          }),
          fetchConSesion("/api/usuario-actual", {
            credentials: "include",
            signal: controller.signal,
          }),
        ]);

        if (!respuestaOpciones.ok || !respuestaCuenta.ok) {
          throw new Error("No se pudieron cargar los datos del perfil");
        }

        const [opciones, cuenta] = await Promise.all([
          respuestaOpciones.json(),
          respuestaCuenta.json(),
        ]);

        if (
          !Array.isArray(opciones.pilotos) ||
          !Array.isArray(opciones.escuderias) ||
          !cuenta.usuario
        ) {
          throw new Error("Los datos recibidos no son válidos");
        }

        if (controller.signal.aborted) return;

        setPilotos(opciones.pilotos);
        setEscuderias(opciones.escuderias);
        setAvatarSeleccionado(cuenta.usuario.id_piloto_avatar || "");

        setPilotoSeleccionado(
          opciones.pilotos.some(
            (piloto) => piloto.id_piloto === cuenta.usuario.id_piloto_favorito,
          )
            ? cuenta.usuario.id_piloto_favorito
            : "",
        );

        setEscuderiaSeleccionada(
          opciones.escuderias.some(
            (equipo) =>
              equipo.id_escuderia === cuenta.usuario.id_escuderia_favorita,
          )
            ? cuenta.usuario.id_escuderia_favorita
            : "",
        );

        iniciarSesion(cuenta.usuario);
      } catch (error) {
        if (error.name !== "AbortError" && !controller.signal.aborted) {
          setErrorCarga(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoDatos(false);
        }
      }
    }

    cargarDatos();
    return () => controller.abort();
  }, [usuario?.id_usuario]);

  // Guardar favoritos sin modificar la lógica de la API.
  async function guardarFavoritos(evento) {
    evento.preventDefault();
    setErrorGuardado("");
    setMensaje("");
    setGuardando(true);

    try {
      const respuesta = await fetchConSesion("/api/mis-favoritos", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_piloto_favorito: pilotoSeleccionado || null,
          id_escuderia_favorita: escuderiaSeleccionada || null,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No se pudieron guardar los favoritos",
        );
      }

      if (
        !datos.usuario ||
        !Object.prototype.hasOwnProperty.call(datos.usuario, "id_piloto_avatar")
      ) {
        throw new Error("El servidor no devolvió el perfil actualizado");
      }

      iniciarSesion(datos.usuario);
      setMensaje("¡Favoritos guardados correctamente!");
      toast.success("Favoritos guardados correctamente");
    } catch (error) {
      setErrorGuardado(error.message);
      toast.error(error.message);
    } finally {
      setGuardando(false);
    }
  }

  async function guardarAvatar() {
    if (guardandoAvatar) return;

    setGuardandoAvatar(true);
    setErrorAvatar("");
    setMensajeAvatar("");

    try {
      const respuesta = await fetchConSesion("/api/mi-avatar", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_piloto_avatar: avatarSeleccionado || null,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok || !datos.usuario) {
        throw new Error(datos.mensaje || "No se pudo guardar la foto");
      }

      if (
        !Object.prototype.hasOwnProperty.call(datos.usuario, "id_piloto_avatar")
      ) {
        throw new Error("El servidor no devolvió el avatar actualizado");
      }

      iniciarSesion(datos.usuario);
      setAvatarSeleccionado(datos.usuario.id_piloto_avatar || "");
      setMensajeAvatar("¡Foto de perfil actualizada!");
      toast.success("Foto de perfil actualizada");
    } catch (error) {
      setErrorAvatar(error.message);
      toast.error(error.message);
    } finally {
      setGuardandoAvatar(false);
    }
  }

  const pilotoFavorito = pilotos.find(
    (piloto) => piloto.id_piloto === usuario?.id_piloto_favorito,
  );
  const escuderiaFavorita = escuderias.find(
    (equipo) => equipo.id_escuderia === usuario?.id_escuderia_favorita,
  );

  if (comprobandoSesion) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#f3f4f7] px-4 text-[#15151d] dark:bg-[#111218] dark:text-white">
        <p
          className="flex items-center gap-3 text-sm text-slate-600 dark:text-gray-300"
          role="status"
        >
          <LoaderCircle
            className="h-5 w-5 animate-spin text-[#e10600]"
            aria-hidden="true"
          />
          Comprobando sesión...
        </p>
      </main>
    );
  }

  if (!usuario) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#f3f4f7] px-4 py-12 text-[#15151d] dark:bg-[#111218] dark:text-white">
        <div className={`${TARJETA} w-full max-w-md p-7 text-center sm:p-9`}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e10600]/15 text-[#e10600]">
            <LockKeyhole className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tight">
            Iniciá sesión para ver tu perfil
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-gray-400">
            Necesitás una cuenta para acceder a tus datos y favoritos.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[#e10600] px-6 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-[#b90500]"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f4f7] px-4 py-5 text-[#15151d] dark:bg-[#111218] dark:text-white sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* ENCABEZADO COMPACTO */}
        <header className="flex flex-col gap-2 border-l-4 border-[#e10600] pl-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#e10600]">
              MI CUENTA · NEUMATICOROJO
            </p>
            <h1 className="m-0 font-racing text-2xl font-black uppercase italic tracking-tight sm:text-3xl">
              Mi perfil
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400 sm:text-sm">
              Administrá tu cuenta y tus favoritos.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-gray-300 no-underline transition-colors hover:text-[#c5221d] dark:hover:text-white sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </header>

        {/* INFORMACIÓN DE LA CUENTA - RESUMEN COMPACTO */}
        <section
          className={`${TARJETA} overflow-hidden`}
          aria-labelledby="perfil-cuenta"
        >
          <div className="h-1 bg-[#e10600]" />
          <div className="flex items-center gap-3 p-4 sm:gap-4 sm:px-5 sm:py-4">
            {usuario.id_piloto_avatar ? (
              <FotoPiloto
                idPiloto={usuario.id_piloto_avatar}
                nombre={nombreAvatar}
                colorEquipo={obtenerColorEscuderia(
                  pilotoAvatar?.id_escuderia || usuario.id_escuderia_avatar,
                )}
                temporada="2026"
                tamano="lg"
                className="!h-14 !w-14"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#e10600] text-xl font-black text-white">
                {usuario.nombre_usuario?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#c92420] dark:text-[#ff6862]">
                Cuenta personal
              </p>
              <h2
                id="perfil-cuenta"
                className="mt-0.5 break-words text-xl font-extrabold sm:text-2xl"
              >
                {usuario.nombre_usuario}
              </h2>
              <p className="mt-0.5 break-all text-xs text-slate-500 dark:text-gray-400 sm:text-sm">
                {usuario.correo}
              </p>
            </div>
          </div>
          <div className="grid gap-px border-t border-slate-200 bg-slate-200/70 dark:border-white/10 dark:bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 bg-white px-4 py-3 dark:bg-[#1b1c25] sm:px-5">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                <UserRound
                  className="h-4 w-4 shrink-0 text-[#e10600]"
                  aria-hidden="true"
                />
                Nombre de usuario
              </p>
              <strong className="mt-1 block break-words text-sm font-bold text-[#15151d] dark:text-white">
                {usuario.nombre_usuario}
              </strong>
            </div>
            <div className="min-w-0 bg-white px-4 py-3 dark:bg-[#1b1c25] sm:px-5">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                <Mail
                  className="h-4 w-4 shrink-0 text-[#e10600]"
                  aria-hidden="true"
                />
                Correo electrónico
              </p>
              <strong className="mt-1 block break-all text-sm font-bold text-[#15151d] dark:text-white">
                {usuario.correo}
              </strong>
            </div>
            <div className="min-w-0 bg-white px-4 py-3 dark:bg-[#1b1c25] sm:px-5">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                <UsersRound
                  className="h-4 w-4 shrink-0 text-[#e10600]"
                  aria-hidden="true"
                />
                Tipo de cuenta
              </p>
              <strong className="mt-1 block text-sm font-bold text-[#15151d] dark:text-white">
                {usuario.rol === "admin" ? "Administrador" : "Usuario"}
              </strong>
            </div>
            <a
              href="#personalizar-favoritos"
              className="group block min-w-0 bg-white px-4 py-3 text-[#15151d] no-underline transition-colors hover:bg-slate-50 dark:bg-[#1b1c25] dark:text-white dark:hover:bg-[#252632] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#e10600] sm:px-5"
              aria-label="Ir a cambiar mi piloto favorito"
              title="Ir a cambiar mi piloto favorito"
            >
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 group-hover:text-slate-700 dark:text-gray-400 dark:group-hover:text-gray-200">
                <UserRound
                  className="h-4 w-4 shrink-0 text-[#e10600]"
                  aria-hidden="true"
                />
                Piloto favorito
              </span>
              <span className="mt-1 flex items-center gap-2 text-sm font-bold text-[#15151d] group-hover:text-[#b91c1c] dark:text-white dark:group-hover:text-[#ff7772]">
                <span className="min-w-0 truncate">
                  {pilotoFavorito
                    ? `${pilotoFavorito.nombre} ${pilotoFavorito.apellido}`
                    : usuario.id_piloto_favorito || "Elegir piloto"}
                </span>
                <ArrowDownRight
                  className="h-4 w-4 shrink-0 text-[#c92420] dark:text-[#ff7772]"
                  aria-hidden="true"
                />
              </span>
            </a>
          </div>
        </section>

        {/* FOTO DE PERFIL */}
        <section className={`${TARJETA} p-5 sm:p-7`}>
          <h2 className="text-xl font-black uppercase italic sm:text-2xl">
            Elegir foto de perfil
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
            Seleccioná un piloto de 2026 y guardá los cambios.
          </p>

          {!cargandoDatos && !errorCarga && (
            <>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {pilotos
                  .filter(
                    (piloto) =>
                      piloto.apellido?.trim().toLowerCase() !== "ocon" &&
                      obtenerArchivoPiloto(
                        piloto.id_piloto,
                        `${piloto.nombre} ${piloto.apellido}`,
                      ),
                  )
                  .map((piloto) => {
                    const seleccionado =
                      String(avatarSeleccionado) === String(piloto.id_piloto);

                    const color = obtenerColorEscuderia(piloto.id_escuderia);

                    return (
                      <button
                        key={piloto.id_piloto}
                        type="button"
                        disabled={guardandoAvatar}
                        onClick={() => {
                          setAvatarSeleccionado(piloto.id_piloto);
                          setMensajeAvatar("");
                          setErrorAvatar("");
                        }}
                        aria-pressed={seleccionado}
                        className={`flex w-[calc(50%-0.375rem)] flex-col items-center gap-3 rounded-xl border p-3 transition-all hover:brightness-105 dark:hover:brightness-125 disabled:opacity-60 [--avatar-fondo:#f8fafc] dark:[--avatar-fondo:#1b1c25] sm:w-[calc(33.333%-0.5rem)] lg:w-[calc(16.666%-0.625rem)] ${
                          seleccionado ? "ring-2 ring-[#e10600]" : ""
                        }`}
                        style={{
                          backgroundImage: `linear-gradient(145deg, ${color}55, var(--avatar-fondo, #1b1c25) 85%)`,
                          borderColor: seleccionado ? "#e10600" : `${color}88`,
                        }}
                      >
                        <FotoPiloto
                          idPiloto={piloto.id_piloto}
                          nombre={`${piloto.nombre} ${piloto.apellido}`}
                          colorEquipo={color}
                          temporada="2026"
                          tamano="lg"
                          className="!h-20 !w-20"
                        />

                        <span className="text-center text-xs font-semibold text-[#15151d] dark:text-white">
                          {piloto.nombre} {piloto.apellido}
                        </span>
                      </button>
                    );
                  })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setAvatarSeleccionado("");
                    setMensajeAvatar("");
                    setErrorAvatar("");
                  }}
                  disabled={guardandoAvatar}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-[#15151d] hover:bg-slate-100 dark:border-white/20 dark:text-white dark:hover:bg-white/10 disabled:opacity-60"
                >
                  Quitar foto de perfil
                </button>

                <button
                  type="button"
                  onClick={guardarAvatar}
                  disabled={
                    guardandoAvatar ||
                    (avatarSeleccionado || null) ===
                      (usuario.id_piloto_avatar || null)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#e10600] px-6 py-3 text-sm font-bold text-white hover:bg-[#b90500] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardandoAvatar ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {guardandoAvatar ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </>
          )}

          {cargandoDatos && (
            <p className="mt-4 text-sm text-slate-500 dark:text-gray-400">Cargando pilotos...</p>
          )}

          {errorCarga && (
            <p className="mt-4 text-sm text-red-700 dark:text-red-400" role="alert">
              {errorCarga}
            </p>
          )}

          {mensajeAvatar && (
            <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400" role="status">
              {mensajeAvatar}
            </p>
          )}

          {errorAvatar && (
            <p className="mt-4 text-sm text-red-700 dark:text-red-400" role="alert">
              {errorAvatar}
            </p>
          )}
        </section>

        {/* FAVORITOS: tres tarjetas en una misma fila en pantallas grandes */}
        <section aria-labelledby="perfil-favoritos">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e10600]/15 text-[#e10600]">
              <Star className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="perfil-favoritos"
                className="text-lg font-black uppercase italic tracking-tight sm:text-xl"
              >
                Mis favoritos
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400 sm:text-sm">
                Tu piloto y escudería favoritos.
              </p>
            </div>
          </div>

          <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
            {/* PILOTO FAVORITO: fondo idéntico al utilizado en Inicio */}
            <article
              className={`${TARJETA} group relative isolate flex h-full min-h-48 min-w-0 flex-col overflow-hidden border-t-[3px] p-4 text-white`}
              style={{
                borderTopColor: pilotoFavorito
                  ? obtenerColorEscuderia(pilotoFavorito.id_escuderia)
                  : "#e10600",
              }}
            >
              <FondoTarjetaInicio
                src={fondoPiloto(
                  pilotoFavorito
                    ? {
                        id: pilotoFavorito.id_piloto,
                        nombre: `${pilotoFavorito.nombre} ${pilotoFavorito.apellido}`,
                      }
                    : null,
                )}
              />
              <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[#101119]/80 via-[#101119]/55 to-[#101119]/30" />
              <div className="relative z-10 flex h-full flex-col">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/85">
                  <UserRound
                    className="h-4 w-4 shrink-0 text-[#ff6660]"
                    aria-hidden="true"
                  />
                  Piloto favorito
                </p>
                <h3 className="mt-3 break-words font-racing text-lg font-extrabold text-white drop-shadow-md">
                  {pilotoFavorito
                    ? `${pilotoFavorito.nombre} ${pilotoFavorito.apellido}`
                    : usuario.id_piloto_favorito || "Sin seleccionar"}
                </h3>
                {pilotoFavorito ? (
                  <Link
                    to={`/pilotos/${pilotoFavorito.id_piloto}?temporada=2026`}
                    className="mt-auto inline-flex w-fit items-center gap-1.5 pt-4 text-xs font-bold text-[#ff9893] no-underline transition-colors hover:text-white"
                  >
                    Ver perfil del piloto
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <a
                    href="#personalizar-favoritos"
                    className="mt-auto inline-flex w-fit items-center gap-1.5 pt-4 text-xs font-bold text-[#ff9893] no-underline hover:text-white"
                  >
                    Elegir piloto
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
              </div>
            </article>

            {/* ESCUDERÍA FAVORITA: fondo idéntico al utilizado en Inicio */}
            <article
              className={`${TARJETA} group relative isolate flex h-full min-h-48 min-w-0 flex-col overflow-hidden border-t-[3px] p-4 text-white`}
              style={{
                borderTopColor: escuderiaFavorita
                  ? obtenerColorEscuderia(escuderiaFavorita.id_escuderia)
                  : "#e10600",
              }}
            >
              <FondoTarjetaInicio
                src={fondoEscuderia(
                  escuderiaFavorita
                    ? {
                        id: escuderiaFavorita.id_escuderia,
                        nombre: escuderiaFavorita.nombre,
                      }
                    : null,
                )}
              />
              <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[#101119]/80 via-[#101119]/55 to-[#101119]/30" />
              <div className="relative z-10 flex h-full flex-col">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/85">
                  <Flag
                    className="h-4 w-4 shrink-0 text-[#ff6660]"
                    aria-hidden="true"
                  />
                  Escudería favorita
                </p>
                <h3 className="mt-3 break-words font-racing text-lg font-extrabold text-white drop-shadow-md">
                  {escuderiaFavorita
                    ? escuderiaFavorita.nombre
                    : usuario.id_escuderia_favorita || "Sin seleccionar"}
                </h3>
                {escuderiaFavorita ? (
                  <Link
                    to={`/escuderias/${escuderiaFavorita.id_escuderia}?temporada=2026`}
                    className="mt-auto inline-flex w-fit items-center gap-1.5 pt-4 text-xs font-bold text-[#ff9893] no-underline transition-colors hover:text-white"
                  >
                    Ver perfil de escudería
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <a
                    href="#personalizar-favoritos"
                    className="mt-auto inline-flex w-fit items-center gap-1.5 pt-4 text-xs font-bold text-[#ff9893] no-underline hover:text-white"
                  >
                    Elegir escudería
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
              </div>
            </article>

            {/* PERSONALIZAR FAVORITOS: tercera tarjeta de la misma fila */}
            <section
              id="personalizar-favoritos"
              className={`${TARJETA} min-w-0 scroll-mt-28 border-t-[3px] border-t-[#e10600] p-4 md:col-span-2 xl:col-span-1`}
              aria-labelledby="personalizar-titulo"
            >
              <h3
                id="personalizar-titulo"
                className="flex items-center gap-2 text-sm font-black uppercase italic tracking-tight text-[#15151d] dark:text-white"
              >
                <Star
                  className="h-4 w-4 shrink-0 text-[#e10600]"
                  aria-hidden="true"
                />
                Personalizar mis favoritos
              </h3>
              <form onSubmit={guardarFavoritos} className="mt-3">
                {cargandoDatos && (
                  <p
                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300"
                    role="status"
                  >
                    <LoaderCircle
                      className="h-4 w-4 animate-spin text-[#e10600]"
                      aria-hidden="true"
                    />
                    Cargando opciones...
                  </p>
                )}

                {errorCarga && (
                  <p
                    className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200"
                    role="alert"
                  >
                    <AlertCircle
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    {errorCarga}
                  </p>
                )}

                {!cargandoDatos && !errorCarga && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <div className="min-w-0">
                        <label
                          htmlFor="piloto-favorito"
                          className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-gray-300"
                        >
                          <UserRound
                            className="h-3.5 w-3.5 text-[#e10600]"
                            aria-hidden="true"
                          />
                          Piloto
                        </label>
                        <div className="relative">
                          <select
                            id="piloto-favorito"
                            className={SELECT}
                            value={pilotoSeleccionado}
                            onChange={(e) => {
                              setPilotoSeleccionado(e.target.value);
                              setMensaje("");
                            }}
                            disabled={guardando}
                          >
                            <option value="">Sin seleccionar</option>
                            {pilotos.map((piloto) => (
                              <option
                                key={piloto.id_piloto}
                                value={piloto.id_piloto}
                              >
                                {piloto.nombre} {piloto.apellido}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-gray-400"
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <label
                          htmlFor="escuderia-favorita"
                          className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-gray-300"
                        >
                          <Flag
                            className="h-3.5 w-3.5 text-[#e10600]"
                            aria-hidden="true"
                          />
                          Escudería
                        </label>
                        <div className="relative">
                          <select
                            id="escuderia-favorita"
                            className={SELECT}
                            value={escuderiaSeleccionada}
                            onChange={(e) => {
                              setEscuderiaSeleccionada(e.target.value);
                              setMensaje("");
                            }}
                            disabled={guardando}
                          >
                            <option value="">Sin seleccionar</option>
                            {escuderias.map((equipo) => (
                              <option
                                key={equipo.id_escuderia}
                                value={equipo.id_escuderia}
                              >
                                {equipo.nombre}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-gray-400"
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    </div>

                    {errorGuardado && (
                      <p
                        className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700 dark:text-red-200"
                        role="alert"
                      >
                        <AlertCircle
                          className="h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        {errorGuardado}
                      </p>
                    )}

                    {mensaje && (
                      <p
                        className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300"
                        role="status"
                      >
                        <CheckCircle2
                          className="h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        {mensaje}
                      </p>
                    )}

                    <div className="mt-3 flex justify-end border-t border-slate-200 pt-3 dark:border-white/10">
                      <button
                        type="submit"
                        disabled={guardando}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-[#b90500] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto xl:w-full"
                      >
                        {guardando ? (
                          <LoaderCircle
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Save className="h-4 w-4" aria-hidden="true" />
                        )}
                        {guardando ? "Guardando..." : "Guardar favoritos"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </section>
          </div>
        </section>

        {/* TELEGRAM: canales de notificación sin almacenar datos personales. */}
        <section className={`${TARJETA} scroll-mt-28 p-5 sm:p-7`} aria-labelledby="perfil-notificaciones">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="perfil-notificaciones" className="flex items-center gap-2 font-racing text-xl font-black uppercase italic sm:text-2xl">
                <BellRing className="h-5 w-5 text-[#e10600]" aria-hidden="true" />
                Notificaciones
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">
                Elegí si querés recibir los recordatorios por correo, Telegram o ambos.
              </p>
            </div>
            {canales?.vinculado && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Telegram vinculado
              </span>
            )}
          </div>

          {cargandoCanales ? (
            <p className="mt-5 flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
              <LoaderCircle className="h-4 w-4 animate-spin text-[#e10600]" /> Consultando notificaciones...
            </p>
          ) : canales ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#111219]">
                  <input
                    type="checkbox"
                    checked={eleccionCanales.correo}
                    onChange={(e) => setEleccionCanales((anterior) => ({ ...anterior, correo: e.target.checked }))}
                    className="h-4 w-4 accent-[#e10600]"
                  />
                  <Mail className="h-5 w-5 text-[#e10600]" aria-hidden="true" />
                  <span className="text-sm font-semibold">Correo electrónico</span>
                </label>
                <label className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#111219] ${canales.vinculado ? "cursor-pointer" : "opacity-60"}`}>
                  <input
                    type="checkbox"
                    checked={eleccionCanales.telegram}
                    disabled={!canales.vinculado || !canales.bot_disponible}
                    onChange={(e) => setEleccionCanales((anterior) => ({ ...anterior, telegram: e.target.checked }))}
                    className="h-4 w-4 accent-[#e10600]"
                  />
                  <Send className="h-5 w-5 text-[#229ed9]" aria-hidden="true" />
                  <span className="text-sm font-semibold">Telegram</span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={guardarCanalesTelegram} disabled={guardandoCanales}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#e10600] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#b90500] disabled:opacity-50">
                  {guardandoCanales ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar canales
                </button>
                {!canales.vinculado && canales.bot_disponible && (
                  <button type="button" onClick={crearEnlaceTelegram} disabled={gestionandoTelegram}
                    className="rounded-xl border border-[#229ed9]/40 px-4 py-2.5 text-sm font-bold text-[#177cb3] hover:bg-[#229ed9]/10 disabled:opacity-50 dark:text-[#7ad1ff]">
                    Vincular Telegram
                  </button>
                )}
                {canales.vinculado && (
                  <button type="button" onClick={probarMensajeTelegram} disabled={probandoTelegram}
                    className="rounded-xl border border-[#229ed9]/40 px-4 py-2.5 text-sm font-bold text-[#177cb3] hover:bg-[#229ed9]/10 disabled:opacity-50 dark:text-[#7ad1ff]">
                    {probandoTelegram ? "Enviando..." : "Enviar prueba"}
                  </button>
                )}
                {canales.vinculado && (
                  <button type="button" onClick={quitarVinculacionTelegram} disabled={gestionandoTelegram}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-white/20 dark:text-gray-200 dark:hover:bg-white/10">
                    Desvincular Telegram
                  </button>
                )}
                <button type="button" onClick={() => { setErrorTelegram(""); void actualizarCanales().catch(e => setErrorTelegram(e.message)); }}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-white/10">
                  <RefreshCw className="h-4 w-4" /> Comprobar vinculación
                </button>
              </div>
              {enlaceTelegram && !canales.vinculado && (
                <div className="rounded-xl border border-[#229ed9]/25 bg-[#229ed9]/5 p-3 text-sm dark:bg-[#229ed9]/10">
                  <p className="mb-2 text-slate-700 dark:text-gray-200">
                    Abrí el bot, pulsá <strong>Iniciar</strong> y regresá a esta página. El enlace vence en 10 minutos.
                  </p>
                  <a href={enlaceTelegram} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-bold text-[#177cb3] underline dark:text-[#7ad1ff]">
                    <Send className="h-4 w-4" /> Abrir bot de Telegram
                  </a>
                </div>
              )}
              {!canales.bot_disponible && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  El bot todavía no está configurado en Railway.
                </p>
              )}
              {!canales.envio_habilitado && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  El envío automático está deshabilitado en Railway (RECORDATORIOS_HABILITADOS).
                </p>
              )}
              {!eleccionCanales.correo && !eleccionCanales.telegram && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  No seleccionaste ningún canal: no recibirás avisos.
                </p>
              )}
              <p className="text-xs text-slate-600 dark:text-gray-400">
                {canales.activo && canales.sesiones_configuradas
                  ? "Tus sesiones están configuradas. Los avisos se enviarán por los canales que guardes arriba."
                  : "Para recibir avisos, activá las sesiones y elegí 5 o 10 minutos desde la campanita de Race Week."}
              </p>
              {errorTelegram && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{errorTelegram}</p>}
            </div>
          ) : (
            <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
              {errorTelegram || "No se pudieron consultar las notificaciones"}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

export default MiPerfil;
