// Prueba explícita: se envía SOLO al correo de Resend autorizado en .env.
// Nunca crea envíos programados ni modifica MySQL.
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const { prepararMensaje, enviarCorreo, destinatarioPermitido } = require('../services/recordatoriosCorreo')

const destinatario = (process.env.RESEND_CORREO_PRUEBA || '').trim()
if (!destinatario || !destinatarioPermitido(destinatario)) {
  console.error('Configurá RESEND_CORREO_PRUEBA con tu correo autorizado de Resend')
  process.exit(1)
}

const sesion = {
  gp: 'Gran Premio de Qatar', nombre: 'Clasificación',
  inicio: new Date('2026-11-28T18:00:00Z')
}
const minutos = 10
const mensaje = prepararMensaje({ ...sesion, minutos })
if (!process.argv.includes('--enviar')) {
  console.log('VISTA PREVIA (sin enviar):')
  console.log('Para:', destinatario)
  console.log('Asunto:', mensaje.subject)
  console.log('Texto:', mensaje.text)
  console.log('Para enviar la prueba: node scripts/probarPlantillaRecordatorio.js --enviar')
} else {
  enviarCorreo({
    destinatario, sesion, minutos,
    // Solo para esta prueba manual; único por ejecución.
    clave: `nr-prueba-${Date.now()}`
  }).then(id => console.log('Correo de prueba aceptado por Resend:', id))
    .catch(error => { console.error('Error:', error.message); process.exitCode = 1 })
}
