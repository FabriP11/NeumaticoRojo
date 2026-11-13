const API_LOCAL = 'http://localhost:3001'

// Temporadas que queremos importar
const desde = Number(process.argv[2] ?? 2020)
const hasta = Number(process.argv[3] ?? 2026)

// Validar los años
if (
  !Number.isInteger(desde) ||
  !Number.isInteger(hasta) ||
  desde < 1950 ||
  hasta > 2100 ||
  desde > hasta
) {
  console.error('Rango de temporadas inválido')
  process.exit(1)
}

// Orden correcto de importación
const pasos = [
  {
    nombre: 'Escuderías',
    endpoint: 'importar-escuderias'
  },
  {
    nombre: 'Pilotos',
    endpoint: 'importar-pilotos'
  },
  {
    nombre: 'Calendario',
    endpoint: 'importar-calendario'
  },
  {
    nombre: 'Participaciones',
    endpoint: 'importar-participaciones'
  },
  {
    nombre: 'Sesiones',
    endpoint: 'importar-sesiones'
  },
  {
    nombre: 'Resultados',
    endpoint: 'importar-resultados'
  },
  {
    nombre: 'Clasificaciones',
    endpoint: 'importar-clasificaciones'
  }
]

// Pequeña pausa entre importaciones
function esperar (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Ejecutar un endpoint del backend
async function ejecutarImportacion (paso, temporada) {
  const url = `${API_LOCAL}/api/${paso.endpoint}?temporada=${temporada}`

  const respuesta = await fetch(url, {
    method: 'POST'
  })

  const datos = await respuesta.json()

  if (!respuesta.ok) {
    const detalles = datos.faltantes
      ? JSON.stringify(datos.faltantes)
      : datos.mensaje || 'Error desconocido'

    throw new Error(`${paso.nombre}: ${detalles} (HTTP ${respuesta.status})`)
  }

  console.log(`  ✓ ${paso.nombre}: ${datos.mensaje}`)
}

// Importar todas las temporadas
async function importarTemporadas () {
  console.log('=================================')
  console.log('  NEUMATICOROJO - IMPORTADOR F1')
  console.log('=================================')

  for (let anio = desde; anio <= hasta; anio++) {
    console.log(`\n🏎️ IMPORTANDO TEMPORADA ${anio}`)

    for (const paso of pasos) {
      console.log(`  Procesando ${paso.nombre}...`)

      await ejecutarImportacion(paso, anio)

      // Reducir la frecuencia de solicitudes
      await esperar(2000)
    }

    console.log(`✅ Temporada ${anio} completada`)
  }

  console.log('\n🏁 IMPORTACIÓN FINALIZADA')
}

// Iniciar el proceso
importarTemporadas().catch(error => {
  console.error('\n❌ Importación interrumpida:')
  console.error(error.message)
  process.exitCode = 1
})
