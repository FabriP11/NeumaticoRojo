const test = require('node:test')
const assert = require('node:assert/strict')
const {
  temporadaValida,
  rondaValida,
  identificadorF1Valido,
  tipoSesionValido,
  fechaISOValida
} = require('../utils/validaciones')
const {
  validarTemporada,
  validarRonda,
  validarIdentificador,
  validarTipoSesion,
  validarFecha
} = require('../middlewares/validarParametros')

function ejecutar (middleware, { query = {}, params = {} } = {}) {
  const resultado = { siguiente: false, estado: null, cuerpo: null }
  const res = {
    status (codigo) {
      resultado.estado = codigo
      return this
    },
    json (datos) {
      resultado.cuerpo = datos
      return this
    }
  }
  middleware({ query, params }, res, () => {
    resultado.siguiente = true
  })
  return resultado
}

test('temporadas F1: válidas y fuera de rango', () => {
  for (const anio of ['1950', '2020', '2026', '2100']) {
    assert.equal(temporadaValida(anio), true, anio)
  }
  for (const anio of [
    '1949',
    '2101',
    '202',
    'current',
    '0000',
    '',
    '2026/1',
    '2026x',
    2026,
    ['2026']
  ]) {
    assert.equal(temporadaValida(anio), false, String(anio))
  }
})

test('current solo se permite cuando la ruta lo autoriza', () => {
  assert.equal(
    ejecutar(validarTemporada({ permitirCurrent: true }), {
      query: { temporada: 'current' }
    }).siguiente,
    true
  )
  assert.equal(
    ejecutar(validarTemporada(), { query: { temporada: 'current' } }).estado,
    400
  )
})

test('temporada omitida sigue usando el valor por defecto de los controladores', () => {
  assert.equal(ejecutar(validarTemporada()).siguiente, true)
  assert.equal(ejecutar(validarTemporada({ obligatoria: true })).estado, 400)
})

test('temporada inválida devuelve 400 y no continúa', () => {
  const r = ejecutar(validarTemporada(), {
    query: { temporada: ['2025', '2026'] }
  })
  assert.equal(r.estado, 400)
  assert.deepEqual(r.cuerpo, { mensaje: 'Temporada inválida' })
  assert.equal(r.siguiente, false)
})

test('ronda entre 1 y 30, sin ceros iniciales ni decimales', () => {
  for (const v of ['1', '12', '30']) assert.equal(rondaValida(v), true)
  for (const v of ['0', '01', '31', '-1', '1.5', '', '9999', '2x', 3, ['1']])
    assert.equal(rondaValida(v), false)
})

test('la ronda puede omitirse en resultados pero no en resumen-sesiones', () => {
  assert.equal(ejecutar(validarRonda()).siguiente, true)
  assert.equal(ejecutar(validarRonda({ obligatoria: true })).estado, 400)
  assert.equal(ejecutar(validarRonda(), { query: { ronda: '50' } }).estado, 400)
})

test('identificadores de piloto y escudería', () => {
  for (const id of [
    'max_verstappen',
    'hamilton',
    'red_bull',
    'ferrari',
    'rb'
  ]) {
    assert.equal(identificadorF1Valido(id), true)
  }
  for (const id of [
    'a/b',
    '../x',
    'a b',
    'a%2Fb',
    '',
    'a'.repeat(51),
    ['ferrari']
  ]) {
    assert.equal(identificadorF1Valido(id), false)
  }
  assert.equal(
    ejecutar(validarIdentificador('escuderia'), { params: { id: 'red_bull' } })
      .siguiente,
    true
  )
  assert.equal(
    ejecutar(validarIdentificador('piloto'), { params: { id: '..' } }).estado,
    400
  )
})

test('sesiones: clasificación o sprint', () => {
  assert.equal(tipoSesionValido('clasificacion'), true)
  assert.equal(tipoSesionValido('sprint'), true)
  assert.equal(tipoSesionValido('carrera'), false)
  assert.equal(ejecutar(validarTipoSesion).siguiente, true)
  assert.equal(
    ejecutar(validarTipoSesion, { query: { tipo: 'sprint' } }).siguiente,
    true
  )
  assert.equal(
    ejecutar(validarTipoSesion, { query: { tipo: 'otra' } }).estado,
    400
  )
})

test('fecha ISO real y válida', () => {
  for (const f of ['2026-03-08', '2024-02-29'])
    assert.equal(fechaISOValida(f), true)
  for (const f of [
    '2026-02-29',
    '2026-13-01',
    '2026-1-01',
    '2026-11-32',
    '2026/11/12',
    '',
    ['2026-03-08']
  ]) {
    assert.equal(fechaISOValida(f), false)
  }
  assert.equal(
    ejecutar(validarFecha, { query: { fecha: '2026-03-08' } }).siguiente,
    true
  )
  assert.equal(
    ejecutar(validarFecha, { query: { fecha: '2026-02-29' } }).estado,
    400
  )
})
