import { useEffect, useState } from "react";
import { obtenerImagenCircuito } from "../utils/imagenesCircuitos";
import { Link } from "react-router";
import { obtenerColorEscuderia } from "../utils/coloresF1";
import FondoVideoGP from "./FondoVideoGP";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Clock3,
  Flag,
  LoaderCircle,
  MapPin,
} from "lucide-react";

const ZONA_ARGENTINA = "America/Argentina/Buenos_Aires";

// Convertir las fechas y horas UTC de la API
function crearFechaUTC(fecha, hora) {
  if (!fecha || !hora) return null;

  const horaTexto = String(hora).trim();

  const horaConZona = /(?:Z|[+-]\d{2}:\d{2})$/i.test(horaTexto)
    ? horaTexto
    : `${horaTexto}Z`;

  const resultado = new Date(`${fecha}T${horaConZona}`);

  return Number.isNaN(resultado.getTime()) ? null : resultado;
}

// Obtener el día calendario de Argentina
function diaCalendarioArgentina(fecha) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_ARGENTINA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);

  const valores = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value]),
  );

  return Date.UTC(
    Number(valores.year),
    Number(valores.month) - 1,
    Number(valores.day),
  );
}

// Fecha en Argentina
function formatearFecha(fecha) {
  if (!fecha) return "Fecha por confirmar";

  return fecha.toLocaleDateString("es-AR", {
    timeZone: ZONA_ARGENTINA,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Hora en Argentina
function formatearHora(fecha) {
  if (!fecha) return "Horario por confirmar";

  return fecha.toLocaleTimeString("es-AR", {
    timeZone: ZONA_ARGENTINA,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Cuenta regresiva
function calcularCuentaRegresiva(milisegundos) {
  if (milisegundos <= 0) {
    return "Inicio transcurrido";
  }

  const segundosTotales = Math.ceil(milisegundos / 1000);

  const dias = Math.floor(segundosTotales / 86400);

  const horas = Math.floor((segundosTotales % 86400) / 3600);

  const minutos = Math.floor((segundosTotales % 3600) / 60);

  const segundos = segundosTotales % 60;

  const dosDigitos = (numero) => String(numero).padStart(2, "0");

  return [
    dias > 0 ? `${dias}d` : null,
    `${dosDigitos(horas)}h`,
    `${dosDigitos(minutos)}m`,
    `${dosDigitos(segundos)}s`,
  ]
    .filter(Boolean)
    .join(" ");
}

// Construir todas las sesiones del Gran Premio
function obtenerSesiones(carrera) {
  const definiciones = [
    ["FirstPractice", "Práctica libre 1", "FP1"],
    ["SecondPractice", "Práctica libre 2", "FP2"],
    ["ThirdPractice", "Práctica libre 3", "FP3"],
    ["SprintQualifying", "Clasificación Sprint", "SQ"],
    ["SprintShootout", "Clasificación Sprint", "SQ"],
    ["Qualifying", "Clasificación", "Q"],
    ["Sprint", "Carrera Sprint", "SPR"],
    ["Carrera", "Carrera", "GP"],
  ];

  const tieneSprintQualifying = Boolean(carrera.SprintQualifying);

  const sesiones = [];

  for (const [clave, nombre, abreviatura] of definiciones) {
    // Evitar duplicar la clasificación Sprint
    if (clave === "SprintShootout" && tieneSprintQualifying) {
      continue;
    }

    const datosSesion =
      clave === "Carrera"
        ? {
            date: carrera.date,
            time: carrera.time,
          }
        : carrera[clave];

    if (!datosSesion?.date) {
      continue;
    }

    const inicio = crearFechaUTC(datosSesion.date, datosSesion.time);

    sesiones.push({
      id: clave,
      nombre,
      abreviatura,
      inicio,
      fecha: datosSesion.date,
    });
  }

  // Ordenar cronológicamente
  sesiones.sort((a, b) => {
    const fechaA = a.inicio?.getTime() ?? Date.parse(`${a.fecha}T12:00:00Z`);

    const fechaB = b.inicio?.getTime() ?? Date.parse(`${b.fecha}T12:00:00Z`);

    return fechaA - fechaB;
  });

  return sesiones;
}

// Código ISO para mostrar una bandera circular junto al país del GP.
// Se aplica solamente a países; no se confunde Miami o Las Vegas con un país.
const BANDERAS = {
  Australia: "au",
  China: "cn",
  Japan: "jp",
  Bahrain: "bh",
  "Saudi Arabia": "sa",
  Saudi: "sa",
  USA: "us",
  "United States": "us",
  Canada: "ca",
  Monaco: "mc",
  Spain: "es",
  Austria: "at",
  "Great Britain": "gb",
  "United Kingdom": "gb",
  Hungary: "hu",
  Belgium: "be",
  Netherlands: "nl",
  Italy: "it",
  Azerbaijan: "az",
  Singapore: "sg",
  Mexico: "mx",
  Brazil: "br",
  Qatar: "qa",
  "United Arab Emirates": "ae",
};

const cajaMensaje =
  "w-full rounded-xl border border-[#dfe1e6] bg-white p-8 text-center font-nav text-base text-[#575b68] dark:border-white/10 dark:bg-[#15151d] dark:text-[#bfc1cc]";

// Distribución equilibrada: 5 sesiones = 3 arriba y 2 abajo.
function columnasSesion(cantidad, indice) {
  if (cantidad === 1) return "sm:col-span-2 lg:col-span-6";
  if (cantidad === 2 || cantidad === 4) return "lg:col-span-3";
  if (cantidad === 5 && indice === 4) return "sm:col-span-2 lg:col-span-3";
  if (cantidad === 5 && indice === 3) return "lg:col-span-3";
  if (cantidad === 3 && indice === 2) return "sm:col-span-2 lg:col-span-2";
  return "lg:col-span-2";
}

function RaceWeekBanner({ onEstadoSemana }) {
  const reducirMovimiento = useReducedMotion();
  // El reloj sigue actualizado cada segundo sin reiniciar las animaciones.
  const [carreras, setCarreras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [resumenSesiones, setResumenSesiones] = useState(null);
  const [resumenPracticas, setResumenPracticas] = useState(null);

  // Reloj actualizado cada segundo
  const [ahora, setAhora] = useState(Date.now());

  // Obtener el calendario
  useEffect(() => {
    const controller = new AbortController();

    async function obtenerCarreras() {
      try {
        const respuesta = await fetch("/api/carreras?temporada=2026", {
          signal: controller.signal,
        });

        if (!respuesta.ok) {
          throw new Error("No se pudo consultar el calendario");
        }

        const datos = await respuesta.json();

        if (!Array.isArray(datos.carreras)) {
          throw new Error("Formato de calendario incorrecto");
        }

        if (!controller.signal.aborted) {
          setCarreras(datos.carreras);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(error);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    obtenerCarreras();

    return () => controller.abort();
  }, []);

  // Actualizar cuenta regresiva
  useEffect(() => {
    const intervalo = setInterval(() => {
      setAhora(Date.now());
    }, 1000);

    return () => clearInterval(intervalo);
  }, []);

  // Obtener inicio de la semana actual
  // tomando como referencia Argentina
  const hoyArgentina = diaCalendarioArgentina(new Date(ahora));

  const diaSemana = new Date(hoyArgentina).getUTCDay();

  const diferenciaLunes = (diaSemana + 6) % 7;

  const inicioSemana = hoyArgentina - diferenciaLunes * 24 * 60 * 60 * 1000;

  const finSemana = inicioSemana + 7 * 24 * 60 * 60 * 1000;

  // Buscar carrera de la semana actual
  const carreraSemana = carreras.find((carrera) => {
    const fechaCarrera =
      crearFechaUTC(carrera.date, carrera.time) ||
      new Date(`${carrera.date}T12:00:00Z`);

    const diaCarrera = diaCalendarioArgentina(fechaCarrera);

    return diaCarrera >= inicioSemana && diaCarrera < finSemana;
  });

  // Buscar próxima carrera
  const proximaCarrera = carreras.find((carrera) => {
    const fechaCarrera =
      crearFechaUTC(carrera.date, carrera.time) ||
      new Date(`${carrera.date}T23:59:59Z`);

    return fechaCarrera.getTime() >= ahora;
  });

  // Priorizar el Gran Premio de esta semana
  const carrera = carreraSemana || proximaCarrera;
  const esSemanaCarrera = Boolean(carreraSemana);

  // Comunicar al Inicio el estado real del calendario, sin una segunda consulta.
  // null indica que todavía se está cargando o no hay datos válidos.
  useEffect(() => {
    if (cargando || error || carreras.length === 0) {
      onEstadoSemana?.(null);
    } else {
      onEstadoSemana?.(esSemanaCarrera);
    }
  }, [cargando, error, carreras.length, esSemanaCarrera, onEstadoSemana]);

  // Datos del Gran Premio seleccionado
  const temporadaCarrera = carrera?.season || "2026";
  const rondaCarrera = carrera?.round;
  const fechaGP = carrera?.date;

  // Buscar cuándo empieza la primera sesión
  // para la cual consultamos resultados.
  const fechasResultados = carrera
    ? obtenerSesiones(carrera)
        .filter((sesion) =>
          ["Qualifying", "Sprint", "Carrera"].includes(sesion.id),
        )
        .map((sesion) => sesion.inicio?.getTime())
        .filter(Number.isFinite)
    : [];

  const primeraSesionResultados =
    fechasResultados.length > 0 ? Math.min(...fechasResultados) : null;

  // Consultar el resumen de resultados
  useEffect(() => {
    if (!rondaCarrera) {
      setResumenSesiones(null);
      return;
    }

    const controller = new AbortController();

    setResumenSesiones(null);

    async function consultarResultados() {
      // No consultar resultados antes de la
      // primera sesión soportada.
      if (
        primeraSesionResultados !== null &&
        Date.now() < primeraSesionResultados
      ) {
        return;
      }

      try {
        const respuesta = await fetch(
          `/api/resumen-sesiones?temporada=${temporadaCarrera}&ronda=${rondaCarrera}`,
          {
            signal: controller.signal,
          },
        );

        if (!respuesta.ok) {
          throw new Error("No se pudieron consultar los resultados");
        }

        const datos = await respuesta.json();

        if (!controller.signal.aborted) {
          setResumenSesiones(datos);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error cargando resultados:", error.message);
        }
      }
    }

    consultarResultados();

    // Actualizar cada dos minutos
    const intervalo = setInterval(consultarResultados, 120000);

    return () => {
      controller.abort();
      clearInterval(intervalo);
    };
  }, [temporadaCarrera, rondaCarrera, primeraSesionResultados]);

  // Obtener resultados de FP1, FP2, FP3
  // y clasificación Sprint desde OpenF1
  useEffect(() => {
    if (!fechaGP || !carrera) {
      setResumenPracticas(null);
      return;
    }

    const controller = new AbortController();

    setResumenPracticas(null);

    async function consultarPracticas() {
      // Esperar a que los resultados puedan estar disponibles.
      const tiposPractica = [
        "FirstPractice",
        "SecondPractice",
        "ThirdPractice",
        "SprintQualifying",
        "SprintShootout",
      ];

      const momentosConsulta = obtenerSesiones(carrera)
        .filter((sesion) => tiposPractica.includes(sesion.id) && sesion.inicio)
        .map((sesion) => sesion.inicio.getTime() + 105 * 60 * 1000);

      if (momentosConsulta.length === 0) {
        return;
      }

      const inicioConsulta = Math.min(...momentosConsulta);

      if (Date.now() < inicioConsulta) {
        return;
      }

      try {
        const respuesta = await fetch(
          `/api/resumen-practicas?temporada=${temporadaCarrera}&fecha=${fechaGP}`,
          {
            signal: controller.signal,
          },
        );

        if (!respuesta.ok) {
          throw new Error("No se pudieron consultar las prácticas");
        }

        const datos = await respuesta.json();

        if (!controller.signal.aborted) {
          setResumenPracticas(datos);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error cargando prácticas:", error.message);
        }
      }
    }

    consultarPracticas();

    // Actualizar cada dos minutos.
    const intervalo = setInterval(consultarPracticas, 120000);

    return () => {
      controller.abort();
      clearInterval(intervalo);
    };
  }, [temporadaCarrera, fechaGP, carrera]);

  // La lógica de fechas, resultados y consultas permanece igual.
  if (cargando) {
    return (
      <div className={cajaMensaje} role="status">
        <LoaderCircle
          className="mx-auto mb-3 h-6 w-6 animate-spin text-[#e10600]"
          aria-hidden="true"
        />
        Cargando calendario...
      </div>
    );
  }

  if (error) {
    return (
      <div className={cajaMensaje} role="alert">
        <AlertCircle
          className="mx-auto mb-3 h-6 w-6 text-[#e10600]"
          aria-hidden="true"
        />
        No se pudo cargar el calendario de Fórmula 1.
      </div>
    );
  }

  if (!carrera) {
    return (
      <div className={cajaMensaje}>
        <CalendarDays
          className="mx-auto mb-3 h-6 w-6 text-[#e10600]"
          aria-hidden="true"
        />
        No hay próximos Grandes Premios programados.
      </div>
    );
  }

  const sesiones = obtenerSesiones(carrera);
  const proximaSesion = sesiones.find(
    (sesion) => sesion.inicio && sesion.inicio.getTime() > ahora,
  );

  const fechaCarrera =
    crearFechaUTC(carrera.date, carrera.time) ||
    new Date(`${carrera.date}T12:00:00Z`);

  const imagenCircuito = obtenerImagenCircuito(carrera.Circuit?.circuitId);
  const pais = carrera.Circuit?.Location?.country;
  const codigoBandera = BANDERAS[pais];

  // Duraciones ORIENTATIVAS: solo identifican visualmente una sesión posiblemente en curso.
  // No representan telemetría ni confirmación de actividad en directo.
  const minutosEstimados = {
    FirstPractice: 60,
    SecondPractice: 60,
    ThirdPractice: 60,
    SprintQualifying: 45,
    SprintShootout: 45,
    Qualifying: 60,
    Sprint: 45,
    Carrera: 120,
  };

  return (
    <section className="relative isolate w-full min-w-0 overflow-hidden rounded-2xl bg-[#0c0e16] p-3 text-white sm:p-4 xl:p-5">
      {/* El video cubre todo el banner; el contenido queda por encima. */}
      <FondoVideoGP esSemanaCarrera={esSemanaCarrera} />
      <div className="relative z-10 grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.7fr)] xl:gap-6">
        {/* INFORMACIÓN DEL GRAN PREMIO */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${temporadaCarrera}-${rondaCarrera}`}
            initial={reducirMovimiento ? false : { opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducirMovimiento ? undefined : { opacity: 0, x: -10 }}
            transition={{
              duration: reducirMovimiento ? 0 : 0.36,
              ease: "easeOut",
            }}
            className={
              imagenCircuito
                ? "grid min-w-0 grid-rows-2 gap-3"
                : "flex min-w-0 flex-col"
            }
          >
            <div className="rounded-xl border border-white/15 bg-black/45 p-4 backdrop-blur-[3px] sm:p-5">
              <span
                className={`inline-flex w-fit max-w-full items-center gap-2 rounded-full px-4 py-2 font-nav text-sm font-bold uppercase tracking-wider ${
                  esSemanaCarrera
                    ? "bg-[#e10600] text-white"
                    : "border border-white/20 bg-white/10 text-white"
                }`}
              >
                {esSemanaCarrera ? (
                  <Flag className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <CalendarDays
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                )}
                {esSemanaCarrera
                  ? "¡SEMANA DE CARRERA!"
                  : "PRÓXIMO GRAN PREMIO"}
              </span>

              <h2 className="mb-4 mt-4 font-racing text-3xl font-extrabold uppercase italic leading-tight tracking-tight sm:text-4xl xl:text-[2.3rem]">
                {carrera.raceName}
              </h2>

              <div className="flex flex-col gap-3 font-nav text-base font-semibold text-white/85">
                <p className="m-0 flex items-start gap-2">
                  <MapPin
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#e10600]"
                    aria-hidden="true"
                  />
                  <span>
                    {carrera.Circuit?.circuitName || "Circuito por confirmar"}
                  </span>
                </p>

                {pais && (
                  <div className="flex items-center gap-2.5">
                    {codigoBandera ? (
                      <span className="inline-flex h-6 w-6 shrink-0 overflow-hidden rounded-full border border-black/10 dark:border-white/20">
                        <img
                          src={`https://flagcdn.com/w40/${codigoBandera}.png`}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </span>
                    ) : (
                      <MapPin
                        className="h-[18px] w-[18px] shrink-0 text-[#e10600]"
                        aria-hidden="true"
                      />
                    )}
                    <span>{pais}</span>
                  </div>
                )}

                <p className="m-0 flex items-center gap-2">
                  <CalendarDays
                    className="h-[18px] w-[18px] shrink-0 text-[#e10600]"
                    aria-hidden="true"
                  />
                  {fechaCarrera.toLocaleDateString("es-AR", {
                    timeZone: ZONA_ARGENTINA,
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>

                <p className="m-0 flex items-center gap-2">
                  <Clock3
                    className="h-[18px] w-[18px] shrink-0 text-[#e10600]"
                    aria-hidden="true"
                  />
                  <span>
                    {carrera.time
                      ? formatearHora(fechaCarrera)
                      : "Hora por confirmar"}
                    {carrera.time ? " (Argentina)" : ""}
                  </span>
                </p>
              </div>
            </div>

            {imagenCircuito && (
              <div className="relative min-h-0 w-full overflow-hidden rounded-xl border border-white/20 bg-[#121218]/85 shadow-lg">
                <img
                  src={imagenCircuito}
                  alt={`Circuito ${carrera.Circuit?.circuitName}`}
                  className="absolute inset-0 h-full w-full object-contain"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* PROGRAMA DEL FIN DE SEMANA */}
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="m-0 font-racing text-xl font-bold uppercase leading-tight sm:text-2xl">
                Programa del fin de semana
              </h3>
              <p className="mb-0 mt-2 font-nav text-sm font-semibold text-white/75">
                Horarios de Argentina (ART · UTC-3)
              </p>
            </div>

            <span className="inline-flex shrink-0 rounded-full border border-white/20 bg-black/40 px-3 py-1 font-nav text-sm font-semibold text-white/90 backdrop-blur-sm">
              {sesiones.length} sesiones
            </span>
          </div>

          {sesiones.length === 0 ? (
            <div className="rounded-xl border border-white/15 bg-[#151720]/75 p-5 font-nav text-white/75 backdrop-blur-md">
              Todavía no hay horarios de sesiones disponibles.
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {sesiones.map((sesion, indice) => {
                const esProxima = proximaSesion?.id === sesion.id;
                const yaComenzo =
                  sesion.inicio && sesion.inicio.getTime() <= ahora;

                const tiposResultado = {
                  FirstPractice: "fp1",
                  SecondPractice: "fp2",
                  ThirdPractice: "fp3",
                  SprintQualifying: "clasificacion_sprint",
                  SprintShootout: "clasificacion_sprint",
                  Qualifying: "clasificacion",
                  Sprint: "sprint",
                  Carrera: "carrera",
                };

                const tipoResultado = tiposResultado[sesion.id];
                const esResultadoPractica = [
                  "fp1",
                  "fp2",
                  "fp3",
                  "clasificacion_sprint",
                ].includes(tipoResultado);

                const podio = esResultadoPractica
                  ? resumenPracticas?.resultados?.[tipoResultado]
                  : resumenSesiones?.resultados?.[tipoResultado];

                const hayResultados = Boolean(
                  yaComenzo && Array.isArray(podio) && podio.length > 0,
                );
                const esEnCursoEstimado = Boolean(
                  sesion.inicio &&
                  !hayResultados &&
                  yaComenzo &&
                  ahora <
                    sesion.inicio.getTime() +
                      (minutosEstimados[sesion.id] || 60) * 60 * 1000,
                );

                return (
                  <motion.article
                    key={sesion.id}
                    initial={reducirMovimiento ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={reducirMovimiento ? undefined : { y: -3 }}
                    transition={{
                      duration: reducirMovimiento ? 0 : 0.35,
                      delay: reducirMovimiento ? 0 : indice * 0.055,
                      ease: "easeOut",
                    }}
                    className={`relative isolate flex min-w-0 flex-col overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-[border-color,background-color,box-shadow] duration-200 ${columnasSesion(sesiones.length, indice)} ${
                      esProxima
                        ? "border-[#e10600] bg-[#34171f]/85 shadow-[0_0_0_1px_rgba(225,6,0,0.25)] backdrop-blur-[8px]"
                        : "border-white/20 bg-[#181b26]/75 backdrop-blur-[8px] hover:border-[#e10600]/70 hover:bg-[#202431]/85"
                    }`}
                  >
                    {/* Brillo de contorno solo para la próxima sesión, sin tapar el texto. */}
                    {esProxima && !reducirMovimiento && (
                      <motion.span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-0 rounded-xl border-2 border-[#ff655d]"
                        animate={{ opacity: [0.2, 0.75, 0.2] }}
                        transition={{
                          duration: 2.8,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                    <div className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex rounded-md bg-white/15 px-2.5 py-1 font-racing text-xs font-extrabold text-white">
                        {sesion.abreviatura}
                      </span>
                      {esEnCursoEstimado && (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 font-nav text-[10px] font-bold uppercase tracking-wide text-emerald-300"
                          title="Estimación basada en el horario programado; no es transmisión en directo"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                            aria-hidden="true"
                          />
                          EN CURSO · estimado
                        </span>
                      )}
                      {esProxima && (
                        <motion.span
                          initial={
                            reducirMovimiento
                              ? false
                              : { opacity: 0, scale: 0.92 }
                          }
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: reducirMovimiento ? 0 : 0.2 }}
                          className="font-nav text-xs font-extrabold uppercase tracking-wider text-[#ff6762]"
                        >
                          PRÓXIMA
                        </motion.span>
                      )}
                    </div>

                    <h4 className="relative z-10 mb-3 mt-0 font-racing text-sm font-extrabold uppercase leading-snug sm:text-base">
                      {sesion.nombre}
                    </h4>

                    <div className="relative z-10 flex flex-col gap-2 font-nav text-sm font-semibold text-white/85">
                      <span className="flex items-center gap-2">
                        <CalendarDays
                          className="h-4 w-4 shrink-0 text-[#e10600]"
                          aria-hidden="true"
                        />
                        {sesion.inicio
                          ? formatearFecha(sesion.inicio)
                          : sesion.fecha}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock3
                          className="h-4 w-4 shrink-0 text-[#e10600]"
                          aria-hidden="true"
                        />
                        {formatearHora(sesion.inicio)}
                      </span>
                    </div>

                    <div className="relative z-10">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={
                            hayResultados
                              ? "resultados"
                              : !sesion.inicio
                                ? "sin-hora"
                                : esEnCursoEstimado
                                  ? "en-curso-estimado"
                                  : yaComenzo
                                    ? "pendiente"
                                    : "cuenta"
                          }
                          initial={
                            reducirMovimiento ? false : { opacity: 0, y: 5 }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          exit={
                            reducirMovimiento
                              ? undefined
                              : { opacity: 0, y: -5 }
                          }
                          transition={{
                            duration: reducirMovimiento ? 0 : 0.18,
                          }}
                        >
                          {hayResultados ? (
                            <div className="mt-4 border-t border-white/20 pt-3">
                              <p className="m-0 font-nav text-[11px] font-bold uppercase tracking-wider text-white/65">
                                Resultados disponibles
                              </p>
                              <div className="mt-3 flex flex-col gap-2">
                                {podio.map((piloto, puestoIndice) => {
                                  const color =
                                    piloto.color ||
                                    obtenerColorEscuderia(piloto.id_escuderia);

                                  return (
                                    <motion.div
                                      key={
                                        piloto.id_piloto ||
                                        piloto.numero ||
                                        piloto.posicion
                                      }
                                      initial={
                                        reducirMovimiento
                                          ? false
                                          : { opacity: 0, x: -8 }
                                      }
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{
                                        duration: reducirMovimiento ? 0 : 0.22,
                                        delay: reducirMovimiento
                                          ? 0
                                          : puestoIndice * 0.075,
                                      }}
                                      className="flex min-w-0 items-center gap-2 font-nav text-sm"
                                    >
                                      <span className="w-5 shrink-0 font-bold text-white/75">
                                        {piloto.posicion}°
                                      </span>
                                      {piloto.numero != null && (
                                        <span
                                          className="shrink-0 font-extrabold"
                                          style={{ color }}
                                        >
                                          #{piloto.numero}
                                        </span>
                                      )}
                                      <span className="min-w-0 truncate font-bold">
                                        {piloto.nombre}
                                      </span>
                                    </motion.div>
                                  );
                                })}
                              </div>
                              <Link
                                to="/resultados"
                                className="mt-4 inline-flex items-center gap-1.5 font-nav text-sm font-bold text-[#ff7772] no-underline hover:underline"
                              >
                                Ver resultados completos
                                <ArrowRight
                                  className="h-4 w-4 shrink-0"
                                  aria-hidden="true"
                                />
                              </Link>
                            </div>
                          ) : (
                            <div className="mt-4 border-t border-white/20 pt-3">
                              {!sesion.inicio ? (
                                <span className="font-nav text-sm text-white/75">
                                  Horario por confirmar
                                </span>
                              ) : yaComenzo ? (
                                <span className="font-nav text-sm text-white/75">
                                  {esEnCursoEstimado
                                    ? "Sesión en curso (estimado)"
                                    : tipoResultado
                                      ? "Resultados pendientes"
                                      : "Inicio transcurrido"}
                                </span>
                              ) : (
                                <>
                                  <span className="block font-nav text-[11px] font-bold uppercase tracking-wider text-white/65">
                                    Comienza en
                                  </span>
                                  <strong className="mt-1 block font-racing text-base font-extrabold text-[#ff4545] sm:text-lg">
                                    {calcularCuentaRegresiva(
                                      sesion.inicio.getTime() - ahora,
                                    )}
                                  </strong>
                                </>
                              )}
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default RaceWeekBanner;
