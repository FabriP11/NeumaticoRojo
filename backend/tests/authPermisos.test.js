// NeumaticoRojo - pruebas unitarias de autenticacion y permisos.
// No inicia Express, no se conecta a MySQL y no importa datos.
// Usa los controladores y middlewares reales, con un modelo MySQL simulado.
const test = require('node:test')
const assert = require('node:assert/strict')
const { beforeEach, after } = require('node:test')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// Las variables de entorno aqui solo afectan al proceso de pruebas.
const jwtSecretAnterior = process.env.JWT_SECRET
const nodeEnvAnterior = process.env.NODE_ENV
const SECRET_PRUEBAS = 'solo-para-pruebas-automaticas-neumaticorojo-2026'
process.env.JWT_SECRET = SECRET_PRUEBAS
process.env.NODE_ENV = 'test'

let usuarios = []
let siguienteId = 1

// El modulo simulado conserva las firmas de backend/models/auth.js.
const modelSimulado = {
  async registrarUsuario (nombre, email, hash) {
    const duplicado = usuarios.some(
      u =>
        u.nombre_usuario.toLowerCase() === nombre.toLowerCase() ||
        u.correo === email
    )
    if (duplicado) {
      const error = new Error('Registro duplicado (simulado)')
      error.code = 'ER_DUP_ENTRY'
      throw error
    }

    const insertId = siguienteId++
    usuarios.push({
      id_usuario: insertId,
      nombre_usuario: nombre,
      correo: email,
      contrasena_hash: hash,
      rol: 'usuario',
      id_piloto_favorito: null,
      id_escuderia_favorita: null
    })
    return [{ insertId }]
  },

  async buscarCredenciales (identificador) {
    const usuario = usuarios.find(
      u =>
        u.correo === identificador ||
        u.nombre_usuario.toLowerCase() === identificador
    )
    return [usuario ? [{ ...usuario }] : []]
  },

  async buscarUsuarioActual (idUsuario) {
    const usuario = usuarios.find(u => u.id_usuario === idUsuario)
    if (!usuario) return [[]]
    const { contrasena_hash, ...datosPublicos } = usuario
    return [[{ ...datosPublicos }]]
  },

  async buscarRolUsuario (idUsuario) {
    const usuario = usuarios.find(u => u.id_usuario === idUsuario)
    return [usuario ? [{ rol: usuario.rol }] : []]
  }
}

// Impide que el controlador cargue el modelo que conecta a MySQL.
// Esto debe hacerse ANTES de cargar los archivos que lo importan.
const rutaModelo = require.resolve('../models/auth')
const modeloOriginal = require.cache[rutaModelo]
require.cache[rutaModelo] = {
  id: rutaModelo,
  filename: rutaModelo,
  loaded: true,
  exports: modelSimulado
}

const auth = require('../controllers/auth')
const requerirSesion = require('../middlewares/requerirSesion')
const requerirAdministrador = require('../middlewares/requerirAdministrador')

