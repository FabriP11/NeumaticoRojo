import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";

// Los nombres corresponden a frontend/public/pilotos/*.avif.
// Agregá nuevas entradas aquí cuando incorpores más fotografías.
const ARCHIVOS_PILOTOS = {
  albon: "albon",
  alonso: "alonso",
  lindblad: "arvid",
  arvid: "arvid",
  bottas: "bottas",
  camara: "camara",
  leclerc: "charles",
  charles: "charles",
  perez: "checo",
  checo: "checo",
  colapinto: "franco",
  franco: "franco",
  bortoleto: "gabriel",
  gabriel: "gabriel",
  gasly: "gasly",
  russell: "george",
  george: "george",
  hadjar: "isaak",
  isaack: "isaak",
  isaak: "isaak",
  antonelli: "kimi",
  kimi: "kimi",
  stroll: "lance",
  lance: "lance",
  norris: "lando",
  lando: "lando",
  hamilton: "lewis",
  lewis: "lewis",
  lawson: "liam",
  liam: "liam",
  verstappen: "max",
  max: "max",
  hulkenberg: "nico",
  nico: "nico",
  bearman: "oliver",
  oliver: "oliver",
  piastri: "oscar",
  oscar: "oscar",
  sainz: "sainz",
  carlos: "sainz",
  ocon: "ocon",
  hirakawa: "hirakawa",
  tsunoda: "tsunoda",
};

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ");
}

export function obtenerArchivoPiloto(idPiloto, nombre) {
  // Se prioriza el identificador de la API; los datos de MySQL
  // también pueden traer un ID numérico y el nombre completo.
  for (const valor of [idPiloto, nombre]) {
    const clave = normalizar(valor);
    if (ARCHIVOS_PILOTOS[clave]) return ARCHIVOS_PILOTOS[clave];

    for (const palabra of clave.split(" ")) {
      if (ARCHIVOS_PILOTOS[palabra]) return ARCHIVOS_PILOTOS[palabra];
    }
  }
  return null;
}

const TAMANOS = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

/**
 * Foto circular con fondo del color de la escudería.
 * Muestra fotos únicamente para 2026. Si falta el archivo,
 * conserva el círculo con una silueta, sin romper la página.
 */
function FotoPiloto({
  idPiloto,
  nombre,
  colorEquipo = "#475569",
  temporada = "2026",
  tamano = "sm",
  className = "",
}) {
  const archivo =
    String(temporada) === "2026"
      ? obtenerArchivoPiloto(idPiloto, nombre)
      : null;
  const [imagenFallida, setImagenFallida] = useState(false);

  useEffect(() => {
    setImagenFallida(false);
  }, [archivo]);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 shadow-sm ring-1 ring-black/5 dark:border-white/20 dark:ring-white/10 ${TAMANOS[tamano] || TAMANOS.sm} ${className}`}
      style={{
        backgroundColor: colorEquipo || "#475569",
        backgroundImage:
          "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.26), transparent 58%), linear-gradient(150deg, transparent 35%, rgba(0,0,0,0.32) 100%)",
      }}
      aria-hidden="true"
    >
      {archivo && !imagenFallida && (
        <img
          key={archivo}
          src={`/pilotos/2026/${archivo}.avif`}
          alt=""
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover ${
            archivo === "hirakawa"
              ? "scale-[3.3] object-[center_-66%]"
              : archivo === "tsunoda"
                ? "scale-[1.9] object-[center_-16%]"
                : "scale-[2] object-[center_-13%]"
          }`}
          onError={() => setImagenFallida(true)}
        />
      )}
      {/* Relieve sutil sobre el retrato sin ocultar el color de la escudería. */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.09) 0%, transparent 42%, rgba(0,0,0,0.22) 100%)",
          boxShadow:
            "inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -3px 7px rgba(0,0,0,0.22)",
        }}
        aria-hidden="true"
      />
    </span>
  );
}

export default FotoPiloto;
