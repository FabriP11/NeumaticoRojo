// NeumaticoRojo — sincronización de clasificaciones con Jolpica y MySQL.
const { createHash } = require('node:crypto')
const pool = require('../../models/db')
const consultarJolpica = require('../../services/jolpicaCache')
const { guardarPilotos } = require('./pilotos')
const { guardarEscuderias } = require('./escuderias')

const INTERVALO_MS = 5 * 60 * 1000
const REINTENTO_ERROR_MS = 60 * 1000
const ultimasConsultas = new Map()
const solicitudesEnCurso = new Map()

function errorSincronizacion (codigo, mensaje, detalles = {}) {
  return Object.assign(new Error(mensaje), { codigo, ...detalles })
}

function comprobarResultados (pilotos, escuderias) {
  if (!Array.isArray(pilotos) || !Array.isArray(escuderias) ||
      pilotos.length === 0 || escuderias.length === 0) {
    throw errorSincronizacion('SIN_DATOS', 'No hay clasificaciones publicadas')
  }

  const valido = (valor) => Number.isFinite(Number(valor)) && Number(valor) >= 0
  const validaPosicion = (valor) => valor == null ||
    (Number.isInteger(Number(valor)) && Number(valor) > 0)

  if (!pilotos.every(p => p?.Driver?.driverId &&
      valido(p.points) && valido(p.wins) && validaPosicion(p.position)) ||
      !escuderias.every(e => e?.Constructor?.constructorId &&
      valido(e.points) && valido(e.wins) && validaPosicion(e.position))) {
    throw errorSincronizacion('DATOS_INVALIDOS', 'La API devolvió datos incompletos')
  }
}

async function obtenerClasificacionesAPI (temporada) {
  const base = `https://api.jolpi.ca/ergast/f1/${temporada}`
  const [respuestaPilotos, respuestaEscuderias] = await Promise.all([
    consultarJolpica(`${base}/driverstandings.json?limit=100`),
    consultarJolpica(`${base}/constructorstandings.json?limit=100`)
  ])

  if (!respuestaPilotos.ok || !respuestaEscuderias.ok) {
    throw errorSincronizacion('API_ERROR', 'No se pudo consultar Jolpica')
  }

  const [datosPilotos, datosEscuderias] = await Promise.all([
    respuestaPilotos.json(),
    respuestaEscuderias.json()
  ])

  const pilotos = datosPilotos.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []
  const escuderias = datosEscuderias.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || []
  comprobarResultados(pilotos, escuderias)

  return { pilotos, escuderias }
}

function huellaResultados ({ pilotos, escuderias }) {
  const ordenar = (a, b) => String(a[0]).localeCompare(String(b[0]))
  const datos = {
    pilotos: pilotos.map(p => [
      p.Driver.driverId, p.Driver.permanentNumber, p.position,
      p.positionText, p.points, p.wins,
      (p.Constructors || []).map(e => e.constructorId).sort()
    ]).sort(ordenar),
    escuderias: escuderias.map(e => [
      e.Constructor.constructorId, e.position, e.positionText, e.points, e.wins
    ]).sort(ordenar)
  }
  return createHash('sha256').update(JSON.stringify(datos)).digest('hex')
}

