const { Router } = require('express')
const router = Router()
const ctrl = require('../controllers/calendario')
const { validarTemporada } = require('../middlewares/validarParametros')

router.get('/api/carreras', validarTemporada({ permitirCurrent: true }), ctrl.obtenerCarreras)

module.exports = router
