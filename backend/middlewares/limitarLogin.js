// NeumaticoRojo — limita intentos fallidos de inicio de sesión por IP.
const { rateLimit } = require('express-rate-limit')

const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  // Los inicios de sesión correctos no consumen el cupo.
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    mensaje:
      'Demasiados intentos de inicio de sesión. Intentá nuevamente más tarde.'
  }
})

module.exports = limitarLogin
