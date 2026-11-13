const imagenesCircuitos = {
  americas: '/circuitos/americas.png',
  albert_park: '/circuitos/albert_park.png',
  shanghai: '/circuitos/shanghai.png',
  suzuka: '/circuitos/suzuka.png',
  miami: '/circuitos/miami.png',
  villeneuve: '/circuitos/villeneuve.png',
  monaco: '/circuitos/monaco.png',
  catalunya: '/circuitos/catalunya.png',
  red_bull_ring: '/circuitos/red_bull_ring.png',
  silverstone: '/circuitos/silverstone.png',
  spa: '/circuitos/spa.png',
  hungaroring: '/circuitos/hungaroring.png',
  zandvoort: '/circuitos/zandvoort.png',
  monza: '/circuitos/monza.png',
  madrid: '/circuitos/madrid.png',
  baku: '/circuitos/baku.png',
  marina_bay: '/circuitos/marina_bay.png',
  yas_marina: '/circuitos/yas_marina.png',
  rodriguez: '/circuitos/rodriguez.png',
  interlagos: '/circuitos/interlagos.png',
  vegas: '/circuitos/vegas.png',
  losail: '/circuitos/losail.png',
  jeddah: '/circuitos/jeddah.png'
}

export function obtenerImagenCircuito (circuitId) {
  return imagenesCircuitos[circuitId] || null
}
