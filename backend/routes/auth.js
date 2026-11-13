const { Router } = require('express')
const router = Router()
const ctrl = require('../controllers/auth')
const limitarLogin = require('../middlewares/limitarLogin')

// Registro y login son públicos. Sólo el login tiene límite de intentos.
router.post('/api/registro', ctrl.registrar)
router.post('/api/login', limitarLogin, ctrl.iniciarSesion)
router.get('/api/usuario-actual', ctrl.usuarioActual)
router.post('/api/logout', ctrl.cerrarSesion)

module.exports = router
