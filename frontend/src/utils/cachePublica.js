// Únicamente consultas públicas. Nunca persistir sesión, datos privados ni mutaciones.
export const MINUTO = 60 * 1000;
export const HORA = 60 * MINUTO;
export const DIA = 24 * HORA;
export const VIDA_CACHE = 20 * DIA;
export const META_PUBLICA = { persist: true };

export function esTemporadaHistorica(temporada) {
  return Number(temporada) < new Date().getFullYear();
}

// Conserva los resultados de CADA ronda, incluso durante 2026, una vez
// terminada la carrera. El margen evita congelar datos durante una demora
// de publicación; solo persistimos consultas con datos válidos.
export function esGPConsolidado(carrera) {
  if (!carrera?.date) return false;
  const hora = String(carrera.time || "").trim();
  const horaUTC = hora
    ? /(?:Z|[+-]\d{2}:\d{2})$/i.test(hora) ? hora : `${hora}Z`
    : "23:59:59Z";
  const salida = Date.parse(`${carrera.date}T${horaUTC}`);
  return Number.isFinite(salida) && Date.now() > salida + 6 * HORA;
}

export function vigenciaCalendario(temporada) {
  return esTemporadaHistorica(temporada) ? Infinity : 6 * HORA;
}
