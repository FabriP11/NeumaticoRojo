const { Router } = require('express')
const router = Router()
const ctrl = require('../controllers/general')

router.get('/api/health', ctrl.health)
router.get('/', ctrl.inicioApi)
// Solo para diagnóstico local, nunca exponer la base de datos en producción.
if (process.env.NODE_ENV !== 'production') {
  router.get('/api/db-test', ctrl.probarBase)
}

module.exports = router
