// NeumaticoRojo — controlador escuderias.
const consultarJolpica = require('../services/jolpicaCache')

const obtenerEscuderia = async (req, res) => {
  try {
    // Obtener el identificador de la escudería
    const id = req.params.id

    // Obtener la temporada seleccionada
    const temporada = req.query.temporada || '2026'

    // Validar identificador
    if (!/^[a-z0-9_]+$/i.test(id)) {
      return res.status(400).json({
        mensaje: 'Identificador de escudería inválido'
      })
    }

    // Validar temporada
    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    const base = 'https://api.jolpi.ca/ergast/f1'

    // Consultar información de la escudería,
    // sus pilotos y su clasificación
    const [respuestaEscuderia, respuestaPilotos, respuestaClasificacion] =
      await Promise.all([
        consultarJolpica(`${base}/${temporada}/constructors/${id}.json`),
        consultarJolpica(`${base}/${temporada}/constructors/${id}/drivers.json?limit=100`),
        consultarJolpica(
          `${base}/${temporada}/constructors/${id}/constructorstandings.json`
        )
      ])

    // Verificar las respuestas
    if (
      !respuestaEscuderia.ok ||
      !respuestaPilotos.ok ||
      !respuestaClasificacion.ok
    ) {
      throw new Error('Error al consultar Jolpica')
    }

    // Convertir las respuestas a JSON
    const [datosEscuderia, datosPilotos, datosClasificacion] =
      await Promise.all([
        respuestaEscuderia.json(),
        respuestaPilotos.json(),
        respuestaClasificacion.json()
      ])

    // Información principal de la escudería
    const escuderia = datosEscuderia.MRData.ConstructorTable.Constructors?.[0]

    if (!escuderia) {
      return res.status(404).json({
        mensaje: 'Escudería no encontrada en esta temporada'
      })
    }

    // Pilotos de esa escudería en la temporada
    const pilotos = datosPilotos.MRData.DriverTable.Drivers || []

    // Posición, puntos y victorias
    const clasificacion =
      datosClasificacion.MRData.StandingsTable.StandingsLists?.[0]
        ?.ConstructorStandings?.[0] || null

    // Devolver la información a React
    res.json({
      escuderia,
      temporada,
      pilotos,
      clasificacion
    })
  } catch (error) {
    console.error('Error al obtener escudería:', error.message)

    res.status(502).json({
      mensaje: 'No se pudo obtener la información de la escudería'
    })
  }
}

module.exports = { obtenerEscuderia }
