import { useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router";
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
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Login() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [usuario, setUsuario] = useState(null);

  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();

  // Enviar el login al backend (sin modificar la lógica existente).
  async function manejarLogin(evento) {
    evento.preventDefault();

    setError("");
    setUsuario(null);
    setCargando(true);

    try {
      const respuesta = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          correo,
          contrasena,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo iniciar sesión");
      }

      setUsuario(datos.usuario);
      iniciarSesion(datos.usuario);
      toast.success("Sesión iniciada correctamente");
      setContrasena("");
      navigate("/", { replace: true });
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setCargando(false);
    }
  }

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
          {/* PANEL DE PRESENTACIÓN */}
          <aside className="relative hidden min-h-[560px] flex-col justify-between overflow-hidden border-r border-white/10 bg-[#e10600] p-10 lg:flex">
            {/* Elementos decorativos, sin imágenes externas */}
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
                Viví la
                <br />
                Fórmula 1.
              </h2>
              <p className="mt-6 max-w-xs text-base leading-relaxed text-white/90">
                Seguí a tus pilotos y escuderías favoritas, consultá resultados
                y viví cada Gran Premio en un solo lugar.
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-3 border-t border-white/30 pt-6 text-sm font-medium text-white/90">
              <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
              Tu espacio personalizado de Fórmula 1
            </div>
          </aside>

          {/* FORMULARIO DE INICIO DE SESIÓN */}
          <section className="p-6 sm:p-10 lg:p-12">
            <div className="mb-9">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-[#e10600]/35 bg-[#e10600]/10 text-[#ff4141]">
                <LockKeyhole
                  className="h-6 w-6"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </div>
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#ff4444]">
                Acceso de usuarios
              </p>
              <h1 className="m-0 text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl">
                Iniciar sesión
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#a9a9b4]">
                Bienvenido de nuevo a NeumaticoRojo. Accedé a tu cuenta para
                personalizar tu experiencia en Fórmula 1.
              </p>
            </div>

            <form className="space-y-6" onSubmit={manejarLogin}>
              {/* USUARIO O CORREO */}
              <div>
                <div className="relative nr-campo-flotante">
                  <UserRound
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#888894]"
                    aria-hidden="true"
                  />
                  <input
                    id="login-correo"
                    type="text"
                    placeholder=" "
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    autoComplete="username"
                    disabled={cargando}
                    required
                    className="nr-input-flotante box-border w-full rounded-xl border border-white/15 bg-[#111117] py-3.5 pl-12 pr-4 text-base sm:text-sm text-white outline-none transition-colors placeholder:text-[#777783] focus:border-[#e10600] focus:ring-2 focus:ring-[#e10600]/20 disabled:opacity-60"
                  />
                  <label htmlFor="login-correo" className="nr-label-flotante">Usuario o correo electrónico</label>
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
                    id="login-contrasena"
                    type={mostrarContrasena ? "text" : "password"}
                    placeholder=" "
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    autoComplete="current-password"
                    disabled={cargando}
                    required
                    className="nr-input-flotante box-border w-full rounded-xl border border-white/15 bg-[#111117] py-3.5 pl-12 pr-12 text-base sm:text-sm text-white outline-none transition-colors placeholder:text-[#777783] focus:border-[#e10600] focus:ring-2 focus:ring-[#e10600]/20 disabled:opacity-60"
                  />
                  <label htmlFor="login-contrasena" className="nr-label-flotante">Contraseña</label>
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

              {/* ERROR DEL SERVIDOR */}
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

              {/* CONFIRMACIÓN DE INGRESO */}
              {usuario && (
                <div
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                  role="status"
                >
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    ¡Bienvenido, {usuario.nombre_usuario}!
                  </div>
                  <p className="mb-2 mt-1">Iniciaste sesión correctamente.</p>
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-200 hover:text-white"
                  >
                    Ir al inicio{" "}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              )}

              {/* BOTÓN DE INICIO DE SESIÓN */}
              <button
                type="submit"
                disabled={cargando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] px-5 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-[0_8px_28px_rgba(225,6,0,0.22)] transition-all hover:bg-[#f51a14] hover:shadow-[0_10px_32px_rgba(225,6,0,0.32)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6b65] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {cargando ? (
                  <>
                    <LoaderCircle
                      className="h-5 w-5 animate-spin"
                      aria-hidden="true"
                    />
                    Ingresando...
                  </>
                ) : (
                  <>
                    Iniciar sesión
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </>
                )}
              </button>

              {/* ENLACE AL REGISTRO */}
              <p className="m-0 border-t border-white/10 pt-6 text-center text-sm text-[#aaaab5]">
                ¿Todavía no tenés una cuenta?{" "}
                <Link
                  to="/registro"
                  className="font-bold text-[#ff4b45] no-underline transition-colors hover:text-white"
                >
                  Registrate
                </Link>
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

export default Login;
