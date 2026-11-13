// NeumaticoRojo — controlador calendario.
const consultarJolpica = require('../services/jolpicaCache')

const obtenerCarreras = async (req, res) => {
  try {
    // Obtener la temporada solicitada
    const temporada = req.query.temporada || 'current'

    // Validar el año recibido
    if (temporada !== 'current' && !/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    // Consultar Jolpica
    const respuesta = await consultarJolpica(
      `https://api.jolpi.ca/ergast/f1/${temporada}.json?limit=100`,
      {
        headers: {
          'User-Agent': 'NeumaticoRojo/0.1'
        }
      }
    )

    console.log('Jolpica HTTP:', respuesta.status)
    console.log('Retry-After:', respuesta.headers.get('retry-after'))

    if (!respuesta.ok) {
      throw new Error('Error al consultar Jolpica')
    }

    const datos = await respuesta.json()

    // Obtener las carreras de la temporada
    const carreras = datos.MRData.RaceTable.Races

    res.json({
      temporada: temporada,
      carreras: carreras
    })
  } catch (error) {
    console.error(error.message)

    res.status(502).json({
      mensaje: 'No se pudo obtener el calendario'
    })
  }
}

module.exports = { obtenerCarreras }
