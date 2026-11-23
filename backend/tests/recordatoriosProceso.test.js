const test = require('node:test')
const assert = require('node:assert/strict')
const { procesarRecordatorios } = require('../services/recordatoriosProceso')

const usuario = {
  id_usuario: 2, minutos_antes: 10, sesiones: '["fp1","carrera"]',
  correo: 'destinatario-de-prueba@example.invalid', activo: 1
}
const respuestaCalendario = {
  ok: true,
  json: async () => ({ MRData: { RaceTable: { Races: [ {
    season: '2026', round: '23', raceName: 'Qatar Grand Prix',
    date: '2026-11-29', time: '16:00:00Z',
    FirstPractice: { date: '2026-11-27', time: '13:30:00Z' }
  } ] } } })
}

test('simular no escribe en MySQL ni envía correos', async () => {
  let escrituras = 0
  let envios = 0
  const bd = { execute: async sql => {
    if (!sql.includes('FROM preferencias_notificaciones')) escrituras++
    return [[usuario]]
  } }
  const r = await procesarRecordatorios({
    ahora: new Date('2026-11-27T13:20:15Z'), simular: true,
    conexion: bd, consultar: async () => respuestaCalendario,
    enviar: async () => { envios++ }, informar: () => {}
  })
  assert.equal(r.elegibles, 1)
  assert.equal(r.enviados, 0)
  assert.equal(escrituras, 0)
  assert.equal(envios, 0)
})

test('la reserva impide envíos duplicados', async () => {
  let envios = 0
  const bd = { execute: async sql => {
    if (sql.includes('FROM preferencias_notificaciones') && sql.includes('WHERE p.activo')) return [[usuario]]
    if (sql.startsWith('INSERT IGNORE')) return [{ affectedRows: 0 }]
    if (sql.includes("SET estado='procesando'")) return [{ affectedRows: 0 }]
    throw new Error('Consulta inesperada: ' + sql)
  } }
  const r = await procesarRecordatorios({
    ahora: new Date('2026-11-27T13:20:15Z'),
    conexion: bd, consultar: async () => respuestaCalendario,
    enviar: async () => { envios++ }, permitido: () => true, informar: () => {}
  })
  assert.equal(r.enviados, 0)
  assert.equal(envios, 0)
})

test('cuando la reserva tiene éxito se envía una vez y registra el id', async () => {
  let envios = 0, confirmacion = 0
  const bd = { execute: async sql => {
    if (sql.includes('FROM preferencias_notificaciones') && sql.includes('WHERE p.activo')) return [[usuario]]
    if (sql.startsWith('INSERT IGNORE')) return [{ affectedRows: 1 }]
    if (sql.includes("SET estado='procesando'")) return [{ affectedRows: 1 }]
    if (sql.includes('WHERE p.id_usuario')) return [[usuario]]
    if (sql.includes("SET estado='enviado'")) { confirmacion++; return [{ affectedRows: 1 }] }
    throw new Error('Consulta inesperada: ' + sql)
  } }
  const r = await procesarRecordatorios({
    ahora: new Date('2026-11-27T13:20:15Z'),
    conexion: bd, consultar: async () => respuestaCalendario,
    enviar: async () => { envios++; return 'resend-id-ficticio' },
    permitido: () => true, informar: () => {}
  })
  assert.equal(r.enviados, 1)
  assert.equal(envios, 1)
  assert.equal(confirmacion, 1)
})
