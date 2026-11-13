const test = require('node:test')
const assert = require('node:assert/strict')
const verificarOrigen = require('../middlewares/verificarOrigen')
const { origenFrontend } = require('../config')
const origen = new URL(origenFrontend).origin

function simular (method, headers = {}) {
  let nextLlamado = false
  let codigo = null
  let cuerpo = null
  const req = {
    method,
    get (name) {
      return headers[name.toLowerCase()]
    }
  }
  const res = {
    status (numero) {
      codigo = numero
      return this
    },
    json (valor) {
      cuerpo = valor
      return this
    }
  }
  verificarOrigen(req, res, () => {
    nextLlamado = true
  })
  return { nextLlamado, codigo, cuerpo }
}

test('GET público se permite sin Origin', () => {
  assert.equal(simular('GET').nextLlamado, true)
})

test('OPTIONS de preflight se permite', () => {
  assert.equal(simular('OPTIONS').nextLlamado, true)
})

test('POST desde React se permite', () => {
  assert.equal(simular('POST', { origin: origen }).nextLlamado, true)
})

test('PUT desde React se permite', () => {
  assert.equal(simular('PUT', { origin: origen }).nextLlamado, true)
})

test('POST desde un sitio externo se rechaza', () => {
  const resultado = simular('POST', { origin: 'https://sitio-externo.example' })
  assert.equal(resultado.nextLlamado, false)
  assert.equal(resultado.codigo, 403)
})

test('POST sin Origin ni Referer se rechaza', () => {
  assert.equal(simular('POST').codigo, 403)
})

test('Referer del frontend se acepta si no hay Origin', () => {
  assert.equal(
    simular('DELETE', { referer: `${origen}/escuderias` }).nextLlamado,
    true
  )
})

test('Referer de otro sitio se rechaza', () => {
  assert.equal(
    simular('POST', { referer: 'https://sitio-externo.example/' }).codigo,
    403
  )
})

test('Origin explícito inválido no se puede eludir con Referer válido', () => {
  const resultado = simular('POST', {
    origin: 'https://sitio-externo.example',
    referer: `${origen}/`
  })
  assert.equal(resultado.codigo, 403)
})

test('Origin null se rechaza', () => {
  assert.equal(simular('POST', { origin: 'null' }).codigo, 403)
})
