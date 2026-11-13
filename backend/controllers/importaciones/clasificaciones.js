// NeumaticoRojo — controlador importaciones/clasificaciones.
const pool = require('../../models/db')
const consultarJolpica = require('../../services/jolpicaCache')

const importarClasificaciones = async (req, res) => {
  const temporada = req.query.temporada || '2025'
  let conexion

  try {
    // 1. Validar temporada
    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    const base = 'https://api.jolpi.ca/ergast/f1'

    // 2. Consultar las dos clasificaciones
    const [respuestaPilotos, respuestaEscuderias] = await Promise.all([
      consultarJolpica(`${base}/${temporada}/driverstandings.json?limit=100`),
      consultarJolpica(`${base}/${temporada}/constructorstandings.json?limit=100`)
    ])

    if (!respuestaPilotos.ok || !respuestaEscuderias.ok) {
      throw new Error('Error al consultar Jolpica')
    }

    const [datosPilotos, datosEscuderias] = await Promise.all([
      respuestaPilotos.json(),
      respuestaEscuderias.json()
    ])

    // 3. Extraer los datos
    const pilotos =
      datosPilotos.MRData.StandingsTable.StandingsLists?.[0]?.DriverStandings ||
      []

    const escuderias =
      datosEscuderias.MRData.StandingsTable.StandingsLists?.[0]
        ?.ConstructorStandings || []

    if (pilotos.length === 0 || escuderias.length === 0) {
      return res.status(404).json({
        mensaje: 'No hay clasificaciones disponibles'
      })
    }

    // 4. Verificar que los pilotos y equipos
    // ya estén guardados en MySQL
    const [pilotosDB] = await pool.query('SELECT id_piloto FROM pilotos')

    const [escuderiasDB] = await pool.query(
      'SELECT id_escuderia FROM escuderias'
    )

    const idsPilotos = new Set(pilotosDB.map(p => p.id_piloto))

    const idsEscuderias = new Set(escuderiasDB.map(e => e.id_escuderia))

    const pilotosFaltantes = pilotos
      .map(p => p.Driver.driverId)
      .filter(id => !idsPilotos.has(id))

    const escuderiasFaltantes = escuderias
      .map(e => e.Constructor.constructorId)
      .filter(id => !idsEscuderias.has(id))

    if (pilotosFaltantes.length > 0 || escuderiasFaltantes.length > 0) {
      return res.status(409).json({
        mensaje: 'Primero debés importar los pilotos y escuderías',
        pilotosFaltantes,
        escuderiasFaltantes
      })
    }

    // 5. Iniciar transacción
    conexion = await pool.getConnection()
    await conexion.beginTransaction()

    // Registrar la temporada si no existe
    await conexion.execute('INSERT IGNORE INTO temporadas (anio) VALUES (?)', [
      Number(temporada)
    ])

    // 6. Guardar clasificación de pilotos
    for (const piloto of pilotos) {
      const posicion = piloto.position != null ? Number(piloto.position) : null

      const posicionTexto = piloto.positionText || null

      const puntos = Number(piloto.points)
      const victorias = Number(piloto.wins)

      await conexion.execute(
        `INSERT INTO clasificacion_pilotos
          (
            anio,
            id_piloto,
            posicion,
            posicion_texto,
            puntos,
            victorias
          )
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           posicion = ?,
           posicion_texto = ?,
           puntos = ?,
           victorias = ?`,
        [
          Number(temporada),
          piloto.Driver.driverId,
          posicion,
          posicionTexto,
          puntos,
          victorias,

          posicion,
          posicionTexto,
          puntos,
          victorias
        ]
      )
    }

    // 7. Guardar clasificación de escuderías
    for (const equipo of escuderias) {
      const posicion = equipo.position != null ? Number(equipo.position) : null

      const posicionTexto = equipo.positionText || null

      const puntos = Number(equipo.points)
      const victorias = Number(equipo.wins)

      await conexion.execute(
        `INSERT INTO clasificacion_escuderias
          (
            anio,
            id_escuderia,
            posicion,
            posicion_texto,
            puntos,
            victorias
          )
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           posicion = ?,
           posicion_texto = ?,
           puntos = ?,
           victorias = ?`,
        [
          Number(temporada),
          equipo.Constructor.constructorId,
          posicion,
          posicionTexto,
          puntos,
          victorias,

          posicion,
          posicionTexto,
          puntos,
          victorias
        ]
      )
    }

    // 8. Confirmar todos los cambios
    await conexion.commit()

    res.json({
      mensaje: 'Clasificaciones guardadas correctamente',
      temporada,
      pilotosProcesados: pilotos.length,
      escuderiasProcesadas: escuderias.length
    })
  } catch (error) {
    if (conexion) {
      await conexion.rollback()
    }

    console.error('Error al importar clasificaciones:', error.message)

    res.status(500).json({
      mensaje: 'No se pudieron importar las clasificaciones'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
}

module.exports = { importarClasificaciones }
