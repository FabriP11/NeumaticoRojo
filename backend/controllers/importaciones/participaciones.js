// NeumaticoRojo — controlador importaciones/participaciones.
const pool = require('../../models/db')
const consultarJolpica = require('../../services/jolpicaCache')

const importarParticipaciones = async (req, res) => {
  const temporada = req.query.temporada || '2025'
  let conexion

  try {
    // Validar temporada
    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    // Consultar la clasificación de pilotos
    const respuesta = await consultarJolpica(
      `https://api.jolpi.ca/ergast/f1/${temporada}/driverstandings.json?limit=100`,
      {
        headers: {
          'User-Agent': 'NeumaticoRojo/0.1'
        }
      }
    )

    if (!respuesta.ok) {
      throw new Error('No se pudo consultar Jolpica')
    }

    const datos = await respuesta.json()

    const clasificacion =
      datos.MRData.StandingsTable.StandingsLists?.[0]?.DriverStandings || []

    if (clasificacion.length === 0) {
      return res.status(404).json({
        mensaje: 'No hay participaciones disponibles'
      })
    }

    // Preparar las relaciones piloto-escudería
    const participaciones = []

    for (const registro of clasificacion) {
      const idPiloto = registro.Driver.driverId

      for (const equipo of registro.Constructors || []) {
        participaciones.push({
          idPiloto,
          idEscuderia: equipo.constructorId
        })
      }
    }

    // Obtener conexión con MySQL
    conexion = await pool.getConnection()

    // Iniciar transacción
    await conexion.beginTransaction()

    // Registrar temporada si todavía no existe
    await conexion.execute('INSERT IGNORE INTO temporadas (anio) VALUES (?)', [
      Number(temporada)
    ])

    // Guardar cada participación
    for (const participacion of participaciones) {
      await conexion.execute(
        `INSERT INTO participaciones
          (anio, id_piloto, id_escuderia)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
          id_participacion = id_participacion`,
        [Number(temporada), participacion.idPiloto, participacion.idEscuderia]
      )
    }

    // Confirmar los cambios
    await conexion.commit()

    res.json({
      mensaje: 'Participaciones guardadas correctamente',
      temporada,
      pilotosEncontrados: clasificacion.length,
      participacionesProcesadas: participaciones.length
    })
  } catch (error) {
    if (conexion) {
      await conexion.rollback()
    }

    console.error('Error al importar participaciones:', error.message)

    res.status(500).json({
      mensaje: 'No se pudieron importar las participaciones'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
}

module.exports = { importarParticipaciones }
