const { procesarRecordatorios } = require('./recordatoriosProceso')
const { procesarRecordatoriosTelegram } = require('./recordatoriosTelegram')

// Se ejecuta dentro del servidor web únicamente cuando se habilita por .env.
function iniciarRecordatorios () {
  let ocupado = false
  async function revisar () {
    if (ocupado) return
    ocupado = true
    try {
      // Ejecutarlos por separado: un fallo de correo no impide los avisos de Telegram.
      const resultados = await Promise.allSettled([
        procesarRecordatorios(),
        procesarRecordatoriosTelegram()
      ])
      for (const item of resultados) {
        if (item.status === 'rejected') {
          console.error('Recordatorios: canal no disponible:', item.reason.message)
        } else if (item.value.enviados || item.value.errores) {
          console.log(`Recordatorios: ${item.value.enviados} enviados, ${item.value.errores} errores`)
        }
      }
    } catch (error) {
      console.error('Recordatorios: no se pudo revisar:', error.message)
    } finally {
      ocupado = false
    }
  }
  void revisar()
  const intervalo = setInterval(revisar, 30000)
  return () => clearInterval(intervalo)
}

module.exports = { iniciarRecordatorios }
