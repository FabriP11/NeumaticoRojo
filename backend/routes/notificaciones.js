const { Router } = require('express')
const requerirSesion = require('../middlewares/requerirSesion')
const ctrl = require('../controllers/notificaciones')

const router = Router()
router.get('/api/notificaciones/preferencias', requerirSesion, ctrl.consultarPreferencias)
router.put('/api/notificaciones/preferencias', requerirSesion, ctrl.guardarPreferencias)

module.exports = router
