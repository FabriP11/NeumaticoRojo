const { procesarRecordatorios } = require('./recordatoriosProceso')

// Se ejecuta dentro del servidor web únicamente cuando se habilita por .env.
function iniciarRecordatorios () {
  let ocupado = false
  async function revisar () {
    if (ocupado) return
    ocupado = true
    try {
      const { enviados, errores } = await procesarRecordatorios()
      if (enviados || errores) console.log(`Recordatorios: ${enviados} enviados, ${errores} errores`)
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
