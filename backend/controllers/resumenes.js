// NeumaticoRojo — controlador resumenes.
const consultarJolpica = require('../services/jolpicaCache')
const consultarOpenF1 = require('../services/openF1')

const cacheResumenSesiones = new Map()
const cachePracticas = new Map()

const resumenSesiones = async (req, res) => {
  try {
    const temporada = Number(req.query.temporada || 2026)

    const ronda = Number(req.query.ronda)

    // Validar parámetros
    if (
      !Number.isInteger(temporada) ||
      temporada < 1950 ||
      temporada > 2100 ||
      !Number.isInteger(ronda) ||
      ronda < 1 ||
      ronda > 30
    ) {
      return res.status(400).json({
        mensaje: 'Temporada o ronda inválida'
      })
    }

    // Comprobar caché para evitar consultas repetidas
    const claveCache = `${temporada}-${ronda}`
    const guardado = cacheResumenSesiones.get(claveCache)

    if (guardado && guardado.expira > Date.now()) {
      return res.json(guardado.datos)
    }

    // Sesiones soportadas por Jolpica
    const tipos = [
      {
        clave: 'clasificacion',
        ruta: 'qualifying',
        campo: 'QualifyingResults'
      },
      {
        clave: 'sprint',
        ruta: 'sprint',
        campo: 'SprintResults'
      },
      {
        clave: 'carrera',
        ruta: 'results',
        campo: 'Results'
      }
    ]

    const resultados = {}
    const errores = []

    // Consultar cada tipo de sesión
    await Promise.all(
      tipos.map(async tipo => {
        try {
          const url =
            `https://api.jolpi.ca/ergast/f1/` +
            `${temporada}/${ronda}/${tipo.ruta}.json?limit=100`

          const respuesta = await consultarJolpica(url, {
            signal: AbortSignal.timeout(10000)
          })

          if (!respuesta.ok) {
            throw new Error(`Jolpica respondió ${respuesta.status}`)
          }

          const datos = await respuesta.json()

          const carreras = datos.MRData?.RaceTable?.Races || []

          const filas = carreras[0]?.[tipo.campo] || []

          // Sin resultados publicados
          if (!filas.length) {
            resultados[tipo.clave] = null
            return
          }

          // Obtener los primeros tres puestos
          const podio = [...filas]
            .sort((a, b) => Number(a.position) - Number(b.position))
            .slice(0, 3)
            .map(fila => ({
              posicion: Number(fila.position),
              id_piloto: fila.Driver?.driverId,
              nombre:
                `${fila.Driver?.givenName || ''} ` +
                `${fila.Driver?.familyName || ''}`,
              numero: fila.number ?? null,
              id_escuderia: fila.Constructor?.constructorId ?? null
            }))

          resultados[tipo.clave] = podio
        } catch (error) {
          console.error(`Error consultando ${tipo.clave}:`, error.message)

          errores.push(tipo.clave)
          resultados[tipo.clave] = null
        }
      })
    )

    // Si no respondió ninguna fuente, avisar
    if (errores.length === tipos.length) {
      return res.status(502).json({
        mensaje: 'No se pudieron consultar los resultados'
      })
    }

    const respuestaFinal = {
      temporada,
      ronda,
      resultados,
      fuentesNoDisponibles: errores
    }

    // Guardar temporalmente los resultados
    // Temporadas históricas: 24 horas
    // Temporada actual: 2 minutos
    const duracionCache =
      temporada < new Date().getUTCFullYear()
        ? 24 * 60 * 60 * 1000
        : 2 * 60 * 1000

    cacheResumenSesiones.set(claveCache, {
      datos: respuestaFinal,
      expira: Date.now() + (errores.length ? 30000 : duracionCache)
    })

    res.json(respuestaFinal)
  } catch (error) {
    console.error('Error en resumen de sesiones:', error.message)

    res.status(500).json({
      mensaje: 'No se pudo obtener el resumen de sesiones'
    })
  }
}