async function guardarEnMySQL (temporada, { pilotos, escuderias }) {
  // Incorporar los pilotos, equipos y relaciones nuevos en la misma transacción
  // que las clasificaciones. No se borran participaciones anteriores.
  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    await conexion.execute('INSERT IGNORE INTO temporadas (anio) VALUES (?)', [Number(temporada)])

    // Los standings incluyen los datos básicos del piloto y sus escuderías.
    // No necesitamos más consultas a la API para importar estos participantes.
    const equipos = new Map()
    for (const e of escuderias) {
      equipos.set(e.Constructor.constructorId, e.Constructor)
    }
    for (const p of pilotos) {
      for (const equipo of p.Constructors || []) {
        if (equipo?.constructorId) equipos.set(equipo.constructorId, equipo)
      }
    }

    await guardarEscuderias(conexion, [...equipos.values()], { soloNuevas: true })
    await guardarPilotos(conexion, pilotos.map(p => p.Driver), { soloNuevos: true })

    // Un mismo piloto puede haber competido para más de un equipo en el año.
    // Guardamos todas esas asociaciones, pero sin borrar ni sobrescribir las viejas.
    // Nota: las prácticas libres por sí solas no figuran en los standings.
    for (const p of pilotos) {
      const dorsalTexto = p.Driver.permanentNumber
      const dorsal = /^\d+$/.test(String(dorsalTexto || '')) &&
        Number(dorsalTexto) > 0 && Number(dorsalTexto) <= 65535
        ? Number(dorsalTexto) : null
      for (const equipo of p.Constructors || []) {
        if (!equipo?.constructorId) continue
        await conexion.execute(
          `INSERT INTO participaciones (anio, id_piloto, id_escuderia, numero)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE id_participacion = id_participacion`,
          [Number(temporada), p.Driver.driverId, equipo.constructorId, dorsal]
        )
      }
    }

    for (const p of pilotos) {
      const posicion = p.position == null ? null : Number(p.position)
      const valores = [posicion, p.positionText || null, Number(p.points), Number(p.wins)]
      await conexion.execute(
        `INSERT INTO clasificacion_pilotos
         (anio, id_piloto, posicion, posicion_texto, puntos, victorias)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         posicion = ?, posicion_texto = ?, puntos = ?, victorias = ?`,
        [Number(temporada), p.Driver.driverId, ...valores, ...valores]
      )
    }

    for (const e of escuderias) {
      const posicion = e.position == null ? null : Number(e.position)
      const valores = [posicion, e.positionText || null, Number(e.points), Number(e.wins)]
      await conexion.execute(
        `INSERT INTO clasificacion_escuderias
         (anio, id_escuderia, posicion, posicion_texto, puntos, victorias)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         posicion = ?, posicion_texto = ?, puntos = ?, victorias = ?`,
        [Number(temporada), e.Constructor.constructorId, ...valores, ...valores]
      )
    }

    await conexion.commit()
  } catch (error) {
    await conexion.rollback()
    throw error
  } finally {
    conexion.release()
  }
}

// Llamada compartida por Inicio, Favoritos y la importación administrativa.
// Una sola sincronización por temporada; evita escrituras si nada cambió.
function sincronizarClasificaciones (temporada, { forzar = false } = {}) {
  const anio = String(temporada)
  if (!/^\d{4}$/.test(anio)) {
    return Promise.reject(errorSincronizacion('PARAMETROS', 'Temporada inválida'))
  }

  const anterior = ultimasConsultas.get(anio)
  if (!forzar && anterior?.expira > Date.now()) {
    return Promise.resolve({ temporada: anio, ...anterior.resumen, omitida: true })
  }

  if (solicitudesEnCurso.has(anio)) return solicitudesEnCurso.get(anio)

  const tarea = (async () => {
    try {
      const datos = await obtenerClasificacionesAPI(anio)
      const huella = huellaResultados(datos)
      const cambia = forzar || huella !== anterior?.huella
      if (cambia) await guardarEnMySQL(anio, datos)

      const resumen = {
        pilotosProcesados: datos.pilotos.length,
        escuderiasProcesadas: datos.escuderias.length,
        actualizada: cambia
      }
      ultimasConsultas.set(anio, {
        huella,
        resumen,
        expira: Date.now() + INTERVALO_MS
      })
      return { temporada: anio, ...resumen }
    } catch (error) {
      // En lecturas públicas, el controlador conservará las últimas tablas válidas.
      // Evitamos insistir con la API ante una caída o límite de solicitudes.
      if (!forzar) {
        ultimasConsultas.set(anio, {
          huella: anterior?.huella,
          resumen: anterior?.resumen || {},
          expira: Date.now() + REINTENTO_ERROR_MS
        })
      }
      throw error
    }
  })()

  solicitudesEnCurso.set(anio, tarea)
  tarea.finally(() => {
    if (solicitudesEnCurso.get(anio) === tarea) solicitudesEnCurso.delete(anio)
  }).catch(() => {})
  return tarea
}

const importarClasificaciones = async (req, res) => {
  try {
    const temporada = String(req.query.temporada || '2025')
    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({ mensaje: 'Temporada inválida' })
    }

    const resultado = await sincronizarClasificaciones(temporada, { forzar: true })
    return res.json({ mensaje: 'Clasificaciones guardadas correctamente', ...resultado })
  } catch (error) {
    if (error.codigo === 'SIN_DATOS') {
      return res.status(404).json({ mensaje: 'No hay clasificaciones disponibles' })
    }
    if (error.codigo === 'REFERENCIAS_FALTANTES') {
      return res.status(409).json({
        mensaje: 'Primero debés importar los pilotos y escuderías',
        pilotosFaltantes: error.pilotosFaltantes,
        escuderiasFaltantes: error.escuderiasFaltantes
      })
    }

    console.error('Error al importar clasificaciones:', error.message)
    return res.status(error.codigo === 'API_ERROR' ? 502 : 500).json({
      mensaje: 'No se pudieron importar las clasificaciones'
    })
  }
}

module.exports = { importarClasificaciones, sincronizarClasificaciones }
