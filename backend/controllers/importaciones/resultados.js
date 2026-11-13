// NeumaticoRojo — controlador importaciones/resultados.
const pool = require('../../models/db')
const consultarJolpica = require('../../services/jolpicaCache')

const importarResultados = async (req, res) => {
  const temporada = req.query.temporada || '2025'
  let conexion

  try {
    // 1. Validar temporada
    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    // 2. Obtener todos los resultados de Jolpica
    // La API permite hasta 100 registros por página.
    const resultados = []
    let offset = 0
    let total = 0

    do {
      const respuesta = await consultarJolpica(
        `https://api.jolpi.ca/ergast/f1/${temporada}/results.json?limit=100&offset=${offset}`,
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

      total = Number(datos.MRData.total || 0)

      const carreras = datos.MRData.RaceTable.Races || []

      let registrosPagina = 0

      for (const carrera of carreras) {
        for (const resultado of carrera.Results || []) {
          resultados.push({
            ronda: Number(carrera.round),
            ...resultado
          })

          registrosPagina++
        }
      }

      if (registrosPagina === 0 && offset < total) {
        throw new Error('Respuesta incompleta de Jolpica')
      }

      offset += Number(datos.MRData.limit || 100)
    } while (offset < total)

    if (resultados.length === 0) {
      return res.status(404).json({
        mensaje: 'No hay resultados disponibles'
      })
    }

    if (resultados.length !== total) {
      throw new Error('No se recibieron todos los resultados de la temporada')
    }

    // 3. Consultar los Grandes Premios guardados
    const [grandesPremios] = await pool.execute(
      `SELECT id_gran_premio, ronda
       FROM grandes_premios
       WHERE anio = ?`,
      [Number(temporada)]
    )

    const mapaGP = new Map(
      grandesPremios.map(gp => [Number(gp.ronda), gp.id_gran_premio])
    )

    // 4. Comprobar datos relacionados
    const [pilotosDB] = await pool.query('SELECT id_piloto FROM pilotos')

    const [escuderiasDB] = await pool.query(
      'SELECT id_escuderia FROM escuderias'
    )

    const idsPilotos = new Set(pilotosDB.map(p => p.id_piloto))

    const idsEscuderias = new Set(escuderiasDB.map(e => e.id_escuderia))

    const faltantes = []

    for (const resultado of resultados) {
      if (!mapaGP.has(resultado.ronda)) {
        faltantes.push(`Gran Premio: ronda ${resultado.ronda}`)
      }

      if (!idsPilotos.has(resultado.Driver.driverId)) {
        faltantes.push(`Piloto: ${resultado.Driver.driverId}`)
      }

      if (!idsEscuderias.has(resultado.Constructor.constructorId)) {
        faltantes.push(`Escudería: ${resultado.Constructor.constructorId}`)
      }
    }

    if (faltantes.length > 0) {
      return res.status(409).json({
        mensaje:
          'Faltan datos relacionados en MySQL. Importá primero pilotos, escuderías y calendario.',
        faltantes: [...new Set(faltantes)]
      })
    }

    // 5. Iniciar transacción
    conexion = await pool.getConnection()
    await conexion.beginTransaction()

    for (const resultado of resultados) {
      const idGranPremio = mapaGP.get(resultado.ronda)

      await conexion.execute(
        `INSERT INTO resultados (
          id_gran_premio,
          id_piloto,
          id_escuderia,
          posicion,
          posicion_texto,
          posicion_salida,
          vueltas,
          tiempo,
          estado,
          puntos
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          id_escuderia = VALUES(id_escuderia),
          posicion = VALUES(posicion),
          posicion_texto = VALUES(posicion_texto),
          posicion_salida = VALUES(posicion_salida),
          vueltas = VALUES(vueltas),
          tiempo = VALUES(tiempo),
          estado = VALUES(estado),
          puntos = VALUES(puntos)`,
        [
          idGranPremio,
          resultado.Driver.driverId,
          resultado.Constructor.constructorId,
          Number(resultado.position),
          resultado.positionText,
          resultado.grid != null ? Number(resultado.grid) : null,
          resultado.laps != null ? Number(resultado.laps) : null,
          resultado.Time?.time || null,
          resultado.status || null,
          Number(resultado.points)
        ]
      )
    }

    // 6. Confirmar cambios
    await conexion.commit()

    res.json({
      mensaje: 'Resultados guardados correctamente en MySQL',
      temporada,
      resultadosProcesados: resultados.length,
      grandesPremiosProcesados: mapaGP.size
    })
  } catch (error) {
    if (conexion) {
      await conexion.rollback()
    }

    console.error('Error al importar resultados:', error.message)

    res.status(500).json({
      mensaje: 'No se pudieron importar los resultados'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
}

module.exports = { importarResultados }
