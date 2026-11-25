const test = require('node:test')
const assert = require('node:assert/strict')
const { crearServicioJolpica } = require('../services/jolpicaCache')

const URL_HISTORICA = 'https://api.jolpi.ca/ergast/f1/2024.json?limit=100'
const URL_ACTUAL = 'https://api.jolpi.ca/ergast/f1/2026/23/results.json?limit=100'
const JSON_VALIDO = JSON.stringify({ MRData: { RaceTable: { Races: [{ round: '1' }] } } })
const SEGUNDO = 1000
const DIA = 24 * 60 * 60 * SEGUNDO
const INICIO = Date.parse('2026-11-24T20:00:00Z')

function baseFalsa () {
  const entradas = new Map()
  return {
    entradas,
    async execute (sql, parametros) {
      if (sql.includes('SELECT url, contenido, tipo')) {
        const fila = entradas.get(parametros[0])
        return [fila ? [fila] : []]
      }
      if (sql.includes('INSERT INTO jolpica_cache')) {
        const [hash, url, contenido, tipo, guardado_ms, expira_ms] = parametros
        entradas.set(hash, { url, contenido, tipo, guardado_ms, expira_ms })
        return [{ affectedRows: 1 }]
      }
      throw new Error('SQL no contemplado en la prueba')
    }
  }
}

function respuesta (status, texto = JSON_VALIDO, tipo = 'application/json') {
  return new Response(texto, { status, headers: { 'Content-Type': tipo } })
}

function servicio ({ bd, reloj, solicitar }) {
  return crearServicioJolpica({ conexion: bd, ahora: () => reloj.valor,
    solicitar, intervaloMs: 0, timeoutMs: 1000 })
}

test('guarda un JSON válido en MySQL y reutiliza la entrada en memoria', async () => {
  const bd = baseFalsa()
  const reloj = { valor: INICIO }
  let llamadas = 0
  const consultar = servicio({ bd, reloj, solicitar: async () => { llamadas++; return respuesta(200) } })
  const primera = await consultar(URL_HISTORICA)
  assert.equal(primera.status, 200)
  assert.equal(primera.headers.get('X-NeumaticoRojo-Cache'), 'MISS')
  assert.deepEqual(await primera.json(), JSON.parse(JSON_VALIDO))
  assert.equal(bd.entradas.size, 1)
  assert.equal((await consultar(URL_HISTORICA)).headers.get('X-NeumaticoRojo-Cache'), 'HIT')
  assert.equal(llamadas, 1)
})

test('tras un reinicio lee MySQL sin consultar Jolpica si el dato sigue vigente', async () => {
  const bd = baseFalsa()
  const reloj = { valor: INICIO }
  await servicio({ bd, reloj, solicitar: async () => respuesta(200) })(URL_HISTORICA)
  const reiniciado = servicio({ bd, reloj, solicitar: async () => { throw new Error('No debe llamar a la red') } })
  const resultado = await reiniciado(URL_HISTORICA)
  assert.equal(resultado.headers.get('X-NeumaticoRojo-Cache'), 'HIT_DB')
  assert.equal((await resultado.json()).MRData.RaceTable.Races[0].round, '1')
})

test('si Jolpica devuelve 530, usa datos históricos caducados de MySQL', async () => {
  const bd = baseFalsa()
  const reloj = { valor: INICIO }
  await servicio({ bd, reloj, solicitar: async () => respuesta(200) })(URL_HISTORICA)
  reloj.valor += 26 * 60 * 60 * SEGUNDO
  const reiniciado = servicio({ bd, reloj, solicitar: async () => respuesta(530, 'Cloudflare caído', 'text/html') })
  const resultado = await reiniciado(URL_HISTORICA)
  assert.equal(resultado.status, 200)
  assert.equal(resultado.headers.get('X-NeumaticoRojo-Cache'), 'STALE')
  assert.ok(resultado.headers.get('Warning')?.includes('110'))
  assert.deepEqual(await resultado.json(), JSON.parse(JSON_VALIDO))
})

