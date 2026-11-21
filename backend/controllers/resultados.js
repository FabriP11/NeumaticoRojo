// NeumaticoRojo — controlador resultados.
const consultarJolpica = require('../services/jolpicaCache')
const consultarOpenF1 = require('../services/openF1')

const obtenerResultados = async (req, res) => {
  try {
    // Obtener temporada y ronda seleccionadas
    const temporada = req.query.temporada || '2026'
    const ronda = req.query.ronda || '1'

    // Validar los parámetros
    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    if (!/^\d+$/.test(ronda) || Number(ronda) < 1) {
      return res.status(400).json({
        mensaje: 'Ronda inválida'
      })
    }

    // Consultar resultados en Jolpica
    const respuesta = await consultarJolpica(
      `https://api.jolpi.ca/ergast/f1/${temporada}/${ronda}/results.json?limit=100`,
      {
        headers: {
          'User-Agent': 'NeumaticoRojo/0.1'
        }
      }
    )

    if (!respuesta.ok) {
      throw new Error('Error al consultar Jolpica')
    }

    const datos = await respuesta.json()

    // Obtener el Gran Premio
    const carrera = datos.MRData.RaceTable.Races?.[0]

    if (!carrera) {
      return res.status(404).json({
        mensaje: 'No hay resultados disponibles para esta carrera'
      })
    }

    // Enviar los resultados a React
    res.json({
      temporada,
      ronda,
      nombre: carrera.raceName,
      circuito: carrera.Circuit,
      fecha: carrera.date,
      resultados: carrera.Results || []
    })
  } catch (error) {
    console.error('Error al obtener resultados:', error.message)

    res.status(502).json({
      mensaje: 'No se pudieron obtener los resultados'
    })
  }
}

const obtenerResultadosSesion = async (req, res) => {
  try {
    const temporada = req.query.temporada || '2026'
    const ronda = req.query.ronda || '1'
    const tipo = req.query.tipo || 'clasificacion'

    // Validar temporada
    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    // Validar ronda
    if (!/^[1-9]\d*$/.test(ronda)) {
      return res.status(400).json({
        mensaje: 'Ronda inválida'
      })
    }

    // Validar tipo de sesión
    if (!['clasificacion', 'sprint'].includes(tipo)) {
      return res.status(400).json({
        mensaje: 'Tipo de sesión inválido'
      })
    }

    // Elegir el endpoint de Jolpica
    const endpoint = tipo === 'clasificacion' ? 'qualifying' : 'sprint'

    const url = `https://api.jolpi.ca/ergast/f1/${temporada}/${ronda}/${endpoint}.json?limit=100`

    // Consultar la API externa
    const respuesta = await consultarJolpica(url, {
      headers: {
        'User-Agent': 'NeumaticoRojo/0.1'
      }
    })

    if (!respuesta.ok) {
      throw new Error('Error al consultar Jolpica')
    }

    const datos = await respuesta.json()

    // Obtener la carrera
    const carrera = datos.MRData.RaceTable.Races?.[0]

    if (!carrera) {
      return res.status(404).json({
        mensaje: `No hay resultados de ${tipo} disponibles`
      })
    }

    // Extraer resultados según la sesión
    const resultados =
      tipo === 'clasificacion'
        ? carrera.QualifyingResults || []
        : carrera.SprintResults || []

    if (resultados.length === 0) {
      return res.status(404).json({
        mensaje: `No hay resultados de ${tipo} disponibles`
      })
    }

    // Enviar los datos a React
    res.json({
      temporada,
      ronda,
      tipo,
      nombre: carrera.raceName,
      circuito: carrera.Circuit,
      fecha: carrera.date,
      resultados
    })
  } catch (error) {
    console.error('Error al obtener resultados de sesión:', error.message)

    res.status(502).json({
      mensaje: 'No se pudieron obtener los resultados'
    })
  }
}

// Las prácticas y la clasificación Sprint no existen en Jolpica clásico.
// Usamos OpenF1 una vez finalizada la sesión (históricos desde 2023).
const TIPOS_OPENF1 = {
  fp1: ['Practice 1'],
  fp2: ['Practice 2'],
  fp3: ['Practice 3'],
  clasificacion_sprint: ['Sprint Qualifying', 'Sprint Shootout']
}

