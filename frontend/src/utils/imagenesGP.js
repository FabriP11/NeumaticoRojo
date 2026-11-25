// Fondos PNG guardados en frontend/public/circuitos/calendario/.
// Preferimos identificar el circuito, ya que puede haber varios GP en un mismo país.
const FONDOS_POR_CIRCUITO = {
  albert_park: "australiagp",
  shanghai: "chinagp",
  suzuka: "japongp",
  miami: "miamigp",
  villeneuve: "canadagp",
  monaco: "monacogp",
  catalunya: "barcelonagp",
  red_bull_ring: "austriagp",
  silverstone: "granbretañagp",
  spa: "belgicagp",
  hungaroring: "hungriagp",
  zandvoort: "holandagp",
  monza: "monzagp",
  baku: "bakugp",
  marina_bay: "singapurgp",
  americas: "usagp",
  rodriguez: "mexicogp",
  interlagos: "brasilgp",
  losail: "catargp",
  yas_marina: "dubaigp",
  vegas: "vegasgp",
  las_vegas: "vegasgp",
  madring: "madringgp",
  madrid: "madringgp",
  sepang: "malasyagp",
};

export function obtenerImagenFondoGP(carrera) {
  const id = String(carrera.Circuit?.circuitId || "").toLowerCase();
  const nombre = String(carrera.raceName || "").toLowerCase();
  const pais = String(carrera.Circuit?.Location?.country || "").toLowerCase();

  let archivo = FONDOS_POR_CIRCUITO[id];

  // Alternativa para nombres de circuito que puedan variar según la API.
  if (!archivo) {
    if (nombre.includes("miami")) archivo = "miamigp";
    else if (nombre.includes("las vegas")) archivo = "vegasgp";
    else if (nombre.includes("madrid")) archivo = "madringgp";
    else if (nombre.includes("barcelona") || nombre.includes("catalunya"))
      archivo = "barcelonagp";
    else if (nombre.includes("abu dhabi")) archivo = "dubaigp";
    else if (nombre.includes("são paulo") || nombre.includes("sao paulo"))
      archivo = "brasilgp";
    else if (nombre.includes("emilia romagna"))
      archivo = null; // No usar Monza para Imola.
    else if (nombre.includes("italian")) archivo = "monzagp";
    else if (nombre.includes("australian")) archivo = "australiagp";
    else if (nombre.includes("austrian")) archivo = "austriagp";
    else if (nombre.includes("belgian")) archivo = "belgicagp";
    else if (nombre.includes("brazilian")) archivo = "brasilgp";
    else if (nombre.includes("canadian")) archivo = "canadagp";
    else if (nombre.includes("chinese")) archivo = "chinagp";
    else if (nombre.includes("japanese")) archivo = "japongp";
    else if (nombre.includes("mexico")) archivo = "mexicogp";
    else if (nombre.includes("monaco")) archivo = "monacogp";
    else if (nombre.includes("dutch")) archivo = "holandagp";
    else if (nombre.includes("hungarian")) archivo = "hungriagp";
    else if (nombre.includes("british")) archivo = "granbretañagp";
    else if (nombre.includes("azerbaijan")) archivo = "bakugp";
    else if (nombre.includes("singapore")) archivo = "singapurgp";
    else if (nombre.includes("qatar")) archivo = "catargp";
    else if (nombre.includes("malaysian")) archivo = "malasyagp";
    else if (nombre.includes("spanish")) archivo = "barcelonagp";
    else if (nombre.includes("united states")) archivo = "usagp";
  }

  // Último recurso: países con un único fondo disponible.
  if (!archivo) {
    const fondosPorPais = {
      australia: "australiagp",
      china: "chinagp",
      japan: "japongp",
      canada: "canadagp",
      monaco: "monacogp",
      austria: "austriagp",
      belgium: "belgicagp",
      hungary: "hungriagp",
      netherlands: "holandagp",
      "great britain": "granbretañagp",
      uk: "granbretañagp",
      azerbaijan: "bakugp",
      singapore: "singapurgp",
      qatar: "catargp",
      malaysia: "malasyagp",
      mexico: "mexicogp",
      brazil: "brasilgp",
      "united arab emirates": "dubaigp",
      uae: "dubaigp",
    };
    archivo = fondosPorPais[pais];
  }

  return archivo ? `/circuitos/calendario/${archivo}.png` : null;
}
