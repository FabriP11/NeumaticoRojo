const { Router } = require('express')
const router = Router()
const ctrl = require('../controllers/escuderias')
const { validarTemporada, validarIdentificador } = require('../middlewares/validarParametros')

router.get('/api/escuderias/:id', validarIdentificador('escuderia'), validarTemporada(), ctrl.obtenerEscuderia)

module.exports = router
