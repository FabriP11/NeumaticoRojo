// NeumaticoRojo — controlador clasificaciones.
const model = require('../models/clasificaciones')
const consultarJolpica = require('../services/jolpicaCache')

const obtenerClasificaciones = async (req, res) => {
  try {
    // Temporada seleccionada
    const temporada = req.query.temporada || 'current'

    // Validar la temporada
    if (temporada !== 'current' && !/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    // URLs de Jolpica
    const urlPilotos = `https://api.jolpi.ca/ergast/f1/${temporada}/driverstandings.json?limit=100`

    const urlConstructores = `https://api.jolpi.ca/ergast/f1/${temporada}/constructorstandings.json?limit=100`

    // Consultar ambas clasificaciones
    const [respuestaPilotos, respuestaConstructores] = await Promise.all([
      consultarJolpica(urlPilotos),
      consultarJolpica(urlConstructores)
    ])

    // Verificar las respuestas
    if (!respuestaPilotos.ok || !respuestaConstructores.ok) {
      throw new Error('Error al consultar las clasificaciones')
    }

    // Convertir las respuestas a JSON
    const [datosPilotos, datosConstructores] = await Promise.all([
      respuestaPilotos.json(),
      respuestaConstructores.json()
    ])

    // Extraer los datos
    const pilotos =
      datosPilotos.MRData.StandingsTable.StandingsLists?.[0]?.DriverStandings ||
      []

    const constructores =
      datosConstructores.MRData.StandingsTable.StandingsLists?.[0]
        ?.ConstructorStandings || []

    // Enviar los datos a React
    res.json({
      temporada,
      pilotos,
      constructores
    })
  } catch (error) {
    console.error('Error en clasificaciones:', error.message)

    res.status(502).json({
      mensaje: 'No se pudieron obtener las clasificaciones'
    })
  }
}

const tablasInicio = async (req, res) => {
  try {
    const temporada = String(req.query.temporada || '2026')

    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    // Top 10 de pilotos

    const [pilotos] = await model.topPilotos(temporada)

    // Top 10 de escuderías
    const [escuderias] = await model.topEscuderias(temporada)

    res.json({
      temporada,
      pilotos: pilotos.map(p => ({
        ...p,
        puntos: Number(p.puntos)
      })),
      escuderias: escuderias.map(e => ({
        ...e,
        puntos: Number(e.puntos)
      }))
    })
  } catch (error) {
    console.error('Error al cargar tablas del inicio:', error.message)

    res.status(500).json({
      mensaje: 'No se pudieron cargar las clasificaciones'
    })
  }
}

const dorsalesTemporada = async (req, res) => {
  try {
    const temporada = String(req.query.temporada || '2026')

    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    const [filas] = await model.dorsales(temporada)

    const pilotos = {}

    for (const fila of filas) {
      // Si un piloto estuvo en varios equipos,
      // conservamos su última participación registrada.
      if (!Object.hasOwn(pilotos, fila.id_piloto)) {
        pilotos[fila.id_piloto] = {
          numero: fila.numero,
          id_escuderia: fila.id_escuderia
        }
      }
    }

    res.json({
      temporada,
      pilotos
    })
  } catch (error) {
    console.error('Error al consultar dorsales:', error.message)

    res.status(500).json({
      mensaje: 'No se pudieron consultar los dorsales'
    })
  }
}

module.exports = { obtenerClasificaciones, tablasInicio, dorsalesTemporada }
