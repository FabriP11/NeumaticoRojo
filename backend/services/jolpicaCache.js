// Caché de Jolpica: memoria para velocidad + MySQL para sobrevivir reinicios.
// Los controladores siguen usando consultarJolpica(url) como siempre.
const { createHash } = require('node:crypto')

const CACHE_MAX_ENTRADAS = 250
const CACHE_MAX_BYTES_RESPUESTA = 2 * 1024 * 1024
const INTERVALO_PETICIONES_MS = 400
const TIMEOUT_MS = 15000
const MINUTO = 60 * 1000
const HORA = 60 * MINUTO
const DIA = 24 * HORA

function duracionCache (url, ahora = Date.now()) {
  const ruta = new URL(url).pathname
  const anio = ruta.match(/\/f1\/(\d{4})(?:\/|\.json)/)?.[1]

  if (anio && Number(anio) < new Date(ahora).getUTCFullYear()) return DIA
  if (/\/f1\/drivers\/[^/]+\.json$/.test(ruta)) return DIA
  if (/\/(results|qualifying|sprint)\.json$/.test(ruta)) return 2 * MINUTO
  if (/standings\.json$/.test(ruta)) return 5 * MINUTO
  return 30 * MINUTO
}

// Un resultado actual no debe quedar congelado durante días o semanas.
// Los datos históricos se pueden mantener bastante más tiempo.
function antiguedadMaximaRespaldo (url, ahora = Date.now()) {
  const ruta = new URL(url).pathname
  const anio = ruta.match(/\/f1\/(\d{4})(?:\/|\.json)/)?.[1]

  if (anio && Number(anio) < new Date(ahora).getUTCFullYear()) return 180 * DIA
  if (/\/f1\/drivers\/[^/]+\.json$/.test(ruta)) return 90 * DIA
  if (/\/(results|qualifying|sprint|driverstandings|constructorstandings)\.json$/.test(ruta)) return DIA
  return 14 * DIA // Calendario y listados de la temporada actual.
}