const resumenPracticas = async (req, res) => {
  try {
    const temporada = Number(req.query.temporada)
    const fecha = String(req.query.fecha || '')

    const fechaCarrera = new Date(`${fecha}T12:00:00Z`)

    if (
      !Number.isInteger(temporada) ||
      temporada < 2020 ||
      temporada > 2030 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      Number.isNaN(fechaCarrera.getTime()) ||
      fechaCarrera.toISOString().slice(0, 10) !== fecha ||
      fechaCarrera.getUTCFullYear() !== temporada
    ) {
      return res.status(400).json({
        mensaje: 'Temporada o fecha inválida'
      })
    }

    // Estructura que recibirá el frontend
    const resultados = {
      fp1: null,
      fp2: null,
      fp3: null,
      clasificacion_sprint: null
    }

    // OpenF1 ofrece información desde 2023
    if (temporada < 2023) {
      return res.json({
        temporada,
        fecha,
        resultados,
        aviso: 'OpenF1 no dispone de datos anteriores a 2023'
      })
    }

    // Evitar consultar carreras muy futuras
    if (fechaCarrera.getTime() > Date.now() + 7 * 24 * 60 * 60 * 1000) {
      return res.json({
        temporada,
        fecha,
        resultados
      })
    }

    const claveCache = `${temporada}-${fecha}`
    const guardado = cachePracticas.get(claveCache)

    if (guardado && guardado.expira > Date.now()) {
      return res.json(guardado.datos)
    }

    // Obtener todas las sesiones de la temporada
    const sesiones = await consultarOpenF1(`sessions?year=${temporada}`)

    if (!Array.isArray(sesiones)) {
      throw new Error('Formato de sesiones incorrecto')
    }

    // Localizar el GP mediante su fecha de carrera
    const carrerasCoincidentes = sesiones
      .filter(sesion => {
        if (sesion.session_name !== 'Race' || sesion.is_cancelled) {
          return false
        }

        const fechaSesion = Date.parse(sesion.date_start)

        return (
          Number.isFinite(fechaSesion) &&
          Math.abs(fechaSesion - fechaCarrera.getTime()) <= 36 * 60 * 60 * 1000
        )
      })
      .sort(
        (a, b) =>
          Math.abs(Date.parse(a.date_start) - fechaCarrera.getTime()) -
          Math.abs(Date.parse(b.date_start) - fechaCarrera.getTime())
      )

    const carrera = carrerasCoincidentes[0]

    if (!carrera) {
      return res.json({
        temporada,
        fecha,
        resultados,
        aviso: 'Todavía no hay sesiones disponibles para este Gran Premio'
      })
    }

    const tipos = {
      'Practice 1': 'fp1',
      'Practice 2': 'fp2',
      'Practice 3': 'fp3',
      'Sprint Qualifying': 'clasificacion_sprint',
      'Sprint Shootout': 'clasificacion_sprint'
    }

    const sesionesGP = sesiones
      .filter(
        sesion =>
          sesion.meeting_key === carrera.meeting_key &&
          tipos[sesion.session_name] &&
          !sesion.is_cancelled
      )
      .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start))

    const errores = []

    // Consultar cada sesión que ya terminó
    for (const sesion of sesionesGP) {
      const clave = tipos[sesion.session_name]

      const fin = Date.parse(sesion.date_end)

      // No mostrar resultados de sesiones en curso
      if (!Number.isFinite(fin) || fin > Date.now() - 10 * 60 * 1000) {
        continue
      }

      // Evitar duplicar la misma categoría
      if (resultados[clave] !== null) {
        continue
      }

      try {
        // Separar solicitudes para respetar límites
        await new Promise(resolve => setTimeout(resolve, 400))

        const posiciones = await consultarOpenF1(
          `session_result?session_key=${sesion.session_key}&position%3C=3`
        )

        if (!Array.isArray(posiciones)) {
          continue
        }

        const mejores = posiciones
          .filter(
            fila =>
              Number.isInteger(Number(fila.position)) &&
              Number(fila.position) >= 1 &&
              Number(fila.position) <= 3
          )
          .sort((a, b) => Number(a.position) - Number(b.position))
          .slice(0, 3)

        // Evitar resultados parciales
        if (mejores.length < 3) {
          continue
        }

        await new Promise(resolve => setTimeout(resolve, 400))

        const pilotos = await consultarOpenF1(
          `drivers?session_key=${sesion.session_key}`
        )

        if (!Array.isArray(pilotos)) {
          continue
        }

        const pilotosPorNumero = new Map(
          pilotos.map(piloto => [Number(piloto.driver_number), piloto])
        )

        // Preparar el Top 3
        resultados[clave] = mejores.map(fila => {
          const numero = Number(fila.driver_number)

          const piloto = pilotosPorNumero.get(numero)

          const colorOriginal = piloto?.team_colour || ''

          const color = /^[0-9a-fA-F]{6}$/.test(colorOriginal)
            ? `#${colorOriginal}`
            : null

          return {
            posicion: Number(fila.position),
            numero,
            nombre: piloto?.full_name || `Piloto #${numero}`,
            color
          }
        })
      } catch (error) {
        console.error(`Error consultando ${clave}:`, error.message)

        errores.push(clave)
      }
    }

    const respuestaFinal = {
      temporada,
      fecha,
      fuente: 'OpenF1',
      resultados,
      fuentesNoDisponibles: errores
    }

    // Caché corta para eventos recientes
    const duracionCache =
      temporada < new Date().getUTCFullYear()
        ? 24 * 60 * 60 * 1000
        : 2 * 60 * 1000

    cachePracticas.set(claveCache, {
      datos: respuestaFinal,
      expira: Date.now() + (errores.length ? 30000 : duracionCache)
    })

    res.json(respuestaFinal)
  } catch (error) {
    console.error('Error al obtener prácticas:', error.message)

    res.status(502).json({
      mensaje: 'No se pudieron consultar las prácticas'
    })
  }
}

module.exports = { resumenSesiones, resumenPracticas }
