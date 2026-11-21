import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
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

// Utilizamos los resúmenes reales del backend para habilitar una sesión.
// No alcanza con que aparezca en el calendario ni con que haya pasado su horario.
function hayPodio(datos, tipo) {
  return Array.isArray(datos?.resultados?.[tipo]) && datos.resultados[tipo].length > 0;
}

function Resultados() {
  const reducirMovimiento = useReducedMotion();
  // La URL define el GP seleccionado (por ejemplo, /resultados?temporada=2025&ronda=3).
  // También permite compartir el enlace o regresar con el navegador.
  const [parametros, setParametros] = useSearchParams();
  const temporadaURL = parametros.get("temporada");
  const rondaURL = parametros.get("ronda");
  const tipoURL = parametros.get("tipo");

  const temporada = TEMPORADAS.includes(temporadaURL) ? temporadaURL : "2026";
  const ronda = /^[1-9]\d*$/.test(rondaURL ?? "") ? rondaURL : "1";
  const tiposValidos = ["fp1", "fp2", "fp3", "clasificacion_sprint", "sprint", "clasificacion", "carrera"];
  // La sesión forma parte de la URL: así funcionan los enlaces directos y Atrás/Adelante.
  const tipoSesion = tiposValidos.includes(tipoURL) ? tipoURL : "carrera";
  const esPractica = ["fp1", "fp2", "fp3", "clasificacion_sprint"].includes(tipoSesion);
  const esClasificacionSprint = tipoSesion === "clasificacion_sprint";

  // ESTADOS

  const [carreras, setCarreras] = useState([]);
  const [datos, setDatos] = useState(null);

  const [cargandoCarreras, setCargandoCarreras] = useState(true);
  const [cargandoResultados, setCargandoResultados] = useState(true);

  const [errorCarreras, setErrorCarreras] = useState("");
  const [errorResultados, setErrorResultados] = useState("");
  const [sinResultados, setSinResultados] = useState(false);

  const [disponibilidad, setDisponibilidad] = useState({
    clave: null,
    comprobando: true,
    estados: {},
  });

  const claveGP = `${temporada}-${ronda}`;
  const carreraSeleccionada = carreras.find(
    (carrera) => String(carrera.round) === ronda,
  );
  const disponibilidadLista =
    disponibilidad.clave === claveGP && !disponibilidad.comprobando;
  const estadosSesion = disponibilidadLista ? disponibilidad.estados : {};

  // 1. OBTENER EL CALENDARIO
  useEffect(() => {
    const controller = new AbortController();

    async function obtenerCarreras() {
      setCargandoCarreras(true);
      setErrorCarreras("");
      setCarreras([]);

      try {
        const respuesta = await fetch(`/api/carreras?temporada=${temporada}`, {
          signal: controller.signal,
        });

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

  // 2. COMPROBAR QUÉ SESIONES TIENEN RESULTADOS PUBLICADOS
  // Se reutilizan las dos rutas de resumen que ya existen para Race Week.
  useEffect(() => {
    const controller = new AbortController();
    const clave = `${temporada}-${ronda}`;

    if (cargandoCarreras || errorCarreras || !carreraSeleccionada) {
      setDisponibilidad({ clave, comprobando: Boolean(cargandoCarreras), estados: {} });
      return () => controller.abort();
    }

    setDisponibilidad({ clave, comprobando: true, estados: {} });

    async function obtenerResumen(url) {
      const respuesta = await fetch(url, { signal: controller.signal });
      if (!respuesta.ok) throw new Error(`Error consultando disponibilidad (${respuesta.status})`);
      return respuesta.json();
    }

    async function comprobarResultados() {
      const consultas = [
        obtenerResumen(`/api/resumen-sesiones?temporada=${temporada}&ronda=${ronda}`),
        Number(temporada) >= 2023
          ? obtenerResumen(`/api/resumen-practicas?temporada=${temporada}&fecha=${carreraSeleccionada.date}`)
          : Promise.resolve(null),
      ];

      const [sesiones, practicas] = await Promise.allSettled(consultas);
      if (controller.signal.aborted) return;

      const estado = (respuesta, tipo) =>
        respuesta.status === "rejected"
          ? "error"
          : hayPodio(respuesta.value, tipo)
            ? "disponible"
            : "pendiente";

      setDisponibilidad({
        clave,
        comprobando: false,
        estados: {
          fp1: Number(temporada) < 2023 ? "sin_cobertura" : estado(practicas, "fp1"),
          fp2: Number(temporada) < 2023 ? "sin_cobertura" : estado(practicas, "fp2"),
          fp3: Number(temporada) < 2023 ? "sin_cobertura" : estado(practicas, "fp3"),
          clasificacion_sprint: Number(temporada) < 2023
            ? "sin_cobertura"
            : estado(practicas, "clasificacion_sprint"),
          clasificacion: estado(sesiones, "clasificacion"),
          sprint: estado(sesiones, "sprint"),
          carrera: estado(sesiones, "carrera"),
        },
      });
    }

    comprobarResultados();
    // Una vez publicados los resultados, la pestaña se habilita sin recargar.
    // Las rutas de resumen tienen caché en el backend para proteger las APIs.
    const intervalo = Number(temporada) >= new Date().getUTCFullYear()
      ? setInterval(comprobarResultados, 120000)
      : null;

    return () => {
      controller.abort();
      if (intervalo) clearInterval(intervalo);
    };
  }, [temporada, ronda, carreraSeleccionada?.date, cargandoCarreras, errorCarreras]);

  // 3. OBTENER LOS RESULTADOS DE LA SESIÓN (solo si ya se publicaron)
  useEffect(() => {
    const controller = new AbortController();

    async function obtenerResultados() {
      setCargandoResultados(true);
      setErrorResultados("");
      setDatos(null);
      setSinResultados(false);

      // Una sesión futura o sin datos no debe lanzar una consulta ni dejar
      // una sección vacía. Si hubo un error verificando las APIs, tampoco
      // asumimos que hay resultados disponibles.
      if (!disponibilidadLista || estadosSesion[tipoSesion] !== "disponible") {
        setCargandoResultados(false);
        return;
      }

      // Elegir el endpoint según la pestaña
      const url =
        tipoSesion === "carrera"
          ? `/api/resultados?temporada=${temporada}&ronda=${ronda}`
          : esPractica
            ? `/api/resultados-practica?temporada=${temporada}&ronda=${ronda}&tipo=${tipoSesion}`
            : `/api/resultados-sesion?temporada=${temporada}&ronda=${ronda}&tipo=${tipoSesion}`;

      try {
        const respuesta = await fetch(url, {
          signal: controller.signal,
        });

        // La API no tiene resultados de esa sesión
        if (respuesta.status === 404) {
          setSinResultados(true);
          // El resumen pudo haberse publicado antes que la tabla completa.
          // Hasta que la API la tenga, esta pestaña no estará habilitada.
          setDisponibilidad((anterior) =>
            anterior.clave === claveGP
              ? {
                  ...anterior,
                  estados: { ...anterior.estados, [tipoSesion]: "pendiente" },
                }
              : anterior,
          );
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
  }, [temporada, ronda, tipoSesion, esPractica, disponibilidadLista, estadosSesion[tipoSesion]]);

  // 3. CAMBIAR TEMPORADA
  function cambiarTemporada(evento) {
    setParametros({ temporada: evento.target.value, ronda: "1", tipo: "carrera" });
  }

  // 4. CAMBIAR GRAN PREMIO
  function cambiarRonda(evento) {
    setParametros({ temporada, ronda: evento.target.value, tipo: "carrera" });
  }

  function cambiarSesion(tipo) {
    if (estadosSesion[tipo] !== "disponible") return;
    setParametros({ temporada, ronda, tipo });
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
  const tieneSprint = Boolean(carreraSeleccionada?.Sprint);
  const tieneClasificacionSprint = Boolean(
    carreraSeleccionada?.SprintQualifying || carreraSeleccionada?.SprintShootout
  );

  const esClasificacion = tipoSesion === "clasificacion";

  const nombresSesion = {
    fp1: "RESULTADOS DE PRÁCTICA LIBRE 1",
    fp2: "RESULTADOS DE PRÁCTICA LIBRE 2",
    fp3: "RESULTADOS DE PRÁCTICA LIBRE 3",
    clasificacion_sprint: "RESULTADOS DE CLASIFICACIÓN SPRINT",
    carrera: "RESULTADOS DE CARRERA",
    clasificacion: "RESULTADOS DE CLASIFICACIÓN",
    sprint: "RESULTADOS DE SPRINT",
  };

  const estaCargando = cargandoCarreras || !disponibilidadLista || cargandoResultados;
  const mensajeError = errorCarreras || errorResultados;

  const pestanas = [
    ...(carreraSeleccionada?.FirstPractice ? [{ id: "fp1", nombre: "FP1", Icono: Clock3 }] : []),
    ...(carreraSeleccionada?.SecondPractice ? [{ id: "fp2", nombre: "FP2", Icono: Clock3 }] : []),
    ...(carreraSeleccionada?.ThirdPractice ? [{ id: "fp3", nombre: "FP3", Icono: Clock3 }] : []),
    ...(tieneClasificacionSprint ? [{ id: "clasificacion_sprint", nombre: "Clasif. Sprint", Icono: Zap }] : []),
    ...(tieneSprint ? [{ id: "sprint", nombre: "Sprint", Icono: Zap }] : []),
    { id: "clasificacion", nombre: "Clasificación", Icono: Clock3 },
    { id: "carrera", nombre: "Carrera", Icono: Flag },
  ];

  const primeraDisponible = pestanas.find(
    (pestana) => estadosSesion[pestana.id] === "disponible",
  )?.id;

  // Si una URL intenta abrir una sesión pendiente, mostrar la primera sesión
  // que sí tenga resultados. Se mantiene la ronda y la temporada elegidas.
  useEffect(() => {
    if (!disponibilidadLista || !primeraDisponible) return;
    if (estadosSesion[tipoSesion] === "disponible") return;
    setParametros({ temporada, ronda, tipo: primeraDisponible }, { replace: true });
  }, [disponibilidadLista, primeraDisponible, tipoSesion, estadosSesion[tipoSesion], temporada, ronda, setParametros]);

  const hayResultadosPublicados = Boolean(primeraDisponible);
  const falloDisponibilidad = Object.values(estadosSesion).some((estado) => estado === "error");

  return (
    <main className="min-h-screen bg-[#101117] px-4 py-5 text-slate-100 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-3 sm:space-y-4">
        {/* ENCABEZADO COMPACTO */}
        <header className="flex items-center gap-3 border-l-4 border-[#e10600] py-1 pl-4">
          <Trophy
            className="h-7 w-7 shrink-0 text-[#e10600]"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e10600]">
              FÓRMULA 1 · TEMPORADA {temporada}
            </p>
            <h1 className="m-0 font-racing text-2xl font-extrabold uppercase italic tracking-tight text-white sm:text-3xl">
              Resultados
            </h1>
          </div>
        </header>

        {/* SELECCIÓN DE EVENTO Y SESIÓN EN UN SOLO RECUADRO */}
        <section
          aria-label="Seleccionar evento y sesión"
          className="rounded-xl border border-white/10 bg-[#1b1c25] p-3 shadow-lg sm:p-4"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0">
              <label
                htmlFor="resultados-temporada"
                className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-300"
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
                  className="w-full appearance-none rounded-lg border border-white/10 bg-[#101117] px-3 py-2.5 pr-10 text-sm font-semibold text-white outline-none transition-colors hover:border-white/25 focus:border-[#e10600] focus:ring-2 focus:ring-[#e10600]/20"
                >
                  {TEMPORADAS.map((anio) => (
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

            <div className="min-w-0">
              <label
                htmlFor="resultados-gp"
                className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-300"
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
                  className="w-full appearance-none rounded-lg border border-white/10 bg-[#101117] px-3 py-2.5 pr-10 text-sm font-semibold text-white outline-none transition-colors hover:border-white/25 focus:border-[#e10600] focus:ring-2 focus:ring-[#e10600]/20 disabled:cursor-not-allowed disabled:opacity-50"
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

          {/* Pestañas debajo de los selectores, sin otro bloque alto */}
          <div
            className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3"
            role="group"
            aria-label="Tipo de sesión"
          >
            {pestanas.map(({ id, nombre, Icono }) => {
              const disponible = estadosSesion[id] === "disponible";
              const motivo = estadosSesion[id] === "sin_cobertura"
                ? "OpenF1 no tiene datos de prácticas anteriores a 2023"
                : estadosSesion[id] === "error"
                  ? "No se pudo comprobar la disponibilidad"
                  : "Resultados todavía no publicados";

              return (
                <button
                  key={id}
                  type="button"
                  disabled={!disponible}
                  title={disponible ? nombre : motivo}
                  onClick={() => cambiarSesion(id)}
                  aria-pressed={disponible && tipoSesion === id}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-extrabold uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e10600] ${
                    !disponible
                      ? "cursor-not-allowed border-white/5 bg-[#20212a] text-slate-500 opacity-60"
                      : tipoSesion === id
                        ? "border-[#e10600] bg-[#e10600] text-white"
                        : "border-white/10 bg-[#252631] text-slate-300 hover:border-[#e10600]/50 hover:text-white"
                  }`}
                >
                  <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {nombre}
                </button>
              );
            })}
          </div>
        </section>

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

        {!estaCargando && !mensajeError && !hayResultadosPublicados && (
          <div
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1b1c25] p-5 text-sm text-slate-300"
            role="status"
          >
            <Clock3 className="h-5 w-5 shrink-0 text-[#e10600]" aria-hidden="true" />
            {falloDisponibilidad
              ? "No se pudo comprobar la disponibilidad de algunas sesiones. Volvé a intentarlo más tarde."
              : "Todavía no hay resultados publicados para este Gran Premio. Las pestañas se habilitarán cuando estén disponibles."}
          </div>
        )}

        {!estaCargando && !mensajeError && hayResultadosPublicados && sinResultados && (
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
        {!estaCargando && !mensajeError && estadosSesion[tipoSesion] === "disponible" && datos && (
          <motion.div
            key={`${temporada}-${ronda}-${tipoSesion}`}
            initial={reducirMovimiento ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reducirMovimiento ? 0 : 0.3,
              ease: "easeOut",
            }}
            className="space-y-3"
          >
            {/* GRAN PREMIO: FRANJA PEQUEÑA SOBRE LA TABLA */}
            <section className="relative overflow-hidden rounded-xl border border-white/10 bg-[#1b1c25] px-4 py-3 shadow-sm sm:px-5">
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-1 bg-[#e10600]"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                <div className="min-w-0">
                  <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#ff4b47]">
                    {nombresSesion[tipoSesion]}
                  </p>
                  <h2 className="m-0 mt-1 font-racing text-lg font-extrabold uppercase italic leading-tight text-white sm:text-xl">
                    {datos.nombre}
                  </h2>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin
                      className="h-3.5 w-3.5 shrink-0 text-[#e10600]"
                      aria-hidden="true"
                    />
                    {datos.circuito?.circuitName || "Circuito no disponible"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays
                      className="h-3.5 w-3.5 shrink-0 text-[#e10600]"
                      aria-hidden="true"
                    />
                    {datos.fecha
                      ? formatearFecha(datos.fecha)
                      : "Fecha no disponible"}
                  </span>
                </div>
              </div>
            </section>

            <section
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#1b1c25] shadow-xl"
              aria-label="Tabla de resultados"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
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
                      {esPractica ? (
                        esClasificacionSprint ? (
                          <>
                            <th scope="col" className="px-4 py-4">SQ1</th>
                            <th scope="col" className="px-4 py-4">SQ2</th>
                            <th scope="col" className="px-4 py-4">SQ3</th>
                            <th scope="col" className="px-4 py-4 text-right sm:pr-6">Vueltas</th>
                          </>
                        ) : (
                          <>
                            <th scope="col" className="px-4 py-4">Mejor vuelta</th>
                            <th scope="col" className="px-4 py-4">Diferencia</th>
                            <th scope="col" className="px-4 py-4 text-right sm:pr-6">Vueltas</th>
                          </>
                        )
                      ) : esClasificacion ? (
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
                    {datos.resultados.map((resultado, indice) => {
                      const idPiloto = esPractica ? null : resultado.Driver.driverId;
                      const nombrePiloto = esPractica
                        ? resultado.nombre
                        : `${resultado.Driver.givenName} ${resultado.Driver.familyName}`;
                      const colorEquipo = esPractica
                        ? resultado.color || "#e10600"
                        : obtenerColorEscuderia(resultado.Constructor?.constructorId);
                      const puesto = Number(resultado.position);
                      const podio = puesto >= 1 && puesto <= 3;

                      return (
                        <motion.tr
                          key={idPiloto || resultado.numero || indice}
                          initial={
                            reducirMovimiento ? false : { opacity: 0, x: -8 }
                          }
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: reducirMovimiento ? 0 : 0.24,
                            delay: reducirMovimiento
                              ? 0
                              : Math.min(indice, 10) * 0.025,
                          }}
                          className={`transition-colors hover:bg-white/5 ${podio ? "bg-[#e10600]/[0.055]" : ""}`}
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
                              {esPractica ? (
                                <span className="min-w-9 text-sm font-extrabold" style={{ color: colorEquipo }}>
                                  #{resultado.numero}
                                </span>
                              ) : temporada === "2026" ? (
                                <FotoPiloto
                                  idPiloto={idPiloto}
                                  nombre={nombrePiloto}
                                  colorEquipo={colorEquipo}
                                  temporada={temporada}
                                  tamano="md"
                                />
                              ) : null}
                              <div className="min-w-0">
                                {esPractica ? (
                                  <span className="font-bold text-white">{nombrePiloto}</span>
                                ) : (
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
                                )}
                                <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                                  <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: colorEquipo }}
                                    aria-hidden="true"
                                  />
                                  <span>
                                    {esPractica ? resultado.escuderia : resultado.Constructor?.name || "—"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          {esPractica ? (
                            esClasificacionSprint ? (
                              <>
                                <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-300">{resultado.sq1 || "—"}</td>
                                <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-300">{resultado.sq2 || "—"}</td>
                                <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-300">{resultado.sq3 || "—"}</td>
                                <td className="px-4 py-4 text-right font-bold tabular-nums text-white sm:pr-6">{resultado.vueltas ?? "—"}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-4 font-mono text-xs tabular-nums font-bold text-white">{resultado.mejorVuelta || "—"}</td>
                                <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-300">{resultado.diferencia || "—"}</td>
                                <td className="px-4 py-4 text-right font-bold tabular-nums text-white sm:pr-6">{resultado.vueltas ?? "—"}</td>
                              </>
                            )
                          ) : esClasificacion ? (
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
                        </motion.tr>
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
          </motion.div>
        )}
      </div>
    </main>
  );
}

export default Resultados;
