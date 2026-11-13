// NeumaticoRojo — controlador importaciones/calendario.
const pool = require('../../models/db')
const consultarJolpica = require('../../services/jolpicaCache')

const importarCalendario = async (req, res) => {
  const temporada = req.query.temporada || '2025'
  let conexion

  try {
    // Validar la temporada
    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    // Consultar el calendario de Jolpica
    const respuesta = await consultarJolpica(
      `https://api.jolpi.ca/ergast/f1/${temporada}.json?limit=100`,
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

    const carreras = datos.MRData.RaceTable.Races || []

    if (carreras.length === 0) {
      return res.status(404).json({
        mensaje: 'No hay carreras para esta temporada'
      })
    }

    // Conectar con MySQL
    conexion = await pool.getConnection()

    // Iniciar transacción
    await conexion.beginTransaction()

    // Guardar la temporada si no existe
    await conexion.execute('INSERT IGNORE INTO temporadas (anio) VALUES (?)', [
      Number(temporada)
    ])

    // Guardar circuitos y Grandes Premios
    for (const carrera of carreras) {
      const circuito = carrera.Circuit
      const ubicacion = circuito.Location

      // 1. Guardar el circuito
      await conexion.execute(
        `INSERT INTO circuitos
          (
            id_circuito,
            nombre,
            localidad,
            pais,
            latitud,
            longitud
          )
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nombre = ?,
           localidad = ?,
           pais = ?,
           latitud = ?,
           longitud = ?`,
        [
          circuito.circuitId,
          circuito.circuitName,
          ubicacion.locality || null,
          ubicacion.country || null,
          ubicacion.lat ?? null,
          ubicacion.long ?? null,

          circuito.circuitName,
          ubicacion.locality || null,
          ubicacion.country || null,
          ubicacion.lat ?? null,
          ubicacion.long ?? null
        ]
      )

      // La API devuelve la hora UTC terminada en Z.
      // MySQL TIME almacena solamente HH:MM:SS.
      const hora = carrera.time ? carrera.time.replace(/Z$/, '') : null

      // 2. Guardar el Gran Premio
      await conexion.execute(
        `INSERT INTO grandes_premios
          (
            anio,
            ronda,
            nombre,
            id_circuito,
            fecha_utc,
            hora_utc
          )
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nombre = ?,
           id_circuito = ?,
           fecha_utc = ?,
           hora_utc = ?`,
        [
          Number(temporada),
          Number(carrera.round),
          carrera.raceName,
          circuito.circuitId,
          carrera.date,
          hora,

          carrera.raceName,
          circuito.circuitId,
          carrera.date,
          hora
        ]
      )
    }

    // Confirmar todos los cambios
    await conexion.commit()

    res.json({
      mensaje: 'Calendario guardado correctamente en MySQL',
      temporada,
      grandesPremiosProcesados: carreras.length,
      circuitosProcesados: new Set(carreras.map(c => c.Circuit.circuitId)).size
    })
  } catch (error) {
    if (conexion) {
      await conexion.rollback()
    }

    console.error('Error al importar calendario:', error.message)

    res.status(500).json({
      mensaje: 'No se pudo importar el calendario'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
}

module.exports = { importarCalendario }