// Cachés pequeñas en memoria para no agotar las peticiones gratuitas.
const cacheSesionesPorTemporada = new Map()
const cacheResultadosPractica = new Map()

async function consultarSesionesTemporada(temporada) {
  const anterior = cacheSesionesPorTemporada.get(temporada)
  if (anterior && anterior.expira > Date.now()) return anterior.sesiones

  try {
    const sesiones = await consultarOpenF1(`sessions?year=${temporada}`)
    if (!Array.isArray(sesiones)) throw new Error('Formato de sesiones inválido')

    const historica = temporada < new Date().getUTCFullYear()
    cacheSesionesPorTemporada.set(temporada, {
      sesiones,
      expira: Date.now() + (historica ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000)
    })
    return sesiones
  } catch (error) {
    // Si OpenF1 falla un instante, conservar una lista antigua válida.
    if (anterior?.sesiones) return anterior.sesiones
    throw error
  }
}

function tiempoVuelta(segundos) {
  if (segundos === null || segundos === undefined || segundos === '') return null
  const numero = Number(segundos)
  if (!Number.isFinite(numero) || numero <= 0) return null
  const totalMs = Math.round(numero * 1000)
  const minutos = Math.floor(totalMs / 60000)
  const resto = ((totalMs % 60000) / 1000).toFixed(3).padStart(6, '0')
  return `${minutos}:${resto}`
}

function diferenciaPiloto(diferencia) {
  if (diferencia === null || diferencia === undefined) return null
  if (typeof diferencia === 'number' && Number.isFinite(diferencia)) {
    return diferencia === 0 ? 'Líder' : `+${diferencia.toFixed(3)} s`
  }
  if (typeof diferencia === 'string') return diferencia
  return null
}

