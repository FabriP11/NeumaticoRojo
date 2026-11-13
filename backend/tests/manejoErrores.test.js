const test = require('node:test')
const assert = require('node:assert/strict')

const rutaNoEncontrada = require('../middlewares/rutaNoEncontrada')
const manejarErrores = require('../middlewares/manejarErrores')

function respuestaSimulada () {
  return {
    headersSent: false,
    statusCode: null,
    payload: null,
    status (codigo) {
      this.statusCode = codigo
      return this
    },
    json (contenido) {
      this.payload = contenido
      return this
    }
  }
}

const req = { method: 'POST', path: '/api/prueba' }

test('ruta inexistente devuelve 404 con mensaje JSON', () => {
  const res = respuestaSimulada()
  rutaNoEncontrada(req, res)
  assert.equal(res.statusCode, 404)
  assert.deepEqual(res.payload, { mensaje: 'Ruta no encontrada' })
})

test('JSON malformado devuelve 400 sin exponer el cuerpo', () => {
  const res = respuestaSimulada()
  manejarErrores(
    { type: 'entity.parse.failed', status: 400, body: 'dato privado' },
    req,
    res,
    () => {}
  )
  assert.equal(res.statusCode, 400)
  assert.match(res.payload.mensaje, /JSON/)
  assert.doesNotMatch(res.payload.mensaje, /dato privado/)
})

test('cuerpo demasiado grande devuelve 413', () => {
  const res = respuestaSimulada()
  manejarErrores({ type: 'entity.too.large', status: 413 }, req, res, () => {})
  assert.equal(res.statusCode, 413)
})

test('un error con estado 403 conserva el estado', () => {
  const res = respuestaSimulada()
  manejarErrores(
    { status: 403, message: 'Detalles internos' },
    req,
    res,
    () => {}
  )
  assert.equal(res.statusCode, 403)
  assert.equal(res.payload.mensaje, 'Acceso denegado')
})

test('un error sin codigo devuelve 500 sin mostrar secretos', () => {
  const res = respuestaSimulada()
  const errorPrevio = console.error
  console.error = () => {} // No contaminar el resultado de la prueba.
  try {
    manejarErrores(new Error('La clave SQL es secreta'), req, res, () => {})
  } finally {
    console.error = errorPrevio
  }
  assert.equal(res.statusCode, 500)
  assert.equal(res.payload.mensaje, 'Error interno del servidor')
  assert.doesNotMatch(JSON.stringify(res.payload), /SQL|secreta/)
})

test('un estado fuera del rango HTTP se transforma en 500', () => {
  const res = respuestaSimulada()
  const errorPrevio = console.error
  console.error = () => {}
  try {
    manejarErrores({ status: 200, message: 'Invalido' }, req, res, () => {})
  } finally {
    console.error = errorPrevio
  }
  assert.equal(res.statusCode, 500)
})

test('un error 502 devuelve mensaje generico', () => {
  const res = respuestaSimulada()
  const errorPrevio = console.error
  console.error = () => {}
  try {
    manejarErrores(
      { statusCode: 502, message: 'API secreta' },
      req,
      res,
      () => {}
    )
  } finally {
    console.error = errorPrevio
  }
  assert.equal(res.statusCode, 502)
  assert.equal(
    res.payload.mensaje,
    'Error al comunicarse con un servicio externo'
  )
})

test('si ya se enviaron encabezados, reenvia el error a Express', () => {
  const res = respuestaSimulada()
  res.headersSent = true
  const error = new Error('Error posterior')
  let recibido
  manejarErrores(error, req, res, err => {
    recibido = err
  })
  assert.equal(recibido, error)
  assert.equal(res.statusCode, null)
})
