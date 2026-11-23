// NeumaticoRojo — importación de pilotos y función reutilizable.
const pool = require('../../models/db')
const consultarJolpica = require('../../services/jolpicaCache')

// Se puede llamar dentro de una transacción existente, sin hacer commit aquí.
// La sincronización automática solo incorpora faltantes; la importación manual actualiza datos.
async function guardarPilotos (conexion, pilotos, { soloNuevos = false } = {}) {
  for (const piloto of pilotos) {
    if (!piloto?.driverId || !piloto.givenName || !piloto.familyName ||
        piloto.driverId.length > 50) {
      throw new Error('Jolpica devolvió información incompleta de un piloto')
    }

    const valores = [
      piloto.driverId,
      piloto.givenName,
      piloto.familyName,
      piloto.nationality || null,
      piloto.dateOfBirth || null
    ]

    if (soloNuevos) {
      // Si ya existe, dejamos intactos los datos guardados.
      await conexion.execute(
        `INSERT INTO pilotos
           (id_piloto, nombre, apellido, nacionalidad, fecha_nacimiento)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id_piloto = id_piloto`,
        valores
      )
    } else {
      await conexion.execute(
        `INSERT INTO pilotos
           (id_piloto, nombre, apellido, nacionalidad, fecha_nacimiento)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nombre = ?, apellido = ?, nacionalidad = ?, fecha_nacimiento = ?`,
        [...valores, ...valores.slice(1)]
      )
    }
  }
}

const importarPilotos = async (req, res) => {
  const temporada = req.query.temporada || '2025'
  let conexion

  try {
    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({ mensaje: 'Temporada inválida' })
    }

    const respuesta = await consultarJolpica(
      `https://api.jolpi.ca/ergast/f1/${temporada}/drivers.json?limit=100`,
      { headers: { 'User-Agent': 'NeumaticoRojo/0.1' } }
    )
    if (!respuesta.ok) throw new Error('Error al consultar Jolpica')

    const datos = await respuesta.json()
    const pilotos = datos.MRData?.DriverTable?.Drivers || []
    if (pilotos.length === 0) {
      return res.status(404).json({ mensaje: 'No se encontraron pilotos' })
    }

    conexion = await pool.getConnection()
    await conexion.beginTransaction()
    await guardarPilotos(conexion, pilotos)
    await conexion.commit()

    return res.json({
      mensaje: 'Pilotos guardados correctamente en MySQL',
      temporada,
      pilotosProcesados: pilotos.length
    })
  } catch (error) {
    if (conexion) await conexion.rollback()
    console.error('Error al importar pilotos:', error.message)
    return res.status(500).json({ mensaje: 'No se pudieron importar los pilotos' })
  } finally {
    if (conexion) conexion.release()
  }
}

module.exports = { importarPilotos, guardarPilotos }
