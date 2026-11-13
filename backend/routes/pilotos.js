const { Router } = require('express')
const router = Router()
const ctrl = require('../controllers/pilotos')
const { validarTemporada, validarIdentificador } = require('../middlewares/validarParametros')

router.get('/api/pilotos/:id', validarIdentificador('piloto'), validarTemporada(), ctrl.obtenerPiloto)

module.exports = router
