import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  Flag,
  Info,
  LoaderCircle,
  MapPin,
  Trophy,
  Zap,
} from "lucide-react";
import { obtenerColorEscuderia } from "../utils/coloresF1";
import FotoPiloto from "../components/FotoPiloto";

const TEMPORADAS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];

function Resultados() {
  // La URL define el GP seleccionado (por ejemplo, /resultados?temporada=2025&ronda=3).
  // También permite compartir el enlace o regresar con el navegador.
  const [parametros, setParametros] = useSearchParams();
  const temporadaURL = parametros.get("temporada");
  const rondaURL = parametros.get("ronda");

  const temporada = TEMPORADAS.includes(temporadaURL) ? temporadaURL : "2026";
  const ronda = /^[1-9]\d*$/.test(rondaURL ?? "") ? rondaURL : "1";

  // ESTADOS
  const [tipoSesion, setTipoSesion] = useState("carrera");

  const [carreras, setCarreras] = useState([]);
  const [datos, setDatos] = useState(null);

  const [cargandoCarreras, setCargandoCarreras] = useState(true);
  const [cargandoResultados, setCargandoResultados] = useState(true);

  const [errorCarreras, setErrorCarreras] = useState("");
  const [errorResultados, setErrorResultados] = useState("");
  const [sinResultados, setSinResultados] = useState(false);

  // 1. OBTENER EL CALENDARIO
  useEffect(() => {
    const controller = new AbortController();

    async function obtenerCarreras() {
      setCargandoCarreras(true);
      setErrorCarreras("");
      setCarreras([]);

      try {
        const respuesta = await fetch(
          `http://localhost:3001/api/carreras?temporada=${temporada}`,
          { signal: controller.signal },
        );

        if (!respuesta.ok) {
          throw new Error("No se pudo cargar el calendario");
        }

        const resultado = await respuesta.json();

        if (!Array.isArray(resultado.carreras)) {
          throw new Error("Formato de calendario inválido");
        }

        setCarreras(resultado.carreras);
      } catch (error) {
        if (error.name !== "AbortError") {
          setErrorCarreras(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoCarreras(false);
        }
      }
    }

    obtenerCarreras();

    return () => controller.abort();
  }, [temporada]);

  // 2. OBTENER LOS RESULTADOS DE LA SESIÓN
  useEffect(() => {
    const controller = new AbortController();

    async function obtenerResultados() {
      setCargandoResultados(true);
      setErrorResultados("");
      setDatos(null);
      setSinResultados(false);

      // Elegir el endpoint según la pestaña
      const url =
        tipoSesion === "carrera"
          ? `http://localhost:3001/api/resultados?temporada=${temporada}&ronda=${ronda}`
          : `http://localhost:3001/api/resultados-sesion?temporada=${temporada}&ronda=${ronda}&tipo=${tipoSesion}`;

      try {
        const respuesta = await fetch(url, {
          signal: controller.signal,
        });

        // La API no tiene resultados de esa sesión
        if (respuesta.status === 404) {
          setSinResultados(true);
          return;
        }

        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar los resultados");
        }

        const resultado = await respuesta.json();

        if (!Array.isArray(resultado.resultados)) {
          throw new Error("Formato de resultados inválido");
        }

        setDatos(resultado);
      } catch (error) {
        if (error.name !== "AbortError") {
          setErrorResultados(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoResultados(false);
        }
      }
    }

    obtenerResultados();

    return () => controller.abort();
  }, [temporada, ronda, tipoSesion]);

  // 3. CAMBIAR TEMPORADA
  function cambiarTemporada(evento) {
    setTipoSesion("carrera");
    setParametros({ temporada: evento.target.value, ronda: "1" });
  }

  // 4. CAMBIAR GRAN PREMIO
  function cambiarRonda(evento) {
    setTipoSesion("carrera");
    setParametros({ temporada, ronda: evento.target.value });
  }

  // 5. FORMATEAR FECHA
  function formatearFecha(fecha) {
    return new Date(`${fecha}T12:00:00Z`).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // COMPROBAR SI ESTE GRAN PREMIO TIENE SPRINT
  const carreraSeleccionada = carreras.find(
    (carrera) => String(carrera.round) === ronda,
  );

  const tieneSprint = Boolean(carreraSeleccionada?.Sprint);

  const esClasificacion = tipoSesion === "clasificacion";

  const nombresSesion = {
    carrera: "RESULTADOS DE CARRERA",
    clasificacion: "RESULTADOS DE CLASIFICACIÓN",
    sprint: "RESULTADOS DE SPRINT",
  };

  const estaCargando = cargandoCarreras || cargandoResultados;
  const mensajeError = errorCarreras || errorResultados;

  const pestanas = [
    { id: "carrera", nombre: "Carrera", Icono: Flag },
    { id: "clasificacion", nombre: "Clasificación", Icono: Clock3 },
    ...(tieneSprint ? [{ id: "sprint", nombre: "Sprint", Icono: Zap }] : []),
  ];

  return (
    <main className="min-h-screen bg-[#101117] px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-7">
        {/* ENCABEZADO */}
        <header className="flex flex-col gap-4 border-l-4 border-[#e10600] pl-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#e10600]">
              FÓRMULA 1 · TEMPORADA {temporada}
            </p>
            <h1 className="flex items-center gap-3 text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl">
              <Trophy
                className="h-8 w-8 shrink-0 text-[#e10600]"
                aria-hidden="true"
              />
              Resultados
            </h1>
            <p className="mt-3 text-sm text-slate-400 sm:text-base">
              Consultá los resultados de los Grandes Premios, clasificaciones y
              carreras Sprint.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300">
            <Flag className="h-4 w-4 text-[#e10600]" aria-hidden="true" />
            Campeonato Mundial
          </span>
        </header>

        {/* FILTROS */}
        <section className="rounded-2xl border border-white/10 bg-[#1b1c25] p-5 shadow-xl sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <span
              className="h-5 w-1 rounded-full bg-[#e10600]"
              aria-hidden="true"
            />
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-white">
              Seleccionar evento
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="resultados-temporada"
                className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300"
              >
                <CalendarDays
                  className="h-4 w-4 text-[#e10600]"
                  aria-hidden="true"
                />
                Temporada
              </label>
              <div className="relative">
                <select
                  id="resultados-temporada"
                  value={temporada}
                  onChange={cambiarTemporada}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#101117] px-4 py-3 pr-10 text-sm font-semibold text-white outline-none transition-colors focus:border-[#e10600] focus:ring-2 focus:ring-[#e10600]/20"
                >
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((anio) => (
                    <option key={anio} value={anio}>
                      Temporada {anio}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="resultados-gp"
                className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300"
              >
                <MapPin className="h-4 w-4 text-[#e10600]" aria-hidden="true" />
                Gran Premio
              </label>
              <div className="relative">
                <select
                  id="resultados-gp"
                  value={ronda}
                  onChange={cambiarRonda}
                  disabled={cargandoCarreras || carreras.length === 0}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#101117] px-4 py-3 pr-10 text-sm font-semibold text-white outline-none transition-colors focus:border-[#e10600] focus:ring-2 focus:ring-[#e10600]/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {carreras.length === 0 && (
                    <option value="1">Sin Grandes Premios disponibles</option>
                  )}
                  {carreras.map((carrera) => (
                    <option key={carrera.round} value={carrera.round}>
                      Ronda {carrera.round} - {carrera.raceName}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </section>

        {/* PESTAÑAS DE SESIONES */}
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Tipo de sesión"
        >
          {pestanas.map(({ id, nombre, Icono }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTipoSesion(id)}
              aria-pressed={tipoSesion === id}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-extrabold uppercase tracking-wide transition-all sm:text-sm ${
                tipoSesion === id
                  ? "border-[#e10600] bg-[#e10600] text-white shadow-lg shadow-red-950/30"
                  : "border-white/10 bg-[#20212b] text-slate-300 hover:border-[#e10600]/50 hover:bg-[#292b37] hover:text-white"
              }`}
            >
              <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
              {nombre}
            </button>
          ))}
        </div>

        {/* ESTADOS DE CARGA Y ERROR */}
        {estaCargando && (
          <div
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1b1c25] p-5 text-sm text-slate-300"
            role="status"
          >
            <LoaderCircle
              className="h-5 w-5 animate-spin text-[#e10600]"
              aria-hidden="true"
            />
            Cargando resultados...
          </div>
        )}

        {!estaCargando && mensajeError && (
          <div
            className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-950/20 p-5 text-sm text-red-200"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            Error: {mensajeError}
          </div>
        )}

        {!estaCargando && !mensajeError && sinResultados && (
          <div
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1b1c25] p-5 text-sm text-slate-300"
            role="status"
          >
            <Info
              className="h-5 w-5 shrink-0 text-[#e10600]"
              aria-hidden="true"
            />
            No hay resultados disponibles de esta sesión.
          </div>
        )}

        {/* DATOS Y TABLA DE RESULTADOS */}
        {!estaCargando && !mensajeError && datos && (
          <div className="space-y-5">
            <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#252733] to-[#191a23] p-6 shadow-lg sm:p-8">
              <div
                className="absolute right-0 top-0 h-full w-1.5 bg-[#e10600]"
                aria-hidden="true"
              />
              <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-[#ff4b47]">
                {nombresSesion[tipoSesion]}
              </p>
              <h2 className="text-2xl font-black uppercase italic tracking-tight text-white sm:text-3xl">
                {datos.nombre}
              </h2>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
                <p className="inline-flex items-center gap-2">
                  <MapPin
                    className="h-4 w-4 text-[#e10600]"
                    aria-hidden="true"
                  />
                  {datos.circuito?.circuitName || "Circuito no disponible"}
                </p>
                <p className="inline-flex items-center gap-2">
                  <CalendarDays
                    className="h-4 w-4 text-[#e10600]"
                    aria-hidden="true"
                  />
                  {datos.fecha
                    ? formatearFecha(datos.fecha)
                    : "Fecha no disponible"}
                </p>
              </div>
            </section>

            <section
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#1b1c25] shadow-xl"
              aria-label="Tabla de resultados"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4 sm:px-6">
                <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-white">
                  <Trophy
                    className="h-5 w-5 text-[#e10600]"
                    aria-hidden="true"
                  />
                  Clasificación de la sesión
                </h3>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-400">
                  {datos.resultados.length} pilotos
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[740px] border-collapse text-left text-sm">
                  <thead className="bg-[#111219] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th scope="col" className="px-4 py-4 text-center sm:px-6">
                        Pos.
                      </th>
                      <th scope="col" className="px-4 py-4 sm:px-6">
                        Piloto
                      </th>
                      {esClasificacion ? (
                        <>
                          <th scope="col" className="px-4 py-4">
                            Q1
                          </th>
                          <th scope="col" className="px-4 py-4">
                            Q2
                          </th>
                          <th scope="col" className="px-4 py-4">
                            Q3
                          </th>
                        </>
                      ) : (
                        <>
                          <th scope="col" className="px-4 py-4">
                            Parrilla
                          </th>
                          <th scope="col" className="px-4 py-4">
                            Tiempo / Estado
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-4 text-right sm:pr-6"
                          >
                            Puntos
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {datos.resultados.map((resultado) => {
                      const idPiloto = resultado.Driver.driverId;
                      const nombrePiloto = `${resultado.Driver.givenName} ${resultado.Driver.familyName}`;
                      const colorEquipo = obtenerColorEscuderia(
                        resultado.Constructor?.constructorId,
                      );

                      return (
                        <tr
                          key={idPiloto}
                          className="transition-colors hover:bg-white/5"
                        >
                          <td className="px-4 py-4 text-center sm:px-6">
                            <span className="inline-flex min-w-9 items-center justify-center rounded-lg border border-white/10 bg-[#292b35] px-2 py-1.5 font-black text-white">
                              {resultado.positionText ??
                                resultado.position ??
                                "—"}
                            </span>
                          </td>
                          <td className="px-4 py-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              {temporada === "2026" && (
                                <FotoPiloto
                                  idPiloto={idPiloto}
                                  nombre={nombrePiloto}
                                  colorEquipo={colorEquipo}
                                  temporada={temporada}
                                  tamano="md"
                                />
                              )}
                              <div className="min-w-0">
                                <Link
                                  to={`/pilotos/${idPiloto}?temporada=${temporada}`}
                                  className="group inline-flex items-center gap-1.5 font-bold text-white no-underline transition-colors hover:text-[#ff4b47]"
                                >
                                  {nombrePiloto}
                                  <ArrowUpRight
                                    className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-[#ff4b47]"
                                    aria-hidden="true"
                                  />
                                </Link>
                                <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                                  <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: colorEquipo }}
                                    aria-hidden="true"
                                  />
                                  <span>
                                    {resultado.Constructor?.name || "—"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          {esClasificacion ? (
                            <>
                              <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-300">
                                {resultado.Q1 || "—"}
                              </td>
                              <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-300">
                                {resultado.Q2 || "—"}
                              </td>
                              <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-300">
                                {resultado.Q3 || "—"}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-4 font-semibold tabular-nums text-slate-300">
                                {resultado.grid ?? "—"}
                              </td>
                              <td className="px-4 py-4 text-slate-300">
                                {resultado.Time?.time ||
                                  resultado.status ||
                                  "—"}
                              </td>
                              <td className="px-4 py-4 text-right font-black tabular-nums text-white sm:pr-6">
                                <span className="rounded-lg bg-[#e10600]/15 px-3 py-1.5 text-[#ff5b56]">
                                  {resultado.points ?? "—"}
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {datos.resultados.length === 0 && (
                <p className="border-t border-white/10 p-6 text-center text-sm text-slate-400">
                  No hay resultados disponibles para esta sesión.
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default Resultados;
