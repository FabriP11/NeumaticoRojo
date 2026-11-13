const { Router } = require('express')
const router = Router()

const requerirSesion = require('../middlewares/requerirSesion')
const requerirAdministrador = require('../middlewares/requerirAdministrador')

const ctrl = require('../controllers/importaciones/escuderias')
const ctrl2 = require('../controllers/importaciones/pilotos')
const ctrl3 = require('../controllers/importaciones/participaciones')
const ctrl4 = require('../controllers/importaciones/calendario')
const ctrl5 = require('../controllers/importaciones/sesiones')
const ctrl6 = require('../controllers/importaciones/resultados')
const ctrl7 = require('../controllers/importaciones/clasificaciones')

// Protección exclusiva de cada endpoint de importación
const proteccion = [requerirSesion, requerirAdministrador]

router.post('/api/importar-escuderias', proteccion, ctrl.importarEscuderias)
router.post('/api/importar-pilotos', proteccion, ctrl2.importarPilotos)
router.post(
  '/api/importar-participaciones',
  proteccion,
  ctrl3.importarParticipaciones
)
router.post('/api/importar-calendario', proteccion, ctrl4.importarCalendario)
router.post('/api/importar-sesiones', proteccion, ctrl5.importarSesiones)
router.post('/api/importar-resultados', proteccion, ctrl6.importarResultados)
router.post(
  '/api/importar-clasificaciones',
  proteccion,
  ctrl7.importarClasificaciones
)

module.exports = router
