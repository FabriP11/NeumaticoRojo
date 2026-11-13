const jwt = require('jsonwebtoken')

// Middleware original trasladado sin cambiar su comportamiento.
function requerirSesion (req, res, next) {
  const token = req.cookies?.nr_sesion

  if (!token) {
    return res.status(401).json({
      mensaje: 'Debés iniciar sesión'
    })
  }

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    })

    if (!Number.isInteger(datos.id_usuario) || datos.id_usuario < 1) {
      return res.status(401).json({
        mensaje: 'Sesión inválida'
      })
    }

    // Identificar al usuario desde su token
    req.idUsuario = datos.id_usuario

    next()
  } catch (error) {
    return res.status(401).json({
      mensaje: 'La sesión no es válida o expiró'
    })
  }
}

module.exports = requerirSesion
