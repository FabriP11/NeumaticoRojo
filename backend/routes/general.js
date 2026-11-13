const { Router } = require('express')
const router = Router()
const ctrl = require('../controllers/general')

router.get('/api/health', ctrl.health)
router.get('/', ctrl.inicioApi)
router.get('/api/db-test', ctrl.probarBase)

module.exports = router
