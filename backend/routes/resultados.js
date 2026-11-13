const { Router } = require('express')
const router = Router()
const ctrl = require('../controllers/resultados')
const { validarTemporada, validarRonda, validarTipoSesion } = require('../middlewares/validarParametros')

router.get('/api/resultados', validarTemporada(), validarRonda(), ctrl.obtenerResultados)
router.get('/api/resultados-sesion', validarTemporada(), validarRonda(), validarTipoSesion, ctrl.obtenerResultadosSesion)

module.exports = router
