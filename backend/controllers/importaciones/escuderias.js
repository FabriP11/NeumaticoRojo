// NeumaticoRojo — controlador importaciones/escuderias.
const pool = require('../../models/db')
const consultarJolpica = require('../../services/jolpicaCache')

const importarEscuderias = async (req, res) => {
  const temporada = req.query.temporada || '2025'
  let conexion

  try {
    // Validar la temporada
    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    // Obtener las escuderías desde Jolpica
    const respuesta = await consultarJolpica(
      `https://api.jolpi.ca/ergast/f1/${temporada}/constructors.json?limit=100`,
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

    const escuderias = datos.MRData.ConstructorTable.Constructors || []

    if (escuderias.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontraron escuderías'
      })
    }

    // Obtener una conexión de MySQL
    conexion = await pool.getConnection()

    // Comenzar una transacción
    await conexion.beginTransaction()

    // Guardar cada escudería
    for (const equipo of escuderias) {
      await conexion.execute(
        `INSERT INTO escuderias
          (id_escuderia, nombre, nacionalidad)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
          nombre = ?,
          nacionalidad = ?`,
        [
          equipo.constructorId,
          equipo.name,
          equipo.nationality || null,
          equipo.name,
          equipo.nationality || null
        ]
      )
    }

    // Confirmar todos los cambios
    await conexion.commit()

    res.json({
      mensaje: 'Escuderías guardadas correctamente en MySQL',
      temporada,
      escuderiasProcesadas: escuderias.length
    })
  } catch (error) {
    if (conexion) {
      await conexion.rollback()
    }

    console.error('Error al importar escuderías:', error.message)

    res.status(500).json({
      mensaje: 'No se pudieron importar las escuderías'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
}

module.exports = { importarEscuderias }
