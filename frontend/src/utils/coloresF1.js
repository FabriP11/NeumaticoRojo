const coloresEscuderias = {
  ferrari: '#E8002D',
  mclaren: '#FF8700',
  mercedes: '#27F4D2',
  red_bull: '#3671C6',
  red_bull_racing: '#3671C6',
  aston_martin: '#229971',
  alpine: '#FF87BC',
  alpine_f1: '#FF87BC',
  williams: '#64C4FF',
  haas: '#B6BABD',
  haas_f1: '#B6BABD',
  rb: '#6692FF',
  racing_bulls: '#6692FF',
  alpha_tauri: '#6692FF',
  sauber: '#52E252',
  audi: '#F24A53',
  cadillac: '#D8DCE5',
  renault: '#FFF500',
  alphatauri: '#6692FF',
  toro_rosso: '#469BFF',
  racing_point: '#F596C8',
  force_india: '#F596C8',
  alfa: '#900000'
}

export function obtenerColorEscuderia (idEscuderia) {
  if (!idEscuderia) {
    return '#999BA6'
  }

  return coloresEscuderias[String(idEscuderia).toLowerCase()] || '#999BA6'
}
