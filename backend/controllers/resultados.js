// NeumaticoRojo — controlador resultados.
const consultarJolpica = require('../services/jolpicaCache')

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

module.exports = { obtenerResultados, obtenerResultadosSesion }