after(() => {
  if (modeloOriginal) require.cache[rutaModelo] = modeloOriginal
  else delete require.cache[rutaModelo]
  if (jwtSecretAnterior === undefined) delete process.env.JWT_SECRET
  else process.env.JWT_SECRET = jwtSecretAnterior
  if (nodeEnvAnterior === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = nodeEnvAnterior
})

beforeEach(() => {
  usuarios = []
  siguienteId = 1
})

function crearRespuesta () {
  return {
    statusCode: 200,
    body: null,
    cookieEnviada: null,
    cookieEliminada: null,
    status (codigo) {
      this.statusCode = codigo
      return this
    },
    json (datos) {
      this.body = datos
      return this
    },
    cookie (nombre, valor, opciones) {
      this.cookieEnviada = { nombre, valor, opciones }
      return this
    },
    clearCookie (nombre, opciones) {
      this.cookieEliminada = { nombre, opciones }
      return this
    }
  }
}

async function crearUsuario ({
  nombre = 'piloto_prueba',
  email = 'piloto@ejemplo.test',
  contrasena = 'ClaveSegura123',
  rol = 'usuario'
} = {}) {
  // El hash de la cuenta de prueba se calcula con pocas rondas para acelerar las pruebas.
  const hash = await bcrypt.hash(contrasena, 4)
  const [resultado] = await modelSimulado.registrarUsuario(nombre, email, hash)
  const usuario = usuarios.find(u => u.id_usuario === resultado.insertId)
  usuario.rol = rol
  return usuario
}

function tokenValido (idUsuario) {
  return jwt.sign({ id_usuario: idUsuario, rol: 'usuario' }, SECRET_PRUEBAS, {
    algorithm: 'HS256',
    expiresIn: '2h'
  })
}

// REGISTRO: la base de datos solo existe en memoria durante estas pruebas.
test('registro: rechaza campos incompletos sin guardar usuarios', async () => {
  const res = crearRespuesta()
  await auth.registrar({ body: { nombre_usuario: 'abc' } }, res)
  assert.equal(res.statusCode, 400)
  assert.equal(usuarios.length, 0)
})

test('registro: rechaza nombre de usuario invalido', async () => {
  const res = crearRespuesta()
  await auth.registrar(
    {
      body: {
        nombre_usuario: 'a!',
        correo: 'a@ejemplo.test',
        contrasena: 'ClaveSegura123'
      }
    },
    res
  )
  assert.equal(res.statusCode, 400)
})

test('registro: rechaza correo invalido', async () => {
  const res = crearRespuesta()
  await auth.registrar(
    {
      body: {
        nombre_usuario: 'piloto_prueba',
        correo: 'correo-invalido',
        contrasena: 'ClaveSegura123'
      }
    },
    res
  )
  assert.equal(res.statusCode, 400)
})

test('registro: rechaza contrasena demasiado corta', async () => {
  const res = crearRespuesta()
  await auth.registrar(
    {
      body: {
        nombre_usuario: 'piloto_prueba',
        correo: 'a@ejemplo.test',
        contrasena: '123'
      }
    },
    res
  )
  assert.equal(res.statusCode, 400)
})

test('registro: crea usuario, normaliza correo y almacena hash', async () => {
  const res = crearRespuesta()
  await auth.registrar(
    {
      body: {
        nombre_usuario: ' piloto_prueba ',
        correo: ' PILOTO@EJEMPLO.TEST ',
        contrasena: 'ClaveSegura123'
      }
    },
    res
  )
  assert.equal(res.statusCode, 201)
  assert.equal(res.body.usuario.nombre_usuario, 'piloto_prueba')
  assert.equal(res.body.usuario.correo, 'piloto@ejemplo.test')
  assert.equal(usuarios.length, 1)
  assert.notEqual(usuarios[0].contrasena_hash, 'ClaveSegura123')
  assert.equal(
    await bcrypt.compare('ClaveSegura123', usuarios[0].contrasena_hash),
    true
  )
  assert.equal('contrasena_hash' in res.body.usuario, false)
})

test('registro: responde 409 si el usuario ya existe', async () => {
  await crearUsuario()
  const res = crearRespuesta()
  await auth.registrar(
    {
      body: {
        nombre_usuario: 'piloto_prueba',
        correo: 'otro@ejemplo.test',
        contrasena: 'ClaveSegura123'
      }
    },
    res
  )
  assert.equal(res.statusCode, 409)
  assert.equal(usuarios.length, 1)
})

// LOGIN Y JWT.
test('login: rechaza credenciales incompletas con 400', async () => {
  const res = crearRespuesta()
  await auth.iniciarSesion({ body: { correo: '', contrasena: '' } }, res)
  assert.equal(res.statusCode, 400)
})

test('login: usuario inexistente devuelve 401', async () => {
  const res = crearRespuesta()
  await auth.iniciarSesion(
    {
      body: {
        correo: 'nadie@ejemplo.test',
        contrasena: 'ClaveSegura123'
      }
    },
    res
  )
  assert.equal(res.statusCode, 401)
  assert.equal(res.cookieEnviada, null)
})

test('login: contrasena incorrecta devuelve 401', async () => {
  await crearUsuario()
  const res = crearRespuesta()
  await auth.iniciarSesion(
    {
      body: {
        correo: 'piloto@ejemplo.test',
        contrasena: 'Incorrecta123'
      }
    },
    res
  )
  assert.equal(res.statusCode, 401)
  assert.equal(res.cookieEnviada, null)
})

test('login: acepta correo y crea cookie httpOnly con JWT valido', async () => {
  const usuario = await crearUsuario()
  const res = crearRespuesta()
  await auth.iniciarSesion(
    {
      body: {
        correo: ' PILOTO@EJEMPLO.TEST ',
        contrasena: 'ClaveSegura123'
      }
    },
    res
  )
  assert.equal(res.statusCode, 200)
  assert.equal(res.cookieEnviada.nombre, 'nr_sesion')
  assert.equal(res.cookieEnviada.opciones.httpOnly, true)
  assert.equal(res.cookieEnviada.opciones.sameSite, 'lax')
  assert.equal(res.cookieEnviada.opciones.maxAge, 7200000)
  assert.equal(res.cookieEnviada.opciones.secure, false) // NODE_ENV = test
  const datos = jwt.verify(res.cookieEnviada.valor, SECRET_PRUEBAS, {
    algorithms: ['HS256']
  })
  assert.equal(datos.id_usuario, usuario.id_usuario)
  assert.equal('contrasena_hash' in res.body.usuario, false)
})

test('login: permite iniciar sesion por nombre de usuario', async () => {
  await crearUsuario()
  const res = crearRespuesta()
  await auth.iniciarSesion(
    {
      body: {
        correo: 'PILOTO_PRUEBA',
        contrasena: 'ClaveSegura123'
      }
    },
    res
  )
  assert.equal(res.statusCode, 200)
  assert.ok(res.cookieEnviada?.valor)
})

// SESION ACTUAL Y LOGOUT.
test('usuario actual: sin cookie devuelve 401', async () => {
  const res = crearRespuesta()
  await auth.usuarioActual({ cookies: {} }, res)
  assert.equal(res.statusCode, 401)
})

test('usuario actual: JWT invalido devuelve 401', async () => {
  const res = crearRespuesta()
  await auth.usuarioActual({ cookies: { nr_sesion: 'token-invalido' } }, res)
  assert.equal(res.statusCode, 401)
})

test('usuario actual: JWT expirado devuelve 401', async () => {
  const token = jwt.sign({ id_usuario: 1 }, SECRET_PRUEBAS, { expiresIn: -1 })
  const res = crearRespuesta()
  await auth.usuarioActual({ cookies: { nr_sesion: token } }, res)
  assert.equal(res.statusCode, 401)
})

test('usuario actual: devuelve la cuenta existente sin hash', async () => {
  const usuario = await crearUsuario()
  const res = crearRespuesta()
  await auth.usuarioActual(
    { cookies: { nr_sesion: tokenValido(usuario.id_usuario) } },
    res
  )
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.autenticado, true)
  assert.equal(res.body.usuario.id_usuario, usuario.id_usuario)
  assert.equal('contrasena_hash' in res.body.usuario, false)
})

