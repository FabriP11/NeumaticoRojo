const pool = require('./db')

async function importarNumeros () {
  try {
    for (let anio = 2020; anio <= 2026; anio++) {
      const respuesta = await fetch(
        `https://api.jolpi.ca/ergast/f1/${anio}/drivers.json?limit=100`
      )

      if (!respuesta.ok) {
        throw new Error(`Error consultando temporada ${anio}`)
      }

      const datos = await respuesta.json()
      const pilotos = datos.MRData.DriverTable.Drivers

      let actualizados = 0

      for (const piloto of pilotos) {
        let numero = Number(piloto.permanentNumber)

        // Números oficiales de competición de 2026
        if (anio === 2026 && piloto.driverId === 'norris') {
          numero = 1
        }

        if (anio === 2026 && piloto.driverId === 'max_verstappen') {
          numero = 3
        }

        if (!Number.isInteger(numero) || numero < 1) {
          continue
        }

        const [resultado] = await pool.execute(
          `UPDATE participaciones
           SET numero = ?
           WHERE anio = ?
             AND id_piloto = ?`,
          [numero, anio, piloto.driverId]
        )

        actualizados += resultado.affectedRows
      }

      console.log(
        `Temporada ${anio}: ${actualizados} participaciones actualizadas`
      )
    }

    console.log('Importación de números finalizada')
  } finally {
    await pool.end()
  }
}

importarNumeros().catch(error => {
  console.error('Error:', error.message)
  process.exitCode = 1
})
