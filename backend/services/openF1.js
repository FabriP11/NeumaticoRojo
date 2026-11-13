// Servicio externo OpenF1: consulta JSON con timeout.
async function consultarOpenF1 (ruta) {
  const respuesta = await fetch(`https://api.openf1.org/v1/${ruta}`, {
    signal: AbortSignal.timeout(15000)
  })

  if (!respuesta.ok) {
    throw new Error(`OpenF1 respondió ${respuesta.status}`)
  }

  return respuesta.json()
}

module.exports = consultarOpenF1
