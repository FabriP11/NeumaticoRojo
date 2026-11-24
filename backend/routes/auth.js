const { Router } = require('express')
const router = Router()
const ctrl = require('../controllers/auth')
const limitarLogin = require('../middlewares/limitarLogin')
const limitarRegistro = require('../middlewares/limitarRegistro')
const requerirSesion = require('../middlewares/requerirSesion')

// Permite a la pagina Registro mostrar el campo de invitacion cuando corresponde.
router.get('/api/registro/configuracion', ctrl.configuracionRegistro)

// El registro beta requiere codigo; ademas se limitan los intentos por IP.
router.post('/api/registro', limitarRegistro, ctrl.registrar)
router.post('/api/login', limitarLogin, ctrl.iniciarSesion)
router.get('/api/usuario-actual', ctrl.usuarioActual)
router.post('/api/logout', ctrl.cerrarSesion)
router.put('/api/mi-avatar', requerirSesion, ctrl.actualizarAvatar)

module.exports = router
