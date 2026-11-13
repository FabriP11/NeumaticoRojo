// NeumaticoRojo — controlador importaciones/pilotos.
const pool = require('../../models/db')
const consultarJolpica = require('../../services/jolpicaCache')

const importarPilotos = async (req, res) => {
  const temporada = req.query.temporada || '2025'
  let conexion

  try {
    // Validar la temporada
    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    // Obtener pilotos desde Jolpica
    const respuesta = await consultarJolpica(
      `https://api.jolpi.ca/ergast/f1/${temporada}/drivers.json?limit=100`,
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

    const pilotos = datos.MRData.DriverTable.Drivers || []

    if (pilotos.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontraron pilotos'
      })
    }

    // Obtener una conexión a MySQL
    conexion = await pool.getConnection()

    // Iniciar transacción
    await conexion.beginTransaction()

    for (const piloto of pilotos) {
      await conexion.execute(
        `INSERT INTO pilotos
          (
            id_piloto,
            nombre,
            apellido,
            nacionalidad,
            fecha_nacimiento
          )
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nombre = ?,
           apellido = ?,
           nacionalidad = ?,
           fecha_nacimiento = ?`,
        [
          piloto.driverId,
          piloto.givenName,
          piloto.familyName,
          piloto.nationality || null,
          piloto.dateOfBirth || null,

          piloto.givenName,
          piloto.familyName,
          piloto.nationality || null,
          piloto.dateOfBirth || null
        ]
      )
    }

    // Confirmar los cambios
    await conexion.commit()

    res.json({
      mensaje: 'Pilotos guardados correctamente en MySQL',
      temporada,
      pilotosProcesados: pilotos.length
    })
  } catch (error) {
    if (conexion) {
      await conexion.rollback()
    }

    console.error('Error al importar pilotos:', error.message)

    res.status(500).json({
      mensaje: 'No se pudieron importar los pilotos'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
}

module.exports = { importarPilotos }
