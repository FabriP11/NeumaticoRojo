const { buscarRolUsuario } = require('../models/auth')

async function requerirAdministrador (req, res, next) {
  // Este middleware debe ejecutarse después de requerirSesion.
  if (!Number.isInteger(req.idUsuario) || req.idUsuario < 1) {
    return res.status(401).json({
      mensaje: 'Debés iniciar sesión'
    })
  }

  try {
    // Consultar el rol actual en MySQL; no confiar en un rol enviado por React.
    const [usuarios] = await buscarRolUsuario(req.idUsuario)

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensaje: 'La cuenta ya no existe'
      })
    }

    // Ajustar estos valores si tu base de datos utiliza otro nombre de rol.
    const rolesPermitidos = ['admin', 'administrador']

    if (!rolesPermitidos.includes(usuarios[0].rol)) {
      return res.status(403).json({
        mensaje: 'No tenés permisos para importar datos'
      })
    }

    next()
  } catch (error) {
    console.error('Error al verificar rol administrativo:', error.message)

    return res.status(500).json({
      mensaje: 'No se pudieron verificar los permisos'
    })
  }
}

module.exports = requerirAdministrador
