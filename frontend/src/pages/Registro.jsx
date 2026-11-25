import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  LoaderCircle,
  LockKeyhole,
  KeyRound,
  Mail,
  ShieldCheck,
  UserPlus,
  UserRound,
} from "lucide-react";

function Registro() {
  const [formulario, setFormulario] = useState({
    nombre_usuario: "",
    correo: "",
    contrasena: "",
    confirmarContrasena: "",
    codigo_invitacion: "",
  });

  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [cargando, setCargando] = useState(false);
  const [registroCreado, setRegistroCreado] = useState(false);
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();
  // En una beta privada el campo aparece por defecto, incluso si falla la consulta.
  const [requiereInvitacion, setRequiereInvitacion] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function consultarModoRegistro() {
      try {
        const respuesta = await fetch("/api/registro/configuracion", {
          signal: controller.signal,
        });
        if (!respuesta.ok) return;
        const datos = await respuesta.json();
        if (
          !controller.signal.aborted &&
          typeof datos.requiereInvitacion === "boolean"
        ) {
          setRequiereInvitacion(datos.requiereInvitacion);
        }
      } catch {
        // Conservar el campo de invitacion cuando no hay conexion.
      }
    }

    consultarModoRegistro();
    return () => controller.abort();
  }, []);

  // Actualizar los campos del formulario
  function manejarCambio(evento) {
    const { name, value } = evento.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  async function manejarRegistro(evento) {
    evento.preventDefault();

    // Evitar registros duplicados
    if (cargando || registroCreado) return;

    setError("");
    setExito("");

    if (formulario.contrasena !== formulario.confirmarContrasena) {
      setError("Las contraseñas no coinciden");
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setCargando(true);

    try {
      // 1. Crear la cuenta
      const respuesta = await fetch("/api/registro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre_usuario: formulario.nombre_usuario,
          correo: formulario.correo,
          contrasena: formulario.contrasena,
          codigo_invitacion: requiereInvitacion
            ? formulario.codigo_invitacion.trim()
            : "",
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo crear la cuenta");
      }

      // La cuenta ya existe en la base de datos
      setRegistroCreado(true);
      setExito("¡Cuenta creada correctamente! Iniciando sesión...");

      // 2. Intentar iniciar sesión automáticamente
      try {
        const respuestaLogin = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            correo: formulario.correo,
            contrasena: formulario.contrasena,
          }),
        });

        const datosLogin = await respuestaLogin.json();

        if (!respuestaLogin.ok || !datosLogin.usuario) {
          throw new Error("No se pudo iniciar sesión");
        }

        iniciarSesion(datosLogin.usuario);
        toast.success("Cuenta creada. Sesión iniciada.");

        setExito("¡Cuenta creada correctamente! Bienvenido a Neumático Rojo.");

        await new Promise((resolve) => setTimeout(resolve, 1200));

        navigate("/", { replace: true });
      } catch {
        // La cuenta fue creada, pero el login falló
        setExito("¡Tu cuenta se creó correctamente!");
        toast.success("Cuenta creada correctamente");
        setError(
          "No se pudo iniciar sesión automáticamente. " +
            "Ingresá desde Iniciar sesión con tu nueva cuenta.",
        );

        // Limpiar los campos sensibles
        setFormulario((anterior) => ({
          ...anterior,
          contrasena: "",
          confirmarContrasena: "",
          codigo_invitacion: "",
        }));
      }
    } catch (error) {
      // Error durante el registro
      setError(error.message || "No se pudo crear la cuenta");
      toast.error(error.message || "No se pudo crear la cuenta");
    } finally {
      setCargando(false);
    }
  }

  const claseInput =
    "nr-input-flotante box-border w-full rounded-xl border border-white/15 bg-[#111117] py-3.5 pl-12 pr-4 text-base sm:text-sm text-white outline-none transition-colors placeholder:text-[#777783] focus:border-[#e10600] focus:ring-2 focus:ring-[#e10600]/20 disabled:opacity-60";

  const claseInputConBoton =
    "nr-input-flotante box-border w-full rounded-xl border border-white/15 bg-[#111117] py-3.5 pl-12 pr-12 text-base sm:text-sm text-white outline-none transition-colors placeholder:text-[#777783] focus:border-[#e10600] focus:ring-2 focus:ring-[#e10600]/20 disabled:opacity-60";


  return (
    <main className="min-h-[calc(100vh-100px)] bg-[#101015] px-4 py-10 text-white sm:px-6 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/"
          className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#b8b8c2] no-underline transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al inicio
        </Link>

        <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-[#1b1b23] shadow-[0_24px_80px_rgba(0,0,0,0.4)] lg:grid-cols-[0.9fr_1.1fr]">
          {/* PANEL DE PRESENTACIÓN (IGUAL AL ESTILO DE LOGIN) */}
          <aside className="relative hidden min-h-[680px] flex-col justify-between overflow-hidden border-r border-white/10 bg-[#e10600] p-10 lg:flex">
            <div
              className="pointer-events-none absolute -right-28 -top-24 h-80 w-80 rounded-full border-[52px] border-white/10"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-24 -left-32 h-96 w-96 rounded-full border-[56px] border-black/10"
              aria-hidden="true"
            />

            <div className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full border border-white/35 bg-black/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">
              <Flag className="h-4 w-4" aria-hidden="true" />
              NeumaticoRojo
            </div>

            <div className="relative z-10">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.28em] text-white/80">
                Tu pasión, tus estadísticas
              </p>
              <h2 className="m-0 text-5xl font-black uppercase italic leading-[1.06] tracking-tight text-white xl:text-6xl">
                Tu lugar
                <br />
                en la F1.
              </h2>
              <p className="mt-6 max-w-xs text-base leading-relaxed text-white/90">
                Creá tu cuenta para seguir a tus pilotos y escuderías favoritas
                y consultar las novedades de cada Gran Premio.
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-3 border-t border-white/30 pt-6 text-sm font-medium text-white/90">
              <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
              Una experiencia de Fórmula 1 personalizada
            </div>
          </aside>

          {/* FORMULARIO DE REGISTRO */}
          <section className="p-6 sm:p-10 lg:p-12">
            <div className="mb-9">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-[#e10600]/35 bg-[#e10600]/10 text-[#ff4141]">
                <UserPlus
                  className="h-6 w-6"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </div>

              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#ff4444]">
                Nuevo usuario
              </p>
              <h1 className="m-0 text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl">
                Crear cuenta
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#a9a9b4]">
                Unite a NeumaticoRojo y personalizá tu experiencia en Fórmula 1.
              </p>
            </div>

            <form className="space-y-5" onSubmit={manejarRegistro}>
              {/* NOMBRE DE USUARIO */}
              <div>
                <div className="relative nr-campo-flotante">
                  <UserRound
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#888894]"
                    aria-hidden="true"
                  />
                  <input
                    id="nombre_usuario"
                    type="text"
                    name="nombre_usuario"
                    placeholder=" "
                    value={formulario.nombre_usuario}
                    onChange={manejarCambio}
                    autoComplete="username"
                    minLength={3}
                    maxLength={50}
                    disabled={cargando}
                    required
                    className={claseInput}
                  />
                  <label htmlFor="nombre_usuario" className="nr-label-flotante">Nombre de usuario</label>
                </div>
              </div>

              {/* CORREO ELECTRÓNICO */}
              <div>
                <div className="relative nr-campo-flotante">
                  <Mail
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#888894]"
                    aria-hidden="true"
                  />
                  <input
                    id="correo"
                    type="email"
                    name="correo"
                    placeholder=" "
                    value={formulario.correo}
                    onChange={manejarCambio}
                    autoComplete="email"
                    maxLength={150}
                    disabled={cargando}
                    required
                    className={claseInput}
                  />
                  <label htmlFor="correo" className="nr-label-flotante">Correo electrónico</label>
                </div>
              </div>

              {/* CONTRASEÑA */}
              <div>
                <div className="relative nr-campo-flotante">
                  <LockKeyhole
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#888894]"
                    aria-hidden="true"
                  />
                  <input
                    id="contrasena"
                    type={mostrarContrasena ? "text" : "password"}
                    name="contrasena"
                    placeholder=" "
                    value={formulario.contrasena}
                    onChange={manejarCambio}
                    autoComplete="new-password"
                    minLength={8}
                    disabled={cargando}
                    required
                    className={claseInputConBoton}
                  />
                  <label htmlFor="contrasena" className="nr-label-flotante">Contraseña</label>
                  <span className="sr-only">La contraseña debe tener al menos 8 caracteres</span>
                  <button
                    type="button"
                    onClick={() =>
                      setMostrarContrasena((anterior) => !anterior)
                    }
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#aaaab5] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e10600]"
                    aria-label={
                      mostrarContrasena
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                    aria-pressed={mostrarContrasena}
                  >
                    {mostrarContrasena ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <p className="-mt-2 text-xs text-[#a9a9b4]">La contraseña debe tener al menos 8 caracteres.</p>

              {/* CONFIRMAR CONTRASEÑA */}
              <div>
                <div className="relative nr-campo-flotante">
                  <LockKeyhole
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#888894]"
                    aria-hidden="true"
                  />
                  <input
                    id="confirmarContrasena"
                    type={mostrarConfirmacion ? "text" : "password"}
                    name="confirmarContrasena"
                    placeholder=" "
                    value={formulario.confirmarContrasena}
                    onChange={manejarCambio}
                    autoComplete="new-password"
                    minLength={8}
                    disabled={cargando}
                    required
                    className={claseInputConBoton}
                  />
                  <label htmlFor="confirmarContrasena" className="nr-label-flotante">Confirmar contraseña</label>
                  <button
                    type="button"
                    onClick={() =>
                      setMostrarConfirmacion((anterior) => !anterior)
                    }
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#aaaab5] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e10600]"
                    aria-label={
                      mostrarConfirmacion
                        ? "Ocultar confirmación"
                        : "Mostrar confirmación"
                    }
                    aria-pressed={mostrarConfirmacion}
                  >
                    {mostrarConfirmacion ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* ACCESO POR INVITACION - BETA */}
              {requiereInvitacion && (
                <div>
                <div className="relative nr-campo-flotante">
                    <KeyRound
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#888894]"
                      aria-hidden="true"
                    />
                    <input
                      id="codigo_invitacion"
                      type="text"
                      name="codigo_invitacion"
                      placeholder=" "
                      value={formulario.codigo_invitacion}
                      onChange={manejarCambio}
                      autoComplete="off"
                      maxLength={256}
                      disabled={cargando}
                      required
                      className={claseInput}
                    />
                  <label htmlFor="codigo_invitacion" className="nr-label-flotante">Código de invitación</label>
                  </div>
                  <p className="mt-2 text-xs text-[#a9a9b4]">
                    Necesitás el código que te compartió el creador de
                    NeumaticoRojo.
                  </p>
                </div>
              )}

              {/* ERROR */}
              {error && (
                <div
                  className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                  role="alert"
                >
                  <AlertCircle
                    className="mt-0.5 h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{error}</span>
                </div>
              )}

              {/* REGISTRO EXITOSO */}
              {exito && (
                <div
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                  role="status"
                >
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2
                      className="h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                    {exito}
                  </div>
                  <Link
                    to="/login"
                    className="mt-2 inline-flex items-center gap-1 font-semibold text-emerald-200 no-underline hover:text-white"
                  >
                    Iniciar sesión
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              )}

              {/* BOTÓN DE REGISTRO */}
              <button
                type="submit"
                disabled={cargando || registroCreado}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] px-5 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-[0_8px_28px_rgba(225,6,0,0.22)] transition-all hover:bg-[#f51a14] hover:shadow-[0_10px_32px_rgba(225,6,0,0.32)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6b65] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {cargando ? (
                  <>
                    <LoaderCircle
                      className="h-5 w-5 animate-spin"
                      aria-hidden="true"
                    />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    Crear cuenta
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </>
                )}
              </button>

              {/* ENLACE AL LOGIN */}
              <p className="m-0 border-t border-white/10 pt-6 text-center text-sm text-[#aaaab5]">
                ¿Ya tenés una cuenta?{" "}
                <Link
                  to="/login"
                  className="font-bold text-[#ff4b45] no-underline transition-colors hover:text-white"
                >
                  Iniciar sesión
                </Link>
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

export default Registro;
