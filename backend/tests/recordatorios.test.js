const test = require('node:test')
const assert = require('node:assert/strict')
const { fechaUTC, sesionesCalendario, avisoPendiente } = require('../services/recordatoriosHorarios')
const { prepararMensaje } = require('../services/recordatoriosCorreo')

test('UTC de Jolpica y offset no cambian de instante', () => {
  assert.equal(fechaUTC('2026-11-27', '13:30:00Z').toISOString(), '2026-11-27T13:30:00.000Z')
  assert.equal(fechaUTC('2026-11-27', '10:30:00-03:00').toISOString(), '2026-11-27T13:30:00.000Z')
  assert.equal(fechaUTC('2026-11-27', null), null)
})

test('calendario: sesiones, sin duplicar Sprint Qualifying', () => {
  const eventos = sesionesCalendario([{
    season: '2026', round: '23', raceName: 'Qatar Grand Prix',
    date: '2026-11-29', time: '16:00:00Z',
    FirstPractice: { date: '2026-11-27', time: '13:30:00Z' },
    SprintQualifying: { date: '2026-11-27', time: '17:00:00Z' },
    SprintShootout: { date: '2026-11-27', time: '17:00:00Z' }
  }])
  assert.equal(eventos.filter(s => s.tipo === 'clasificacion_sprint').length, 1)
  assert.deepEqual(eventos.map(s => s.tipo), ['fp1', 'clasificacion_sprint', 'carrera'])
})

test('solo genera aviso en la ventana apropiada', () => {
  const inicio = new Date('2026-11-27T13:30:00Z')
  assert.equal(avisoPendiente(inicio, 10, new Date('2026-11-27T13:20:00Z')), true)
  assert.equal(avisoPendiente(inicio, 10, new Date('2026-11-27T13:19:59Z')), false)
  assert.equal(avisoPendiente(inicio, 10, new Date('2026-11-27T13:21:31Z')), false)
  assert.equal(avisoPendiente(inicio, 5, new Date('2026-11-27T13:20:00Z')), false)
  assert.equal(avisoPendiente(inicio, 5, new Date('2026-11-27T13:25:00Z')), true)
})

test('HTML escapado: no inyecta etiquetas de nombres externos', () => {
  const mensaje = prepararMensaje({ gp: '<script>alert(1)</script>', nombre: 'Clasificación',
    inicio: new Date('2026-11-28T18:00:00Z'), minutos: 10 })
  assert.ok(mensaje.html.includes('&lt;script&gt;'))
  assert.ok(!mensaje.html.includes('<script>'))
  assert.ok(mensaje.subject.includes('10 minutos'))
})