test('la caché no se contamina con errores ni HTML aunque lleguen como HTTP 200', async () => {
  const bd = baseFalsa()
  const reloj = { valor: INICIO }
  await servicio({ bd, reloj, solicitar: async () => respuesta(200) })(URL_ACTUAL)
  reloj.valor += 4 * 60 * SEGUNDO
  const consultar = servicio({ bd, reloj, solicitar: async () => respuesta(200, '<html>error 1033</html>', 'text/html') })
  const resultado = await consultar(URL_ACTUAL)
  assert.equal(resultado.headers.get('X-NeumaticoRojo-Cache'), 'STALE')
  assert.deepEqual(await resultado.json(), JSON.parse(JSON_VALIDO))
  assert.equal(bd.entradas.size, 1)
})

test('un 404 auténtico no se transforma en una respuesta antigua', async () => {
  const bd = baseFalsa()
  const reloj = { valor: INICIO }
  await servicio({ bd, reloj, solicitar: async () => respuesta(200) })(URL_ACTUAL)
  reloj.valor += 4 * 60 * SEGUNDO
  const resultado = await servicio({ bd, reloj, solicitar: async () => respuesta(404, '{}') })(URL_ACTUAL)
  assert.equal(resultado.status, 404)
  assert.equal(resultado.headers.get('X-NeumaticoRojo-Cache'), 'MISS')
})

test('no utiliza un respaldo demasiado antiguo de una sesión actual', async () => {
  const bd = baseFalsa()
  const reloj = { valor: INICIO }
  await servicio({ bd, reloj, solicitar: async () => respuesta(200) })(URL_ACTUAL)
  reloj.valor += 2 * DIA
  const resultado = await servicio({ bd, reloj, solicitar: async () => respuesta(530, 'Cloudflare caído') })(URL_ACTUAL)
  assert.equal(resultado.status, 530)
})

test('no requiere MySQL disponible para consultar y servir desde memoria', async () => {
  const bd = { execute: async () => { throw new Error('sin conexión MySQL') } }
  const reloj = { valor: INICIO }
  let llamadas = 0
  const consultar = servicio({ bd, reloj, solicitar: async () => { llamadas++; return respuesta(200) } })
  assert.equal((await consultar(URL_HISTORICA)).status, 200)
  assert.equal((await consultar(URL_HISTORICA)).headers.get('X-NeumaticoRojo-Cache'), 'HIT')
  assert.equal(llamadas, 1)
})

test('una respuesta JSON grande se entrega pero no se guarda', async () => {
  const bd = baseFalsa()
  const reloj = { valor: INICIO }
  const grande = JSON.stringify({ MRData: { contenido: 'a'.repeat(2 * 1024 * 1024) } })
  const consultar = servicio({ bd, reloj, solicitar: async () => respuesta(200, grande) })
  const resultado = await consultar(URL_HISTORICA)
  assert.equal(resultado.status, 200)
  assert.equal(bd.entradas.size, 0)
})

test('solo permite consultar el dominio y las rutas de Jolpica F1', async () => {
  const consultar = servicio({ bd: baseFalsa(), reloj: { valor: INICIO }, solicitar: async () => respuesta(200) })
  await assert.rejects(consultar('https://example.com/ergast/f1/2026.json'), /solo acepta URLs/)
  await assert.rejects(consultar('http://api.jolpi.ca/ergast/f1/2026.json'), /solo acepta URLs/)
})


test('dos solicitudes simultáneas comparten la misma petición a Jolpica', async () => {
  const bd = baseFalsa()
  const reloj = { valor: INICIO }
  let llamadas = 0
  const consultar = servicio({ bd, reloj, solicitar: async () => {
    llamadas++
    await new Promise(resolve => setTimeout(resolve, 15))
    return respuesta(200)
  } })
  const [a, b] = await Promise.all([consultar(URL_HISTORICA), consultar(URL_HISTORICA)])
  assert.equal(llamadas, 1)
  assert.equal(a.status, 200)
  assert.equal(b.status, 200)
  assert.deepEqual(
    new Set([a.headers.get('X-NeumaticoRojo-Cache'), b.headers.get('X-NeumaticoRojo-Cache')]),
    new Set(['MISS', 'SHARED'])
  )
})
