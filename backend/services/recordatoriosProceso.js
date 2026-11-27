const pool = require('../models/db')
const consultarJolpica = require('./jolpicaCache')
const { sesionesCalendario, avisoPendiente } = require('./recordatoriosHorarios')
const { enviarCorreo, destinatarioPermitido } = require('./recordatoriosCorreo')

const TIPOS = new Set(['fp1', 'fp2', 'fp3', 'clasificacion_sprint', 'sprint', 'clasificacion', 'carrera'])

function leerSesiones (valor) {
  try {
    const lista = typeof valor === 'string' ? JSON.parse(valor) : valor
    return Array.isArray(lista) ? lista.filter(s => TIPOS.has(s)) : []
  } catch (_) {
    return []
  }
}

function formatoMySQL (fecha) {
  return fecha.toISOString().slice(0, 19).replace('T', ' ')
}

function claveEnvio (usuario, sesion) {
  return `nr-recordatorio-${usuario}-${sesion.temporada}-${sesion.ronda}-${sesion.tipo}`
}

async function calendario (temporada, servicioJolpica = consultarJolpica) {
  const respuesta = await servicioJolpica(`https://api.jolpi.ca/ergast/f1/${temporada}.json?limit=100`)
  if (!respuesta.ok) throw new Error(`Jolpica: HTTP ${respuesta.status}`)
  const datos = await respuesta.json()
  const carreras = datos?.MRData?.RaceTable?.Races
  if (!Array.isArray(carreras) || !carreras.length) throw new Error('Jolpica no devolvió calendario')
  return sesionesCalendario(carreras)
}

