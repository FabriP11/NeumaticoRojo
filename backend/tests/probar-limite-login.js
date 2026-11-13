// Prueba manual de integración: ejecutar con el backend encendido.
// No crea usuarios: intenta iniciar sesión con una cuenta inexistente.
// NOTA: agota temporalmente el cupo de login de tu IP local.
const url = 'http://localhost:3001/api/login'

async function main () {
  for (let intento = 1; intento <= 11; intento++) {
    const respuesta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo: 'usuario-inexistente-para-prueba@example.invalid',
        contrasena: 'clave-invalida-de-prueba'
      })
    })

    const cuerpo = await respuesta.json().catch(() => ({}))
    console.log(
      `Intento ${intento}: HTTP ${respuesta.status} — ${cuerpo.mensaje || ''}`
    )
  }

  console.log(
    '\nEsperado: HTTP 401 en los primeros intentos y HTTP 429 al superar el límite.'
  )
  console.log(
    'Si querés iniciar sesión ahora, reiniciá el backend local para limpiar el contador en memoria.'
  )
}

main().catch(error => {
  console.error('No se pudo completar la prueba:', error.message)
  process.exitCode = 1
})
