// Vista previa de recordatorios SIN enviar correos ni modificar MySQL.
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const { procesarRecordatorios } = require('../services/recordatoriosProceso')

const argumentoFecha = process.argv.find(a => a.startsWith('--fecha='))
const fecha = argumentoFecha ? new Date(argumentoFecha.slice('--fecha='.length)) : new Date()
if (!Number.isFinite(fecha.getTime())) {
  console.error('Fecha inválida. Usá --fecha=2026-11-27T13:20:00Z')
  process.exit(1)
}
console.log('SIMULACIÓN: no se enviarán correos ni se escribirá en MySQL')
console.log(`Fecha usada (UTC): ${fecha.toISOString()}`)
procesarRecordatorios({ ahora: fecha, simular: true, mostrarProximos: true })
  .then(r => console.log('Resumen:', r))
  .catch(e => { console.error('Error:', e.message); process.exitCode = 1 })
