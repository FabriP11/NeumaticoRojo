const imagenesCircuitos = {
  americas: '/circuitos/americas.avif',
  albert_park: '/circuitos/albert_park.avif',
  shanghai: '/circuitos/shanghai.avif',
  suzuka: '/circuitos/suzuka.avif',
  miami: '/circuitos/miami.avif',
  villeneuve: '/circuitos/villeneuve.avif',
  monaco: '/circuitos/monaco.avif',
  catalunya: '/circuitos/catalunya.avif',
  red_bull_ring: '/circuitos/red_bull_ring.avif',
  silverstone: '/circuitos/silverstone.avif',
  spa: '/circuitos/spa.avif',
  hungaroring: '/circuitos/hungaroring.avif',
  zandvoort: '/circuitos/zandvoort.avif',
  monza: '/circuitos/monza.avif',
  madrid: '/circuitos/madrid.avif',
  baku: '/circuitos/baku.avif',
  marina_bay: '/circuitos/marina_bay.avif',
  yas_marina: '/circuitos/yas_marina.avif',
  rodriguez: '/circuitos/rodriguez.avif',
  interlagos: '/circuitos/interlagos.avif',
  vegas: '/circuitos/vegas.avif',
  losail: '/circuitos/losail.avif',
  jeddah: '/circuitos/jeddah.avif'
}

export function obtenerImagenCircuito (circuitId) {
  return imagenesCircuitos[circuitId] || null
}
