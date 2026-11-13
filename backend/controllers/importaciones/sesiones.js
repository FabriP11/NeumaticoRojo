// NeumaticoRojo — controlador importaciones/sesiones.
const pool = require('../../models/db')
const consultarJolpica = require('../../services/jolpicaCache')

const importarSesiones = async (req, res) => {
  const temporada = req.query.temporada || '2025'
  let conexion

  try {
    // Validar la temporada
    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    // 1. Obtener el calendario desde Jolpica
    const respuesta = await consultarJolpica(
      `https://api.jolpi.ca/ergast/f1/${temporada}.json?limit=100`,
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
    const carreras = datos.MRData.RaceTable.Races || []

    if (carreras.length === 0) {
      return res.status(404).json({
        mensaje: 'No hay carreras disponibles'
      })
    }

    // 2. Buscar los Grandes Premios en MySQL
    const [grandesPremios] = await pool.execute(
      `SELECT id_gran_premio, ronda
       FROM grandes_premios
       WHERE anio = ?`,
      [Number(temporada)]
    )

    const mapaGrandesPremios = new Map(
      grandesPremios.map(gp => [Number(gp.ronda), gp.id_gran_premio])
    )

    // Comprobar que primero se importó el calendario
    const rondasFaltantes = carreras
      .filter(carrera => !mapaGrandesPremios.has(Number(carrera.round)))
      .map(carrera => Number(carrera.round))

    if (rondasFaltantes.length > 0) {
      return res.status(409).json({
        mensaje: 'Primero debés importar el calendario de esta temporada',
        rondasFaltantes
      })
    }

    // 3. Obtener una conexión e iniciar transacción
    conexion = await pool.getConnection()
    await conexion.beginTransaction()

    let sesionesProcesadas = 0

    for (const carrera of carreras) {
      const idGranPremio = mapaGrandesPremios.get(Number(carrera.round))

      // Sesiones disponibles para este Gran Premio
      const sesiones = [
        {
          tipo: 'practica_1',
          datos: carrera.FirstPractice
        },
        {
          tipo: 'practica_2',
          datos: carrera.SecondPractice
        },
        {
          tipo: 'practica_3',
          datos: carrera.ThirdPractice
        },
        {
          tipo: 'clasificacion_sprint',
          datos: carrera.SprintQualifying || carrera.SprintShootout
        },
        {
          tipo: 'clasificacion',
          datos: carrera.Qualifying
        },
        {
          tipo: 'sprint',
          datos: carrera.Sprint
        },
        {
          tipo: 'carrera',
          datos: {
            date: carrera.date,
            time: carrera.time
          }
        }
      ]

      // 4. Guardar las sesiones existentes
      for (const sesion of sesiones) {
        if (!sesion.datos?.date) {
          continue
        }

        const fecha = sesion.datos.date

        const hora = sesion.datos.time
          ? sesion.datos.time.replace(/Z$/, '')
          : null

        await conexion.execute(
          `INSERT INTO sesiones
            (
              id_gran_premio,
              tipo,
              fecha_utc,
              hora_utc
            )
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             fecha_utc = ?,
             hora_utc = ?`,
          [idGranPremio, sesion.tipo, fecha, hora, fecha, hora]
        )

        sesionesProcesadas++
      }
    }

    // 5. Confirmar todos los cambios
    await conexion.commit()

    res.json({
      mensaje: 'Sesiones guardadas correctamente',
      temporada,
      grandesPremiosProcesados: carreras.length,
      sesionesProcesadas
    })
  } catch (error) {
    if (conexion) {
      await conexion.rollback()
    }

    console.error('Error al importar sesiones:', error.message)

    res.status(500).json({
      mensaje: 'No se pudieron importar las sesiones'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
}

module.exports = { importarSesiones }
