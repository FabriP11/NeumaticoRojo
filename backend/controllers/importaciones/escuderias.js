// NeumaticoRojo — importación de escuderías y función reutilizable.
const pool = require('../../models/db')
const consultarJolpica = require('../../services/jolpicaCache')

// Usa una conexión facilitada por el llamador para compartir la transacción.
async function guardarEscuderias (conexion, escuderias, { soloNuevas = false } = {}) {
  for (const equipo of escuderias) {
    if (!equipo?.constructorId || !equipo.name || equipo.constructorId.length > 50) {
      throw new Error('Jolpica devolvió información incompleta de una escudería')
    }

    const valores = [equipo.constructorId, equipo.name, equipo.nationality || null]

    if (soloNuevas) {
      // No modificar registros existentes durante la sincronización automática.
      await conexion.execute(
        `INSERT INTO escuderias (id_escuderia, nombre, nacionalidad)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE id_escuderia = id_escuderia`,
        valores
      )
    } else {
      await conexion.execute(
        `INSERT INTO escuderias (id_escuderia, nombre, nacionalidad)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE nombre = ?, nacionalidad = ?`,
        [...valores, equipo.name, equipo.nationality || null]
      )
    }
  }
}

const importarEscuderias = async (req, res) => {
  const temporada = req.query.temporada || '2025'
  let conexion

  try {
    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({ mensaje: 'Temporada inválida' })
    }

    const respuesta = await consultarJolpica(
      `https://api.jolpi.ca/ergast/f1/${temporada}/constructors.json?limit=100`,
      { headers: { 'User-Agent': 'NeumaticoRojo/0.1' } }
    )
    if (!respuesta.ok) throw new Error('Error al consultar Jolpica')

    const datos = await respuesta.json()
    const escuderias = datos.MRData?.ConstructorTable?.Constructors || []
    if (escuderias.length === 0) {
      return res.status(404).json({ mensaje: 'No se encontraron escuderías' })
    }

    conexion = await pool.getConnection()
    await conexion.beginTransaction()
    await guardarEscuderias(conexion, escuderias)
    await conexion.commit()

    return res.json({
      mensaje: 'Escuderías guardadas correctamente en MySQL',
      temporada,
      escuderiasProcesadas: escuderias.length
    })
  } catch (error) {
    if (conexion) await conexion.rollback()
    console.error('Error al importar escuderías:', error.message)
    return res.status(500).json({ mensaje: 'No se pudieron importar las escuderías' })
  } finally {
    if (conexion) conexion.release()
  }
}

module.exports = { importarEscuderias, guardarEscuderias }
