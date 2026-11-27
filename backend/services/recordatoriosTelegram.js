const pool = require('../models/db')
const consultarJolpica = require('./jolpicaCache')
const { avisoPendiente } = require('./recordatoriosHorarios')
const { calendario, leerSesiones } = require('./recordatoriosProceso')
const { enviarMensajeTelegram, habilitado } = require('./telegramBot')

function fechaMySQL (fecha) {
  return fecha.toISOString().slice(0, 19).replace('T', ' ')
}

function mensajeRecordatorio ({ sesion, minutos }) {
  const hora = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(sesion.inicio)
  return `🏁 NEUMÁTICO ROJO\n\n${sesion.nombre} · ${sesion.gp}\n` +
    `¡Comienza en ${minutos} minutos!\nInicio: ${hora} (Argentina)\n\n` +
    'Podés cambiar tus avisos desde Mi Perfil y la campanita de Race Week.'
}

async function procesarRecordatoriosTelegram ({
  ahora = new Date(), simular = false, conexion = pool,
  consultar = consultarJolpica, enviar = enviarMensajeTelegram,
  informar = console.log
} = {}) {
  if (!simular && !habilitado()) return { elegibles: 0, enviados: 0, errores: 0 }

  const [usuarios] = await conexion.execute(
    `SELECT p.id_usuario, p.minutos_antes, p.sesiones, t.chat_id
       FROM preferencias_notificaciones p
       JOIN telegram_vinculaciones t ON t.id_usuario=p.id_usuario
      WHERE p.activo=1 AND p.telegram_activo=1 AND t.chat_id IS NOT NULL`
  )
  if (!usuarios.length) return { elegibles: 0, enviados: 0, errores: 0 }

  const temporadas = [ahora.getUTCFullYear()]
  if (ahora.getUTCMonth() === 11) temporadas.push(ahora.getUTCFullYear() + 1)
  const agendas = await Promise.allSettled(temporadas.map(anio => calendario(anio, consultar)))
  const sesiones = agendas.filter(item => item.status === 'fulfilled').flatMap(item => item.value)
  if (!sesiones.length) throw new Error('Telegram: no se pudo consultar el calendario')

  const resultado = { elegibles: 0, enviados: 0, errores: 0 }
  for (const usuario of usuarios) {
    const minutos = Number(usuario.minutos_antes)
    const tipos = leerSesiones(usuario.sesiones)
    if (!tipos.length || ![5, 10].includes(minutos)) continue

    for (const sesion of sesiones) {
      if (!tipos.includes(sesion.tipo) || !avisoPendiente(sesion.inicio, minutos, ahora)) continue
      resultado.elegibles++
      if (simular) continue

      try {
        await conexion.execute(
          `INSERT IGNORE INTO notificaciones_enviadas_telegram
            (id_usuario, temporada, ronda, tipo, minutos_antes, inicio_utc)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [usuario.id_usuario, sesion.temporada, sesion.ronda, sesion.tipo,
            minutos, fechaMySQL(sesion.inicio)]
        )
        // Una reserva atómica por usuario/GP/sesión. Los correos usan otra tabla.
        const [reserva] = await conexion.execute(
          `UPDATE notificaciones_enviadas_telegram
              SET estado='procesando', intentos=intentos+1,
                  ultimo_intento=UTC_TIMESTAMP(), ultimo_error=NULL
            WHERE id_usuario=? AND temporada=? AND ronda=? AND tipo=?
              AND (estado='pendiente' OR (estado='error' AND intentos<3))`,
          [usuario.id_usuario, sesion.temporada, sesion.ronda, sesion.tipo]
        )
        if (reserva.affectedRows !== 1) continue

        try {
          // El usuario puede desactivar/desvincular mientras el worker funciona.
          const [filas] = await conexion.execute(
            `SELECT p.activo, p.telegram_activo, p.minutos_antes, p.sesiones, t.chat_id
               FROM preferencias_notificaciones p
               LEFT JOIN telegram_vinculaciones t ON t.id_usuario=p.id_usuario
              WHERE p.id_usuario=?`, [usuario.id_usuario]
          )
          const actual = filas[0]
          if (!actual?.activo || !actual.telegram_activo ||
              String(actual.chat_id || '') !== String(usuario.chat_id) ||
              Number(actual.minutos_antes) !== minutos ||
              !leerSesiones(actual.sesiones).includes(sesion.tipo)) {
            await conexion.execute(
              `UPDATE notificaciones_enviadas_telegram SET estado='pendiente'
                WHERE id_usuario=? AND temporada=? AND ronda=? AND tipo=? AND estado='procesando'`,
              [usuario.id_usuario, sesion.temporada, sesion.ronda, sesion.tipo]
            )
            continue
          }

          const mensaje = await enviar({
            chatId: String(actual.chat_id),
            texto: mensajeRecordatorio({ sesion, minutos })
          })
          await conexion.execute(
            `UPDATE notificaciones_enviadas_telegram
                SET estado='enviado', enviado_en=UTC_TIMESTAMP(), mensaje_id=?
              WHERE id_usuario=? AND temporada=? AND ronda=? AND tipo=? AND estado='procesando'`,
            [mensaje.message_id, usuario.id_usuario, sesion.temporada, sesion.ronda, sesion.tipo]
          )
          resultado.enviados++
          informar(`Telegram: enviado al usuario ${usuario.id_usuario} / ${sesion.gp} / ${sesion.nombre}`)
        } catch (error) {
          resultado.errores++
          await conexion.execute(
            `UPDATE notificaciones_enviadas_telegram
                SET estado='error', ultimo_error=?
              WHERE id_usuario=? AND temporada=? AND ronda=? AND tipo=? AND estado='procesando'`,
            [String(error.message).slice(0, 400), usuario.id_usuario,
              sesion.temporada, sesion.ronda, sesion.tipo]
          )
          console.error(`Telegram: error al enviar (usuario ${usuario.id_usuario}):`, error.message)
        }
      } catch (error) {
        resultado.errores++
        console.error('Telegram: error en MySQL:', error.message)
      }
    }
  }
  return resultado
}

module.exports = { procesarRecordatoriosTelegram, mensajeRecordatorio }
