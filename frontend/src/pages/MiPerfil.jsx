import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
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

const TARJETA =
  "rounded-2xl border border-white/10 bg-[#1b1c25] shadow-[0_14px_35px_rgba(0,0,0,0.18)]";
const SELECT =
  "w-full appearance-none rounded-xl border border-white/15 bg-[#111219] px-4 py-3 pr-11 text-sm text-white outline-none transition-colors focus:border-[#e10600] focus:ring-2 focus:ring-[#e10600]/20 disabled:cursor-not-allowed disabled:opacity-60";

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

  // Cargar opciones y favoritos guardados en MySQL.
  useEffect(() => {
    if (!usuario) return;

    const controller = new AbortController();

    async function cargarDatos() {
      setCargandoDatos(true);
      setErrorCarga("");

      try {
        const [respuestaOpciones, respuestaCuenta] = await Promise.all([
          fetch("http://localhost:3001/api/opciones-favoritos", {
            signal: controller.signal,
          }),
          fetch("http://localhost:3001/api/usuario-actual", {
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
      const respuesta = await fetch("http://localhost:3001/api/mis-favoritos", {
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

      iniciarSesion(datos.usuario);
      setMensaje("¡Favoritos guardados correctamente!");
    } catch (error) {
      setErrorGuardado(error.message);
    } finally {
      setGuardando(false);
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
      <main className="flex min-h-[70vh] items-center justify-center bg-[#111218] px-4 text-white">
        <p
          className="flex items-center gap-3 text-sm text-gray-300"
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
      <main className="flex min-h-[70vh] items-center justify-center bg-[#111218] px-4 py-12 text-white">
        <div className={`${TARJETA} w-full max-w-md p-7 text-center sm:p-9`}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e10600]/15 text-[#e10600]">
            <LockKeyhole className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tight">
            Iniciá sesión para ver tu perfil
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-400">
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
    <main className="min-h-screen bg-[#111218] px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-6xl space-y-7">
        {/* ENCABEZADO */}
        <header className="flex flex-col gap-5 border-l-4 border-[#e10600] pl-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#e10600]">
              MI CUENTA · NEUMATICOROJO
            </p>
            <h1 className="m-0 text-3xl font-black uppercase italic tracking-tight sm:text-4xl">
              Mi perfil
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Administrá tus datos y favoritos de Fórmula 1.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-gray-300 no-underline transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </header>

        {/* INFORMACIÓN DE LA CUENTA */}
        <section
          className={`${TARJETA} overflow-hidden`}
          aria-labelledby="perfil-cuenta"
        >
          <div className="h-1 bg-[#e10600]" />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#e10600] text-2xl font-black text-white shadow-lg shadow-red-950/30">
              {usuario.nombre_usuario?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff6862]">
                Cuenta personal
              </p>
              <h2
                id="perfil-cuenta"
                className="mt-1 break-words text-2xl font-extrabold"
              >
                {usuario.nombre_usuario}
              </h2>
              <p className="mt-1 break-all text-sm text-gray-400">
                {usuario.correo}
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-200">
              <UserRound
                className="h-4 w-4 text-[#e10600]"
                aria-hidden="true"
              />
              {usuario.rol === "admin" ? "Administrador" : "Usuario"}
            </span>
          </div>
          <div className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-3">
            <div className="bg-[#1b1c25] px-5 py-5 sm:px-7">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <UserRound
                  className="h-4 w-4 text-[#e10600]"
                  aria-hidden="true"
                />
                Nombre de usuario
              </p>
              <strong className="mt-2 block break-words text-sm font-bold text-white">
                {usuario.nombre_usuario}
              </strong>
            </div>
            <div className="bg-[#1b1c25] px-5 py-5 sm:px-7">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <Mail className="h-4 w-4 text-[#e10600]" aria-hidden="true" />
                Correo electrónico
              </p>
              <strong className="mt-2 block break-all text-sm font-bold text-white">
                {usuario.correo}
              </strong>
            </div>
            <div className="bg-[#1b1c25] px-5 py-5 sm:px-7">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <UsersRound
                  className="h-4 w-4 text-[#e10600]"
                  aria-hidden="true"
                />
                Tipo de cuenta
              </p>
              <strong className="mt-2 block text-sm font-bold text-white">
                {usuario.rol === "admin" ? "Administrador" : "Usuario"}
              </strong>
            </div>
          </div>
        </section>

        {/* FAVORITOS ACTUALES */}
        <section aria-labelledby="perfil-favoritos">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e10600]/15 text-[#e10600]">
              <Star className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="perfil-favoritos"
                className="text-2xl font-black uppercase italic tracking-tight"
              >
                Mis favoritos
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Elegí el piloto y la escudería que querés seguir en
                NeumaticoRojo.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <article
              className={`${TARJETA} border-t-4 border-t-[#e10600] p-5 sm:p-6`}
            >
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                <UserRound
                  className="h-4 w-4 text-[#e10600]"
                  aria-hidden="true"
                />
                Piloto favorito
              </p>
              <h3 className="mt-4 min-h-12 text-xl font-extrabold text-white sm:text-2xl">
                {pilotoFavorito
                  ? `${pilotoFavorito.nombre} ${pilotoFavorito.apellido}`
                  : usuario.id_piloto_favorito || "Sin seleccionar"}
              </h3>
              {pilotoFavorito && (
                <Link
                  to={`/pilotos/${pilotoFavorito.id_piloto}?temporada=2026`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#ff6660] no-underline transition-colors hover:text-white"
                >
                  Ver perfil del piloto
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </article>

            <article
              className={`${TARJETA} border-t-4 border-t-[#e10600] p-5 sm:p-6`}
            >
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                <Flag className="h-4 w-4 text-[#e10600]" aria-hidden="true" />
                Escudería favorita
              </p>
              <h3 className="mt-4 min-h-12 text-xl font-extrabold text-white sm:text-2xl">
                {escuderiaFavorita
                  ? escuderiaFavorita.nombre
                  : usuario.id_escuderia_favorita || "Sin seleccionar"}
              </h3>
              {escuderiaFavorita && (
                <Link
                  to={`/escuderias/${escuderiaFavorita.id_escuderia}?temporada=2026`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#ff6660] no-underline transition-colors hover:text-white"
                >
                  Ver perfil de escudería
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </article>
          </div>
        </section>

        {/* FORMULARIO */}
        <section
          className={`${TARJETA} p-5 sm:p-7`}
          aria-labelledby="personalizar-titulo"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e10600]/15 text-[#e10600]">
              <Star className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="personalizar-titulo"
                className="text-xl font-black uppercase italic tracking-tight sm:text-2xl"
              >
                Personalizar mis favoritos
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Guardá tus preferencias para verlas destacadas en Inicio.
              </p>
            </div>
          </div>

          <form onSubmit={guardarFavoritos}>
            {cargandoDatos && (
              <p
                className="flex items-center gap-2 text-sm text-gray-300"
                role="status"
              >
                <LoaderCircle
                  className="h-4 w-4 animate-spin text-[#e10600]"
                  aria-hidden="true"
                />
                Cargando pilotos y escuderías...
              </p>
            )}

            {errorCarga && (
              <p
                className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
                role="alert"
              >
                <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                {errorCarga}
              </p>
            )}

            {!cargandoDatos && !errorCarga && (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="piloto-favorito"
                      className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300"
                    >
                      <UserRound
                        className="h-4 w-4 text-[#e10600]"
                        aria-hidden="true"
                      />
                      Piloto favorito
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
                        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="escuderia-favorita"
                      className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300"
                    >
                      <Flag
                        className="h-4 w-4 text-[#e10600]"
                        aria-hidden="true"
                      />
                      Escudería favorita
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
                        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>

                {errorGuardado && (
                  <p
                    className="mt-5 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
                    role="alert"
                  >
                    <AlertCircle
                      className="h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                    {errorGuardado}
                  </p>
                )}

                {mensaje && (
                  <p
                    className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
                    role="status"
                  >
                    <CheckCircle2
                      className="h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                    {mensaje}
                  </p>
                )}

                <div className="mt-6 flex justify-end border-t border-white/10 pt-6">
                  <button
                    type="submit"
                    disabled={guardando}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-all hover:bg-[#b90500] hover:shadow-lg hover:shadow-red-950/30 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {guardando ? (
                      <LoaderCircle
                        className="h-5 w-5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Save className="h-5 w-5" aria-hidden="true" />
                    )}
                    {guardando ? "Guardando..." : "Guardar favoritos"}
                  </button>
                </div>
              </>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}

export default MiPerfil;
