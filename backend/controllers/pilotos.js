// NeumaticoRojo — controlador pilotos.
const consultarJolpica = require('../services/jolpicaCache')

const obtenerPiloto = async (req, res) => {
  try {
    const id = req.params.id
    const temporada = req.query.temporada || '2026'

    // Validar identificador y temporada
    if (!/^[a-z0-9_]+$/i.test(id)) {
      return res.status(400).json({
        mensaje: 'Identificador de piloto inválido'
      })
    }

    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    const base = 'https://api.jolpi.ca/ergast/f1'

    // Consultar información y resultados
    const [respuestaPiloto, respuestaClasi, respuestaResultados] =
      await Promise.all([
        consultarJolpica(`${base}/drivers/${id}.json`),
        consultarJolpica(`${base}/${temporada}/drivers/${id}/driverstandings.json`),
        consultarJolpica(`${base}/${temporada}/drivers/${id}/results.json?limit=100`)
      ])

    if (!respuestaPiloto.ok || !respuestaClasi.ok || !respuestaResultados.ok) {
      throw new Error('Error al consultar la API')
    }

    const [datosPiloto, datosClasi, datosResultados] = await Promise.all([
      respuestaPiloto.json(),
      respuestaClasi.json(),
      respuestaResultados.json()
    ])

    // Información del piloto
    const piloto = datosPiloto.MRData.DriverTable.Drivers[0]

    if (!piloto) {
      return res.status(404).json({
        mensaje: 'Piloto no encontrado'
      })
    }

    // Posición en el campeonato
    const clasificacion =
      datosClasi.MRData.StandingsTable.StandingsLists?.[0]
        ?.DriverStandings?.[0] || null

    // Resultados de las carreras
    const resultados = datosResultados.MRData.RaceTable.Races

    // Contar podios de la temporada
    const podios = resultados.filter(carrera => {
      const posicion = Number(carrera.Results?.[0]?.position)

      return posicion >= 1 && posicion <= 3
    }).length

    // Enviar información al frontend
    res.json({
      piloto,
      temporada,
      clasificacion,
      podios,
      resultados
    })
  } catch (error) {
    console.error('Error al obtener piloto:', error.message)

    res.status(502).json({
      mensaje: 'No se pudo obtener la información del piloto'
    })
  }
}

module.exports = { obtenerPiloto }
