const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { origenFrontend } = require('./config')
const verificarOrigen = require('./middlewares/verificarOrigen')

const app = express()

// CORS permite las solicitudes con credenciales del frontend autorizado.
app.use(cors({ origin: origenFrontend, credentials: true }))
app.use(cookieParser())
app.use(express.json())

// Protección contra CSRF: comprobar el origen antes de procesar
// cualquier solicitud que pueda modificar datos (POST, PUT, PATCH, DELETE).
app.use(verificarOrigen)

// Mantener intactos los endpoints y el orden actual de los routers.
app.use(require('./routes/favoritos'))
app.use(require('./routes/general'))
app.use(require('./routes/calendario'))
app.use(require('./routes/clasificaciones'))
app.use(require('./routes/pilotos'))
app.use(require('./routes/resultados'))
app.use(require('./routes/escuderias'))
app.use(require('./routes/importaciones'))
app.use(require('./routes/auth'))
app.use(require('./routes/resumenes'))

// Estos middlewares deben quedar SIEMPRE despues de todas las rutas.
app.use(require('./middlewares/rutaNoEncontrada'))
app.use(require('./middlewares/manejarErrores'))

module.exports = app
