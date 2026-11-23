// Neumático Rojo - horarios UTC de sesiones (independiente de React).
const SESIONES = [
  ['FirstPractice', 'fp1', 'Práctica libre 1'],
  ['SecondPractice', 'fp2', 'Práctica libre 2'],
  ['ThirdPractice', 'fp3', 'Práctica libre 3'],
  ['SprintQualifying', 'clasificacion_sprint', 'Clasificación Sprint'],
  ['SprintShootout', 'clasificacion_sprint', 'Clasificación Sprint'],
  ['Sprint', 'sprint', 'Carrera Sprint'],
  ['Qualifying', 'clasificacion', 'Clasificación'],
  ['Carrera', 'carrera', 'Carrera']
]

function fechaUTC (fecha, hora) {
  if (typeof fecha !== 'string' || typeof hora !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null
  const h = hora.trim()
  if (!/^\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})?$/i.test(h)) return null
  const cadena = `${fecha}T${/(?:Z|[+-]\d{2}:\d{2})$/i.test(h) ? h : h + 'Z'}`
  const fechaObj = new Date(cadena)
  return Number.isFinite(fechaObj.getTime()) ? fechaObj : null
}

function sesionesCalendario (carreras) {
  const resultado = []
  for (const carrera of carreras || []) {
    if (!/^\d{4}$/.test(String(carrera.season)) || !/^\d+$/.test(String(carrera.round))) continue
    for (const [clave, tipo, nombre] of SESIONES) {
      if (clave === 'SprintShootout' && carrera.SprintQualifying) continue
      const datos = clave === 'Carrera' ? carrera : carrera[clave]
      const inicio = fechaUTC(datos?.date, datos?.time)
      if (!inicio) continue
      resultado.push({
        temporada: Number(carrera.season), ronda: Number(carrera.round),
        gp: String(carrera.raceName || 'Gran Premio'), tipo, nombre,
        inicio
      })
    }
  }
  return resultado.sort((a, b) => a.inicio - b.inicio)
}

// Tiempo para envío: nunca adelantar y no enviar pasados más de 90 s del objetivo.
function avisoPendiente (inicio, minutos, ahora, margenMs = 90000) {
  if (![5, 10].includes(minutos)) return false
  const objetivo = inicio.getTime() - minutos * 60000
  const actual = ahora.getTime()
  return actual >= objetivo && actual <= objetivo + margenMs && actual < inicio.getTime()
}

module.exports = { fechaUTC, sesionesCalendario, avisoPendiente }
