const { Router } = require('express')
const requerirSesion = require('../middlewares/requerirSesion')
const ctrl = require('../controllers/notificaciones')
const { rateLimit } = require('express-rate-limit')

const router = Router()
router.get('/api/notificaciones/preferencias', requerirSesion, ctrl.consultarPreferencias)
router.put('/api/notificaciones/preferencias', requerirSesion, ctrl.guardarPreferencias)

// Limitar la creación de enlaces temporales para evitar abuso.
const limiteEnlaces = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { mensaje: 'Demasiados intentos. Volvé a probar en unos minutos.' }
})
router.get('/api/notificaciones/canales', requerirSesion, ctrl.consultarCanales)
router.put('/api/notificaciones/canales', requerirSesion, ctrl.guardarCanales)
router.post('/api/notificaciones/telegram/enlace', requerirSesion, limiteEnlaces, ctrl.generarEnlace)
router.post('/api/notificaciones/telegram/prueba', requerirSesion, ctrl.probarTelegram)
router.delete('/api/notificaciones/telegram', requerirSesion, ctrl.quitarTelegram)

module.exports = router
