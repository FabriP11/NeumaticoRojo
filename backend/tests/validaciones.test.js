const test = require('node:test')
const assert = require('node:assert/strict')
const { temporadaValida, identificadorF1Valido } = require('../utils/validaciones')

test('temporada válida de cuatro dígitos', () => {
  assert.equal(temporadaValida('2026'), true)
  assert.equal(temporadaValida('202'), false)
  assert.equal(temporadaValida('current'), false)
})

test('identificador de Fórmula 1', () => {
  assert.equal(identificadorF1Valido('red_bull'), true)
  assert.equal(identificadorF1Valido('pilot/1'), false)
})
