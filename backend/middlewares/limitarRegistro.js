// Limitar los intentos de registro, incluyendo codigos de invitacion fallidos.
const { rateLimit } = require('express-rate-limit')

const limitarRegistro = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    mensaje: 'Demasiados intentos de registro. Intentá de nuevo más tarde.'
  }
})

module.exports = limitarRegistro
