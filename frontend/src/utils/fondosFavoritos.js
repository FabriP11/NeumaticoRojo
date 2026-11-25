// Nombres de las fotografías dentro de public/images/inicio/favoritos/.
// Los identificadores provienen de MySQL/Jolpica, no del nombre mostrado.
const FOTOS_PILOTOS = {
  norris: 'lando_norris',
  piastri: 'oscar_piastri',
  russell: 'george_russell',
  antonelli: 'kimi_antonelli',
  leclerc: 'charles_leclerc',
  hamilton: 'lewis_hamilton',
  verstappen: 'max_verstappen',
  hadjar: 'isack_hadjar',
  lawson: 'liam_lawson',
  lindblad: 'arvid_lindblad',
  sainz: 'carlos_sainz',
  albon: 'alexander_albon',
  alonso: 'fernando_alonso',
  stroll: 'lance_stroll',
  gasly: 'pierre_gasly',
  colapinto: 'franco_colapinto',
  ocon: 'esteban_ocon',
  bearman: 'oliver_bearman',
  hulkenberg: 'nico_hulkenberg',
  bortoleto: 'gabriel_bortoleto',
  perez: 'sergio_perez',
  bottas: 'valtteri_bottas'
}

const FOTOS_ESCUDERIAS = {
  mclaren: 'mclaren',
  mercedes: 'mercedes',
  ferrari: 'ferrari',
  red_bull: 'red_bull',
  red_bull_racing: 'red_bull',
  rb: 'racing_bulls',
  racing_bulls: 'racing_bulls',
  williams: 'williams',
  aston_martin: 'aston_martin',
  alpine: 'alpine',
  haas: 'haas',
  sauber: 'audi',
  audi: 'audi',
  cadillac: 'cadillac'
}

function nombreArchivo (texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export function fondoPiloto (piloto) {
  if (!piloto?.id) return null
  const archivo = FOTOS_PILOTOS[piloto.id] || nombreArchivo(piloto.nombre)
  return `/images/inicio/favoritos/pilotos/${archivo}.avif`
}

export function fondoEscuderia (escuderia) {
  if (!escuderia?.id) return null
  const archivo =
    FOTOS_ESCUDERIAS[escuderia.id] || nombreArchivo(escuderia.nombre)
  return `/images/inicio/favoritos/escuderias/${archivo}.avif`
}