const obtenerResultadosPractica = async (req, res) => {
  const temporada = String(req.query.temporada || '2026')
  const ronda = String(req.query.ronda || '1')
  const tipo = String(req.query.tipo || '')

  if (!/^\d{4}$/.test(temporada) || !/^[1-9]\d*$/.test(ronda) || !TIPOS_OPENF1[tipo]) {
    return res.status(400).json({ mensaje: 'Temporada, ronda o sesión inválida' })
  }

  if (Number(temporada) < 2023) {
    return res.status(404).json({
      mensaje: 'OpenF1 no dispone de resultados de prácticas anteriores a 2023'
    })
  }

  const claveCache = `${temporada}-${ronda}-${tipo}`
  const guardado = cacheResultadosPractica.get(claveCache)
  if (guardado && guardado.expira > Date.now()) return res.json(guardado.datos)

  try {
    // Obtener metadatos del GP correcto por temporada y ronda (Jolpica).
    const respuestaGP = await consultarJolpica(
      `https://api.jolpi.ca/ergast/f1/${temporada}/${ronda}.json?limit=1`,
      { headers: { 'User-Agent': 'NeumaticoRojo/0.1' } }
    )
    if (!respuestaGP.ok) throw new Error('Jolpica no respondió correctamente')
    const datosGP = await respuestaGP.json()
    const gp = datosGP.MRData?.RaceTable?.Races?.[0]
    if (!gp) return res.status(404).json({ mensaje: 'Gran Premio no encontrado' })

    const sesiones = await consultarSesionesTemporada(Number(temporada))
    const fechaReferencia = Date.parse(`${gp.date}T12:00:00Z`)
    if (!Number.isFinite(fechaReferencia)) throw new Error('Fecha del GP inválida')

    // En OpenF1 no hay número de ronda; vinculamos el fin de semana por
    // la fecha de la carrera, como ya hacemos en resumenes.js.
    const carreraOpenF1 = sesiones
      .filter(s => s.session_name === 'Race' && !s.is_cancelled)
      .filter(s => Number.isFinite(Date.parse(s.date_start)))
      .sort((a, b) =>
        Math.abs(Date.parse(a.date_start) - fechaReferencia) -
        Math.abs(Date.parse(b.date_start) - fechaReferencia)
      )[0]

    if (!carreraOpenF1 ||
      Math.abs(Date.parse(carreraOpenF1.date_start) - fechaReferencia) > 36 * 60 * 60 * 1000) {
      return res.status(404).json({ mensaje: 'Sesiones de ese Gran Premio no disponibles en OpenF1' })
    }

    const sesion = sesiones.find(s =>
      s.meeting_key === carreraOpenF1.meeting_key &&
      TIPOS_OPENF1[tipo].includes(s.session_name) &&
      !s.is_cancelled
    )

    if (!sesion) return res.status(404).json({ mensaje: 'Esa sesión no se disputó o no está disponible' })

    // Los datos de la sesión en directo son pagos. Nunca consultarlos antes
    // del final más un margen de 45 minutos (misma regla que resumenes.js).
    const fin = Date.parse(sesion.date_end)
    if (!Number.isFinite(fin) || Date.now() < fin + 45 * 60 * 1000) {
      return res.status(404).json({ mensaje: 'Los resultados de esta sesión aún no están disponibles' })
    }

    const posiciones = await consultarOpenF1(`session_result?session_key=${sesion.session_key}`)
    if (!Array.isArray(posiciones)) throw new Error('Formato de posiciones inválido')
    if (!posiciones.length) return res.status(404).json({ mensaje: 'Todavía no hay resultados publicados' })

    // Espaciar consultas para respetar el límite gratuito de OpenF1.
    await new Promise(resolve => setTimeout(resolve, 400))
    const pilotos = await consultarOpenF1(`drivers?session_key=${sesion.session_key}`)
    if (!Array.isArray(pilotos)) throw new Error('Formato de pilotos inválido')
    const pilotosPorNumero = new Map(pilotos.map(p => [Number(p.driver_number), p]))

    const resultados = posiciones
      .filter(p => Number.isInteger(Number(p.driver_number)) && Number(p.driver_number) > 0)
      .map(fila => {
        const numero = Number(fila.driver_number)
        const piloto = pilotosPorNumero.get(numero)
        const posicion = fila.position == null ? null : Number(fila.position)
        const duraciones = Array.isArray(fila.duration) ? fila.duration : []
        const colorOriginal = piloto?.team_colour || ''
        return {
          numero,
          position: Number.isInteger(posicion) && posicion > 0 ? posicion : null,
          positionText: fila.dsq ? 'DSQ' : (posicion == null ? '—' : String(posicion)),
          nombre: piloto?.full_name || `Piloto #${numero}`,
          escuderia: piloto?.team_name || 'Equipo no disponible',
          color: /^[0-9a-fA-F]{6}$/.test(colorOriginal) ? `#${colorOriginal}` : null,
          mejorVuelta: tiempoVuelta(fila.duration),
          diferencia: diferenciaPiloto(fila.gap_to_leader),
          vueltas: Number.isInteger(fila.number_of_laps) ? fila.number_of_laps : null,
          sq1: tiempoVuelta(duraciones[0]),
          sq2: tiempoVuelta(duraciones[1]),
          sq3: tiempoVuelta(duraciones[2])
        }
      })
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))

    if (!resultados.length) return res.status(404).json({ mensaje: 'No hay resultados válidos para esta sesión' })

    const datos = {
      temporada,
      ronda,
      tipo,
      nombre: gp.raceName,
      circuito: gp.Circuit,
      fecha: sesion.date_start?.slice(0, 10) || gp.date,
      fuente: 'OpenF1',
      resultados
    }

    const historica = Number(temporada) < new Date().getUTCFullYear()
    cacheResultadosPractica.set(claveCache, {
      datos,
      expira: Date.now() + (historica ? 24 * 60 * 60 * 1000 : 10 * 60 * 1000)
    })
    return res.json(datos)
  } catch (error) {
    console.error('Error al obtener prácticas desde OpenF1:', error.message)
    return res.status(502).json({ mensaje: 'No se pudieron obtener los resultados de la práctica' })
  }
}

module.exports = { obtenerResultados, obtenerResultadosSesion, obtenerResultadosPractica }
