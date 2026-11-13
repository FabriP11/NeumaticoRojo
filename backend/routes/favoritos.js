const { Router } = require('express')
const router = Router()
const ctrl = require('../controllers/favoritos')
const requerirSesion = require('../middlewares/requerirSesion')
const { validarTemporada } = require('../middlewares/validarParametros')

router.put('/api/mis-favoritos', requerirSesion, ctrl.actualizarFavoritos)
router.get('/api/resumen-favoritos', requerirSesion, validarTemporada(), ctrl.obtenerResumenFavoritos)
router.get('/api/opciones-favoritos', ctrl.opcionesFavoritos)

module.exports = router
