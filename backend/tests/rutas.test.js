// Comprueba el contrato de rutas sin iniciar el servidor ni acceder a MySQL.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const rutas = path.join(__dirname, '..', 'routes')
const esperado = [
  ['GET', '/'],
  ['GET', '/api/carreras'],
  ['GET', '/api/clasificaciones'],
  ['GET', '/api/db-test'],
  ['GET', '/api/dorsales-temporada'],
  ['GET', '/api/escuderias/:id'],
  ['GET', '/api/health'],
  ['GET', '/api/opciones-favoritos'],
  ['GET', '/api/pilotos/:id'],
  ['GET', '/api/resultados'],
  ['GET', '/api/resultados-sesion'],
  ['GET', '/api/resumen-favoritos'],
  ['GET', '/api/resumen-practicas'],
  ['GET', '/api/resumen-sesiones'],
  ['GET', '/api/tablas-inicio'],
  ['GET', '/api/usuario-actual'],
  ['POST', '/api/importar-calendario'],
  ['POST', '/api/importar-clasificaciones'],
  ['POST', '/api/importar-escuderias'],
  ['POST', '/api/importar-participaciones'],
  ['POST', '/api/importar-pilotos'],
  ['POST', '/api/importar-resultados'],
  ['POST', '/api/importar-sesiones'],
  ['POST', '/api/login'],
  ['POST', '/api/logout'],
  ['POST', '/api/registro'],
  ['PUT', '/api/mis-favoritos']
]

test('se mantienen los 27 endpoints del servidor original', () => {
  const obtenido = fs
    .readdirSync(rutas)
    .filter(x => x.endsWith('.js'))
    .flatMap(archivo => {
      const contenido = fs.readFileSync(path.join(rutas, archivo), 'utf8')
      return [
        ...contenido.matchAll(
          /router\s*\.\s*(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g
        )
      ].map(m => [m[1].toUpperCase(), m[2]])
    })
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))

  assert.deepEqual(
    obtenido,
    esperado.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  )
})
