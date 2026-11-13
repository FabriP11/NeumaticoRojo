const { Router } = require('express')
const router = Router()
const ctrl = require('../controllers/clasificaciones')
const { validarTemporada } = require('../middlewares/validarParametros')

router.get('/api/clasificaciones', validarTemporada({ permitirCurrent: true }), ctrl.obtenerClasificaciones)
router.get('/api/tablas-inicio', validarTemporada(), ctrl.tablasInicio)
router.get('/api/dorsales-temporada', validarTemporada(), ctrl.dorsalesTemporada)

module.exports = router
