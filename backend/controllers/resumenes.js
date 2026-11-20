// NeumaticoRojo — controlador resumenes.
const consultarJolpica = require('../services/jolpicaCache')
const consultarOpenF1 = require('../services/openF1')

const cacheResumenSesiones = new Map()
const cachePracticas = new Map()
const cacheSesionesOpenF1 = new Map()

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
    return res.status(400).json({ mensaje: 'Temporada o fecha inválida' })
  }

  const claveCache = `${temporada}-${fecha}`
  const guardado = cachePracticas.get(claveCache)
  const ahora = Date.now()

  if (guardado && guardado.expira > ahora) {
    return res.json(guardado.datos)
  }

  // Recuperar resultados correctos incluso si expiró la caché.
  const resultados = {
    fp1: null,
    fp2: null,
    fp3: null,
    clasificacion_sprint: null,
    ...guardado?.datos?.resultados
  }

  const respuestaBase = { temporada, fecha, fuente: 'OpenF1', resultados }
  const guardarYResponder = (extra = {}, duracion = 10 * 60 * 1000) => {
    const datos = { ...respuestaBase, ...extra }
    cachePracticas.set(claveCache, {
      datos,
      expira: Date.now() + duracion
    })
    return res.json(datos)
  }

  if (temporada < 2023) {
    return guardarYResponder(
      {
        aviso: 'OpenF1 no dispone de datos anteriores a 2023'
      },
      24 * 60 * 60 * 1000
    )
  }

  // No consultar Grandes Premios que están lejos en el calendario.
  if (fechaCarrera.getTime() > ahora + 7 * 24 * 60 * 60 * 1000) {
    return guardarYResponder({ aviso: 'Gran Premio todavía no disputado' })
  }

  try {
    // Guardar la lista de sesiones por temporada y evitar pedirla
    // en cada actualización de la página.
    const listaGuardada = cacheSesionesOpenF1.get(temporada)
    let sesiones = listaGuardada?.sesiones

    if (!listaGuardada || listaGuardada.expira <= ahora) {
      try {
        const respuestaSesiones = await consultarOpenF1(
          `sessions?year=${temporada}`
        )
        if (!Array.isArray(respuestaSesiones)) {
          throw new Error('Formato de sesiones incorrecto')
        }
        sesiones = respuestaSesiones
        cacheSesionesOpenF1.set(temporada, {
          sesiones,
          expira:
            Date.now() +
            (temporada < new Date().getUTCFullYear()
              ? 24 * 60 * 60 * 1000
              : 30 * 60 * 1000)
        })
      } catch (error) {
        // Si teníamos una lista anterior, usarla aunque esté vencida.
        if (!Array.isArray(sesiones)) throw error
        console.warn('OpenF1: reutilizando sesiones en caché:', error.message)
      }
    }

    // Localizar el Gran Premio por la fecha de su carrera.
    const carrera = sesiones
      .filter(sesion => {
        if (sesion.session_name !== 'Race' || sesion.is_cancelled) return false
        const inicio = Date.parse(sesion.date_start)
        return (
          Number.isFinite(inicio) &&
          Math.abs(inicio - fechaCarrera.getTime()) <= 36 * 60 * 60 * 1000
        )
      })
      .sort(
        (a, b) =>
          Math.abs(Date.parse(a.date_start) - fechaCarrera.getTime()) -
          Math.abs(Date.parse(b.date_start) - fechaCarrera.getTime())
      )[0]

    if (!carrera) {
      return guardarYResponder({
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
    let haySesionesPendientes = false

    for (const sesion of sesionesGP) {
      const clave = tipos[sesion.session_name]
      const fin = Date.parse(sesion.date_end)

      // OpenF1 considera "en vivo" la sesión hasta 30 minutos después
      // de su finalización. Esperamos 45 minutos para usar el acceso gratis.
      if (!Number.isFinite(fin) || fin + 45 * 60 * 1000 > ahora) {
        haySesionesPendientes = true
        continue
      }

      // La caché evita repetir consultas con frecuencia. Cuando vence,
      // revalidamos incluso resultados anteriores por si hubo sanciones.
      try {
        // Dos solicitudes, espaciadas para respetar los límites de OpenF1.
        await new Promise(resolve => setTimeout(resolve, 400))
        const posiciones = await consultarOpenF1(
          `session_result?session_key=${sesion.session_key}&position%3C=3`
        )
        if (!Array.isArray(posiciones)) throw new Error('Resultados inválidos')

        const mejores = posiciones
          .filter(
            fila =>
              Number.isInteger(Number(fila.position)) &&
              Number(fila.position) >= 1 &&
              Number(fila.position) <= 3
          )
          .sort((a, b) => Number(a.position) - Number(b.position))
          .slice(0, 3)

        if (
          mejores.length !== 3 ||
          !mejores.every((fila, i) => Number(fila.position) === i + 1)
        ) {
          haySesionesPendientes = true
          continue
        }

        await new Promise(resolve => setTimeout(resolve, 400))
        const pilotos = await consultarOpenF1(
          `drivers?session_key=${sesion.session_key}`
        )
        if (!Array.isArray(pilotos)) throw new Error('Pilotos inválidos')

        const pilotosPorNumero = new Map(
          pilotos.map(piloto => [Number(piloto.driver_number), piloto])
        )

        resultados[clave] = mejores.map(fila => {
          const numero = Number(fila.driver_number)
          const piloto = pilotosPorNumero.get(numero)
          const colorOriginal = piloto?.team_colour || ''
          return {
            posicion: Number(fila.position),
            numero,
            nombre: piloto?.full_name || `Piloto #${numero}`,
            color: /^[0-9a-fA-F]{6}$/.test(colorOriginal)
              ? `#${colorOriginal}`
              : null
          }
        })
      } catch (error) {
        console.warn(`OpenF1: no se pudo consultar ${clave}:`, error.message)
        errores.push(clave)
      }
    }

    const historica = temporada < new Date().getUTCFullYear()
    const duracion = historica
      ? 24 * 60 * 60 * 1000
      : errores.length
      ? 10 * 60 * 1000
      : 15 * 60 * 1000

    return guardarYResponder(
      {
        fuentesNoDisponibles: errores,
        ...(errores.length
          ? { aviso: 'Algunos resultados no están disponibles todavía' }
          : haySesionesPendientes
          ? { aviso: 'Esperando resultados oficiales' }
          : {})
      },
      duracion
    )
  } catch (error) {
    // Un fallo externo no debe borrar resultados válidos ni provocar
    // un error 502 en el navegador al consultar las prácticas.
    console.warn('OpenF1 no disponible temporalmente:', error.message)
    return guardarYResponder(
      {
        fuentesNoDisponibles: ['OpenF1'],
        aviso: 'Resultados de prácticas temporalmente no disponibles'
      },
      10 * 60 * 1000
    )
  }
}

module.exports = { resumenSesiones, resumenPracticas }
