// Protección CSRF mediante validación del origen de la solicitud.
// No depende del frontend ni de librerías adicionales.
// Importante: FRONTEND_URL debe ser el origen exacto donde corre React.
const { origenFrontend } = require('../config')

// El navegador envía Origin en las solicitudes que cambian el estado.
// Si no existe, Referer puede servir como comprobación secundaria.
const origenPermitido = new URL(origenFrontend).origin
const metodosSeguros = new Set(['GET', 'HEAD', 'OPTIONS'])

function verificarOrigen (req, res, next) {
  if (metodosSeguros.has(req.method)) return next()

  const origin = req.get('Origin')
  const referer = req.get('Referer')

  // Si el navegador aporta Origin, no recurrimos a Referer para
  // evitar que un Origin explícitamente rechazado sea ignorado.
  if (origin) {
    if (origin === origenPermitido) return next()
  } else if (referer) {
    try {
      if (new URL(referer).origin === origenPermitido) return next()
    } catch (_) {
      // Referer malformado: bloquear.
    }
  }

  // Sin un origen verificable, no aceptamos operaciones de escritura.
  // Las peticiones GET siguen siendo públicas y no se ven afectadas.
  return res.status(403).json({
    mensaje: 'Solicitud bloqueada: origen no permitido'
  })
}

module.exports = verificarOrigen