test('usuario actual: cuenta eliminada devuelve 401', async () => {
  const res = crearRespuesta()
  await auth.usuarioActual({ cookies: { nr_sesion: tokenValido(999) } }, res)
  assert.equal(res.statusCode, 401)
})

test('logout: elimina la cookie de sesion', () => {
  const res = crearRespuesta()
  auth.cerrarSesion({}, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.cookieEliminada.nombre, 'nr_sesion')
  assert.equal(res.cookieEliminada.opciones.httpOnly, true)
})

// MIDDLEWARE DE SESION.
test('requerirSesion: bloquea solicitudes sin cookie', () => {
  const res = crearRespuesta()
  let paso = false
  requerirSesion({ cookies: {} }, res, () => {
    paso = true
  })
  assert.equal(res.statusCode, 401)
  assert.equal(paso, false)
})

test('requerirSesion: acepta JWT valido y coloca idUsuario', () => {
  const req = { cookies: { nr_sesion: tokenValido(8) } }
  const res = crearRespuesta()
  let paso = false
  requerirSesion(req, res, () => {
    paso = true
  })
  assert.equal(paso, true)
  assert.equal(req.idUsuario, 8)
})

test('requerirSesion: rechaza identificadores de usuario invalidos', () => {
  const token = tokenValido(0)
  const res = crearRespuesta()
  let paso = false
  requerirSesion({ cookies: { nr_sesion: token } }, res, () => {
    paso = true
  })
  assert.equal(res.statusCode, 401)
  assert.equal(paso, false)
})

// MIDDLEWARE ADMINISTRATIVO: comprueba el rol consultado en el modelo simulado.
test('requerirAdministrador: sin idUsuario devuelve 401', async () => {
  const res = crearRespuesta()
  let paso = false
  await requerirAdministrador({}, res, () => {
    paso = true
  })
  assert.equal(res.statusCode, 401)
  assert.equal(paso, false)
})

test('requerirAdministrador: usuario comun devuelve 403', async () => {
  const usuario = await crearUsuario({ rol: 'usuario' })
  const res = crearRespuesta()
  let paso = false
  await requerirAdministrador({ idUsuario: usuario.id_usuario }, res, () => {
    paso = true
  })
  assert.equal(res.statusCode, 403)
  assert.equal(paso, false)
})

test('requerirAdministrador: rol admin permite continuar', async () => {
  const usuario = await crearUsuario({ rol: 'admin' })
  const res = crearRespuesta()
  let paso = false
  await requerirAdministrador({ idUsuario: usuario.id_usuario }, res, () => {
    paso = true
  })
  assert.equal(paso, true)
})

test('requerirAdministrador: cuenta que ya no existe devuelve 401', async () => {
  const res = crearRespuesta()
  let paso = false
  await requerirAdministrador({ idUsuario: 999 }, res, () => {
    paso = true
  })
  assert.equal(res.statusCode, 401)
  assert.equal(paso, false)
})
