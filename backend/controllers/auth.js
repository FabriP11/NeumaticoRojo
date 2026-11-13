// NeumaticoRojo — controlador auth.
const model = require('../models/auth')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const registrar = async (req, res) => {
  try {
    // 1. Obtener los datos enviados por el usuario
    const { nombre_usuario, correo, contrasena } = req.body || {}

    // 2. Validar los campos
    if (
      typeof nombre_usuario !== 'string' ||
      typeof correo !== 'string' ||
      typeof contrasena !== 'string'
    ) {
      return res.status(400).json({
        mensaje: 'Todos los campos son obligatorios'
      })
    }

    const nombre = nombre_usuario.trim()
    const email = correo.trim().toLowerCase()

    // Validar nombre de usuario
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(nombre)) {
      return res.status(400).json({
        mensaje:
          'El usuario debe tener entre 3 y 50 caracteres: letras, números o guion bajo'
      })
    }

    // Validar correo
    if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        mensaje: 'Ingresá un correo electrónico válido'
      })
    }

    // Validar contraseña
    if (contrasena.length < 8 || Buffer.byteLength(contrasena, 'utf8') > 72) {
      return res.status(400).json({
        mensaje:
          'La contraseña debe tener al menos 8 caracteres y no superar 72 bytes'
      })
    }

    // 3. Proteger la contraseña
    const contrasenaHash = await bcrypt.hash(contrasena, 12)

    // 4. Guardar el usuario en MySQL
    const [resultado] = await model.registrarUsuario(
      nombre,
      email,
      contrasenaHash
    )

    // 5. Responder sin enviar la contraseña
    res.status(201).json({
      mensaje: 'Usuario registrado correctamente',
      usuario: {
        id_usuario: resultado.insertId,
        nombre_usuario: nombre,
        correo: email
      }
    })
  } catch (error) {
    // MySQL informa si el correo o usuario ya existe
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'El nombre de usuario o correo ya está registrado'
      })
    }

    console.error('Error al registrar usuario:', error.message)

    res.status(500).json({
      mensaje: 'No se pudo registrar el usuario'
    })
  }
}

const iniciarSesion = async (req, res) => {
  try {
    const { correo, contrasena } = req.body || {}

    // 1. Validar datos
    if (
      typeof correo !== 'string' ||
      typeof contrasena !== 'string' ||
      !correo.trim() ||
      !contrasena
    ) {
      return res.status(400).json({
        mensaje: 'Ingresá tu usuario o correo y contraseña'
      })
    }

    const identificador = correo.trim().toLowerCase()

    // 2. Buscar el usuario en MySQL

    const [usuarios] = await model.buscarCredenciales(identificador)

    const usuario = usuarios[0]

    // 3. Comprobar si existe
    if (!usuario) {
      return res.status(401).json({
        mensaje: 'Usuario, correo o contraseña incorrectos'
      })
    }

    // 4. Verificar la contraseña
    const contrasenaValida = await bcrypt.compare(
      contrasena,
      usuario.contrasena_hash
    )

    if (!contrasenaValida) {
      return res.status(401).json({
        mensaje: 'Usuario, correo o contraseña incorrectos'
      })
    }

    // 5. Generar un token de sesión
    if (!process.env.JWT_SECRET) {
      throw new Error('Falta configurar JWT_SECRET')
    }

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        rol: usuario.rol
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '2h',
        algorithm: 'HS256'
      }
    )

    // 6. Guardar el token en una cookie protegida
    res.cookie('nr_sesion', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000,
      path: '/'
    })

    // 7. Responder sin exponer contraseña ni token
    res.json({
      mensaje: 'Inicio de sesión correcto',
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        correo: usuario.correo,
        rol: usuario.rol
      }
    })
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message)

    res.status(500).json({
      mensaje: 'No se pudo iniciar sesión'
    })
  }
}

const usuarioActual = async (req, res) => {
  try {
    // Obtener la cookie de sesión
    const token = req.cookies?.nr_sesion

    if (!token) {
      return res.status(401).json({
        mensaje: 'No hay una sesión iniciada'
      })
    }

    // Verificar que el token sea válido
    const datosToken = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    })

    // Validar que el id_usuario sea un número entero positivo
    if (!Number.isInteger(datosToken.id_usuario) || datosToken.id_usuario < 1) {
      return res.status(401).json({
        mensaje: 'Sesión inválida'
      })
    }

    // Buscar el usuario en MySQL
    const [usuarios] = await model.buscarUsuarioActual(datosToken.id_usuario)

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensaje: 'El usuario ya no existe'
      })
    }

    // Devolver los datos del usuario conectado
    res.json({
      autenticado: true,
      usuario: usuarios[0]
    })
  } catch (error) {
    if (
      error.name === 'TokenExpiredError' ||
      error.name === 'JsonWebTokenError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        mensaje: 'La sesión no es válida o ha expirado'
      })
    }

    console.error('Error al consultar usuario:', error.message)

    res.status(500).json({
      mensaje: 'No se pudo consultar la sesión'
    })
  }
}

const cerrarSesion = (req, res) => {
  // Eliminar la cookie de sesión
  res.clearCookie('nr_sesion', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  })

  res.json({
    mensaje: 'Sesión cerrada correctamente'
  })
}

module.exports = { registrar, iniciarSesion, usuarioActual, cerrarSesion }