function crearServicioJolpica ({ conexion, solicitar = (...args) => globalThis.fetch(...args),
  ahora = () => Date.now(), intervaloMs = INTERVALO_PETICIONES_MS,
  timeoutMs = TIMEOUT_MS } = {}) {
  const cache = new Map()
  const enCurso = new Map()
  let cola = Promise.resolve()
  let proximoInicio = 0
  let ultimoAvisoBD = -Infinity

  // En producción la conexión es el pool existente; en pruebas se inyecta una falsa.
  function bd () {
    return conexion || require('../models/db')
  }

  function avisoBD (error) {
    if (ahora() - ultimoAvisoBD >= MINUTO) {
      ultimoAvisoBD = ahora()
      console.warn('[Jolpica] Caché MySQL no disponible:', error.message)
    }
  }

  function pausa (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Limitar el INICIO de cada solicitud a Jolpica, no el tiempo de respuesta.
  async function reservarTurno () {
    const turno = cola.then(async () => {
      const espera = Math.max(0, proximoInicio - ahora())
      if (espera > 0) await pausa(espera)
      proximoInicio = ahora() + intervaloMs
    })
    cola = turno.catch(() => {})
    await turno
  }

  function guardarEnMemoria (url, entrada) {
    cache.delete(url)
    cache.set(url, entrada)
    while (cache.size > CACHE_MAX_ENTRADAS) {
      cache.delete(cache.keys().next().value)
    }
  }

  function construirRespuesta (datos, estado) {
    const headers = new Headers({
      'Content-Type': datos.tipo || 'application/json; charset=utf-8',
      'X-NeumaticoRojo-Cache': estado
    })
    if (datos.retryAfter) headers.set('Retry-After', datos.retryAfter)
    if (estado === 'STALE') {
      headers.set('Warning', '110 - "Respuesta temporal en caché"')
    }
    return new Response(datos.contenido, { status: datos.status, headers })
  }

  function hashUrl (url) {
    return createHash('sha256').update(url).digest('hex')
  }

  async function leerDeMySQL (url) {
    try {
      const [filas] = await bd().execute(
        `SELECT url, contenido, tipo, guardado_ms, expira_ms
           FROM jolpica_cache WHERE url_hash = ? LIMIT 1`,
        [hashUrl(url)]
      )
      const fila = filas[0]
      if (!fila || fila.url !== url) return null
      const guardado = Number(fila.guardado_ms)
      const expira = Number(fila.expira_ms)
      if (!Number.isSafeInteger(guardado) || !Number.isSafeInteger(expira)) return null
      if (typeof fila.contenido !== 'string') return null
      return { status: 200, contenido: fila.contenido, tipo: fila.tipo, guardado, expira }
    } catch (error) {
      avisoBD(error)
      return null // Sin MySQL, la web aún puede usar memoria o Jolpica.
    }
  }

  async function guardarEnMySQL (url, entrada) {
    try {
      await bd().execute(
        `INSERT INTO jolpica_cache (url_hash, url, contenido, tipo, guardado_ms, expira_ms)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           url = VALUES(url), contenido = VALUES(contenido), tipo = VALUES(tipo),
           guardado_ms = VALUES(guardado_ms), expira_ms = VALUES(expira_ms)`,
        [hashUrl(url), url, entrada.contenido, entrada.tipo, entrada.guardado, entrada.expira]
      )
    } catch (error) {
      avisoBD(error)
      // Si se corta MySQL, una respuesta válida de Jolpica sigue funcionando.
    }
  }

  function esperaRetryAfter (valor) {
    if (!valor) return 1800
    const segundos = Number(valor)
    const milisegundos = Number.isFinite(segundos)
      ? Math.max(0, segundos * 1000)
      : Date.parse(valor) - ahora()
    if (!Number.isFinite(milisegundos) || milisegundos > 5000) return null
    return Math.max(1000, milisegundos)
  }

  async function descargar (url, opciones, tiempoEspera = timeoutMs) {
    for (let intento = 0; intento < 2; intento++) {
      await reservarTurno()
      const controller = new AbortController()
      const cancelar = () => controller.abort()
      const signalExterna = opciones.signal
      if (signalExterna?.aborted) controller.abort()
      else signalExterna?.addEventListener('abort', cancelar, { once: true })
      const temporizador = setTimeout(() => controller.abort(), tiempoEspera)
      try {
        const respuesta = await solicitar(url, {
          ...opciones,
          method: 'GET',
          headers: {
            'User-Agent': 'NeumaticoRojo/0.1',
            ...(opciones.headers || {})
          },
          signal: controller.signal
        })
        const retryAfter = respuesta.headers.get('retry-after')
        if (respuesta.status === 429 && intento === 0) {
          const espera = esperaRetryAfter(retryAfter)
          console.warn(`[Jolpica] HTTP 429 en ${new URL(url).pathname}`)
          if (espera !== null) {
            await pausa(espera)
            continue
          }
        }
        if (!respuesta.ok) {
          console.warn(`[Jolpica] HTTP ${respuesta.status} en ${new URL(url).pathname}`)
        }
        return {
          status: respuesta.status,
          contenido: await respuesta.text(),
          tipo: respuesta.headers.get('content-type'),
          retryAfter
        }
      } finally {
        clearTimeout(temporizador)
        signalExterna?.removeEventListener('abort', cancelar)
      }
    }
    throw new Error('No se pudo completar la solicitud a Jolpica')
  }

  function respuestaValida (resultado) {
    if (resultado.status !== 200) return false
    // No guardar una página HTML de Cloudflare aunque devuelva HTTP 200.
    try {
      const datos = JSON.parse(resultado.contenido)
      return datos !== null && typeof datos.MRData === 'object' && datos.MRData !== null
    } catch (_) {
      return false
    }
  }

  function respaldoValido (entrada, url) {
    return entrada?.status === 200 &&
      ahora() >= entrada.guardado &&
      ahora() - entrada.guardado <= antiguedadMaximaRespaldo(url, ahora())
  }

  async function consultarJolpica (url, opciones = {}) {
    const direccion = new URL(String(url))
    if (direccion.protocol !== 'https:' || direccion.hostname !== 'api.jolpi.ca' ||
        !direccion.pathname.startsWith('/ergast/f1/')) {
      throw new Error('La función consultarJolpica solo acepta URLs de Jolpica F1')
    }
    const clave = direccion.toString()
    const memoria = cache.get(clave)
    if (memoria && memoria.expira > ahora()) {
      guardarEnMemoria(clave, memoria)
      return construirRespuesta(memoria, 'HIT')
    }
    if (enCurso.has(clave)) {
      const compartida = await enCurso.get(clave)
      return construirRespuesta(compartida.datos, compartida.estado === 'STALE' ? 'STALE' : 'SHARED')
    }

    const solicitud = (async () => {
      const persistida = await leerDeMySQL(clave)
      const anterior = persistida && (!memoria || persistida.guardado >= memoria.guardado)
        ? persistida : memoria

      if (anterior && anterior.expira > ahora()) {
        guardarEnMemoria(clave, anterior)
        return { datos: anterior, estado: 'HIT_DB' }
      }

      try {
        // Si ya existe un respaldo, no dejar esperando tanto al usuario.
        const esperaMaxima = respaldoValido(anterior, clave)
          ? Math.min(timeoutMs, 7000) : timeoutMs
        const resultado = await descargar(clave, opciones, esperaMaxima)
        if (respuestaValida(resultado)) {
          // Una respuesta grande sigue siendo útil, pero no se guarda en caché.
          if (Buffer.byteLength(resultado.contenido, 'utf8') > CACHE_MAX_BYTES_RESPUESTA) {
            return { datos: resultado, estado: 'MISS' }
          }
          const guardado = ahora()
          const entrada = { ...resultado, guardado, expira: guardado + duracionCache(clave, guardado) }
          guardarEnMemoria(clave, entrada)
          await guardarEnMySQL(clave, entrada)
          return { datos: entrada, estado: 'MISS' }
        }
        // Un 200 con HTML/JSON inválido tampoco debe reemplazar el respaldo.
        if (resultado.status === 200 || resultado.status === 429 || resultado.status >= 500) {
          throw Object.assign(new Error(`Jolpica respondió datos no disponibles (HTTP ${resultado.status})`),
            { respuestaOriginal: resultado })
        }
        // 4xx auténticos: respetarlos; no mostrar datos antiguos como si existieran.
        return { datos: resultado, estado: 'MISS' }
      } catch (error) {
        if (respaldoValido(anterior, clave)) {
          guardarEnMemoria(clave, anterior)
          console.warn(`[Jolpica] Respaldo MySQL/memoria para ${direccion.pathname}: ${error.message}`)
          return { datos: anterior, estado: 'STALE' }
        }
        if (error.respuestaOriginal) return { datos: error.respuestaOriginal, estado: 'MISS' }
        throw error
      }
    })()

    enCurso.set(clave, solicitud)
    try {
      const resultado = await solicitud
      return construirRespuesta(resultado.datos, resultado.estado)
    } finally {
      enCurso.delete(clave)
    }
  }

  return consultarJolpica
}

const consultarJolpica = crearServicioJolpica()
module.exports = consultarJolpica
// Solo para las pruebas: permite inyectar conexión y HTTP sin tocar los controladores.
module.exports.crearServicioJolpica = crearServicioJolpica
