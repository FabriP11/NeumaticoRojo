const CACHE_MAX_ENTRADAS = 250
const CACHE_MAX_BYTES_RESPUESTA = 2 * 1024 * 1024
const INTERVALO_PETICIONES_MS = 400 // Aproximadamente 2,5 solicitudes/s
const TIMEOUT_MS = 15000

const cache = new Map()
const enCurso = new Map()
let cola = Promise.resolve()
let proximoInicio = 0

function pausa (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Serializa el INICIO de las peticiones, no toda su duración.
async function reservarTurno () {
  const turno = cola.then(async () => {
    const espera = Math.max(0, proximoInicio - Date.now())
    if (espera > 0) await pausa(espera)
    proximoInicio = Date.now() + INTERVALO_PETICIONES_MS
  })

  cola = turno.catch(() => {})
  await turno
}

function duracionCache (url) {
  const ruta = new URL(url).pathname
  const anio = ruta.match(/\/f1\/(\d{4})(?:\/|\.json)/)?.[1]

  // Los resultados históricos y sus clasificaciones ya no cambian frecuentemente.
  if (anio && Number(anio) < new Date().getUTCFullYear()) {
    return 24 * 60 * 60 * 1000
  }

  // Datos estáticos de un piloto (sin temporada en la ruta).
  if (/\/f1\/drivers\/[^/]+\.json$/.test(ruta)) {
    return 24 * 60 * 60 * 1000
  }

  // Sesiones actuales: los resultados podrían publicarse durante una carrera.
  if (/\/(results|qualifying|sprint)\.json$/.test(ruta)) {
    return 2 * 60 * 1000
  }

  if (/standings\.json$/.test(ruta)) {
    return 5 * 60 * 1000
  }

  // Calendario, pilotos y escuderías de la temporada actual.
  return 30 * 60 * 1000
}

function guardar (url, datos, ttl) {
  cache.delete(url)
  cache.set(url, {
    ...datos,
    expira: Date.now() + ttl,
    guardado: Date.now()
  })

  // Limitar el número de entradas en memoria (FIFO aprox. con refresco por acceso).
  while (cache.size > CACHE_MAX_ENTRADAS) {
    cache.delete(cache.keys().next().value)
  }
}

function construirRespuesta (datos, estadoCache) {
  const headers = new Headers({
    'Content-Type': datos.tipo || 'application/json; charset=utf-8',
    'X-NeumaticoRojo-Cache': estadoCache
  })

  if (datos.retryAfter) headers.set('Retry-After', datos.retryAfter)
  if (estadoCache === 'STALE')
    headers.set('Warning', '110 - "Respuesta temporal en caché"')

  return new Response(datos.contenido, {
    status: datos.status,
    headers
  })
}

function esperaRetryAfter (valor) {
  if (!valor) return 1800

  const segundos = Number(valor)
  const milisegundos = Number.isFinite(segundos)
    ? Math.max(0, segundos * 1000)
    : Date.parse(valor) - Date.now()

  // Si el servidor solicita una espera larga (p. ej., límite por hora),
  // no bloquear durante minutos una petición HTTP de nuestra aplicación.
  if (!Number.isFinite(milisegundos) || milisegundos > 5000) return null
  return Math.max(1000, milisegundos)
}

async function descargar (url, opciones) {
  for (let intento = 0; intento < 2; intento++) {
    await reservarTurno()

    const controller = new AbortController()
    const cancelar = () => controller.abort()
    const signalExterna = opciones.signal

    if (signalExterna?.aborted) controller.abort()
    else signalExterna?.addEventListener('abort', cancelar, { once: true })

    const temporizador = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let respuesta

    try {
      respuesta = await globalThis.fetch(url, {
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
        console.warn(
          `[Jolpica] HTTP 429 en ${new URL(url).pathname}; Retry-After: ${
            retryAfter || 'no indicado'
          }`
        )

        if (espera !== null) {
          await pausa(espera)
          continue
        }
      }

      if (!respuesta.ok) {
        console.warn(
          `[Jolpica] HTTP ${respuesta.status} en ${new URL(url).pathname}`
        )
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

async function consultarJolpica (url, opciones = {}) {
  const direccion = new URL(String(url))
  if (
    direccion.protocol !== 'https:' ||
    direccion.hostname !== 'api.jolpi.ca' ||
    !direccion.pathname.startsWith('/ergast/f1/')
  ) {
    throw new Error(
      'La función consultarJolpica solo acepta URLs de Jolpica F1'
    )
  }

  const clave = direccion.toString()
  const anterior = cache.get(clave)

  if (anterior && anterior.expira > Date.now()) {
    // Refrescar posición en la caché de tamaño limitado.
    cache.delete(clave)
    cache.set(clave, anterior)
    return construirRespuesta(anterior, 'HIT')
  }

  // Esperar la misma petición que ya está realizando otro endpoint.
  if (enCurso.has(clave)) {
    return construirRespuesta(await enCurso.get(clave), 'SHARED')
  }

  const solicitud = (async () => {
    try {
      const resultado = await descargar(clave, opciones)
      if (
        resultado.status >= 200 &&
        resultado.status < 300 &&
        Buffer.byteLength(resultado.contenido, 'utf8') <=
          CACHE_MAX_BYTES_RESPUESTA
      ) {
        guardar(clave, resultado, duracionCache(clave))
      }

      if (resultado.status >= 500 || resultado.status === 429) {
        throw Object.assign(
          new Error(`Jolpica respondió HTTP ${resultado.status}`),
          {
            statusJolpica: resultado.status,
            respuestaOriginal: resultado
          }
        )
      }

      return resultado
    } catch (error) {
      // Continuidad temporal: una copia anterior reciente evita que toda la
      // página falle por un límite 429 o una caída breve del proveedor.
      const limiteAntiguedad = 30 * 60 * 1000
      if (
        anterior?.status === 200 &&
        Date.now() - anterior.expira <= limiteAntiguedad
      ) {
        console.warn(
          `[Jolpica] Usando datos de respaldo de ${new URL(clave).pathname}: ${
            error.message
          }`
        )
        return { ...anterior, esRespaldo: true }
      }
      if (error.respuestaOriginal) return error.respuestaOriginal
      throw error
    }
  })()

  enCurso.set(clave, solicitud)

  try {
    const resultado = await solicitud
    return construirRespuesta(
      resultado,
      resultado.esRespaldo ? 'STALE' : 'MISS'
    )
  } finally {
    enCurso.delete(clave)
  }
}

module.exports = consultarJolpica
