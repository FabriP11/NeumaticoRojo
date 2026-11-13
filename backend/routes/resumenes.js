const { Router } = require('express')
const router = Router()
const ctrl = require('../controllers/resumenes')
const { validarTemporada, validarRonda, validarFecha } = require('../middlewares/validarParametros')

router.get('/api/resumen-sesiones', validarTemporada(), validarRonda({ obligatoria: true }), ctrl.resumenSesiones)
router.get('/api/resumen-practicas', validarTemporada({ obligatoria: true }), validarFecha, ctrl.resumenPracticas)

module.exports = router