async function procesarRecordatorios ({
  ahora = new Date(), simular = false,
  conexion = pool, consultar = consultarJolpica,
  enviar = enviarCorreo, permitido = destinatarioPermitido,
  informar = console.log, mostrarProximos = false
} = {}) {
  const [usuarios] = await conexion.execute(
    `SELECT p.id_usuario, p.minutos_antes, p.sesiones, u.correo
       FROM preferencias_notificaciones p
       JOIN usuarios u ON u.id_usuario = p.id_usuario
      WHERE p.activo = 1 AND p.correo_activo = 1`
  )
  if (!usuarios.length) {
    informar('Recordatorios: no hay usuarios suscriptos')
    return { elegibles: 0, enviados: 0, errores: 0 }
  }

  // Consultar solamente la temporada actual y, en diciembre, la siguiente si ya existe.
  const temporadas = [ahora.getUTCFullYear()]
  if (ahora.getUTCMonth() === 11) temporadas.push(ahora.getUTCFullYear() + 1)
  const agendas = await Promise.allSettled(temporadas.map(anio => calendario(anio, consultar)))
  const sesiones = agendas.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
  for (const resultado of agendas) {
    if (resultado.status === 'rejected') console.warn('Recordatorios: calendario no disponible:', resultado.reason.message)
  }
  if (!sesiones.length) throw new Error('No se pudo consultar el calendario para los recordatorios')

  const resultado = { elegibles: 0, enviados: 0, errores: 0 }
  for (const usuario of usuarios) {
    const minutos = Number(usuario.minutos_antes)
    const tipos = leerSesiones(usuario.sesiones)
    if (!tipos.length || ![5, 10].includes(minutos) || !usuario.correo) continue

    if (simular && mostrarProximos) {
      const proximas = sesiones.filter(s => tipos.includes(s.tipo) && s.inicio > ahora).slice(0, 6)
      for (const sesion of proximas) informar(`[PRÓXIMO] Usuario ${usuario.id_usuario}: ${sesion.gp} / ${sesion.nombre} / ${sesion.inicio.toISOString()} UTC / ${minutos} min antes`)
    }
    for (const sesion of sesiones) {
      if (!tipos.includes(sesion.tipo) || !avisoPendiente(sesion.inicio, minutos, ahora)) continue
      resultado.elegibles++
      if (simular) {
        informar(`[SIMULACIÓN] ${sesion.gp} / ${sesion.nombre} / usuario ${usuario.id_usuario} / ${minutos} min`)
        continue
      }
      if (!permitido(usuario.correo)) {
        informar(`Recordatorios: omitido usuario ${usuario.id_usuario} (dominio de prueba Resend)`)
        continue
      }

      // Insertar una fila única y reservarla con UPDATE atómico para evitar
      // doble envío si Railway ejecuta dos revisiones simultáneas.
      try {
        await conexion.execute(
          `INSERT IGNORE INTO notificaciones_enviadas
           (id_usuario, temporada, ronda, tipo, minutos_antes, inicio_utc)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [usuario.id_usuario, sesion.temporada, sesion.ronda, sesion.tipo,
            minutos, formatoMySQL(sesion.inicio)]
        )
        const [reserva] = await conexion.execute(
          `UPDATE notificaciones_enviadas
              SET estado='procesando', intentos=intentos+1,
                  ultimo_intento=UTC_TIMESTAMP(), ultimo_error=NULL
            WHERE id_usuario=? AND temporada=? AND ronda=? AND tipo=?
              AND (estado='pendiente'
                   OR (estado='error' AND intentos<3)
                   OR (estado='procesando' AND intentos<3
                       AND ultimo_intento < UTC_TIMESTAMP() - INTERVAL 45 SECOND))`,
          [usuario.id_usuario, sesion.temporada, sesion.ronda, sesion.tipo]
        )
        if (reserva.affectedRows !== 1) continue

        try {
          // Volver a comprobar consentimiento antes de enviar.
          const [consentimiento] = await conexion.execute(
            `SELECT p.activo, p.correo_activo, p.minutos_antes, p.sesiones, u.correo
               FROM preferencias_notificaciones p JOIN usuarios u ON u.id_usuario=p.id_usuario
              WHERE p.id_usuario=?`, [usuario.id_usuario]
          )
          const estado = consentimiento[0]
          if (!estado?.activo || Number(estado.correo_activo) === 0 || Number(estado.minutos_antes) !== minutos ||
              !leerSesiones(estado.sesiones).includes(sesion.tipo) ||
              !estado.correo || !permitido(estado.correo)) {
            await conexion.execute(
              `UPDATE notificaciones_enviadas SET estado='pendiente' WHERE id_usuario=? AND temporada=? AND ronda=? AND tipo=? AND estado='procesando'`,
              [usuario.id_usuario, sesion.temporada, sesion.ronda, sesion.tipo]
            )
            continue
          }
          const idResend = await enviar({
            destinatario: estado.correo, sesion, minutos,
            clave: claveEnvio(usuario.id_usuario, sesion)
          })
          await conexion.execute(
            `UPDATE notificaciones_enviadas
                SET estado='enviado', enviado_en=UTC_TIMESTAMP(), resend_id=?
              WHERE id_usuario=? AND temporada=? AND ronda=? AND tipo=?`,
            [idResend, usuario.id_usuario, sesion.temporada, sesion.ronda, sesion.tipo]
          )
          resultado.enviados++
          informar(`Recordatorios: enviado usuario ${usuario.id_usuario} / ${sesion.nombre} / ${sesion.gp}`)
        } catch (error) {
          resultado.errores++
          await conexion.execute(
            `UPDATE notificaciones_enviadas SET estado='error', ultimo_error=?
             WHERE id_usuario=? AND temporada=? AND ronda=? AND tipo=? AND estado='procesando'`,
            [String(error.message).slice(0, 400), usuario.id_usuario, sesion.temporada, sesion.ronda, sesion.tipo]
          )
          console.error(`Recordatorios: error de envío (usuario ${usuario.id_usuario}):`, error.message)
        }
      } catch (error) {
        resultado.errores++
        console.error('Recordatorios: error en MySQL:', error.message)
      }
    }
  }
  return resultado
}

module.exports = { procesarRecordatorios, calendario, leerSesiones, claveEnvio }
