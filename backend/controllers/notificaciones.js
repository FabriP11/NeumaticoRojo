const pool = require('../models/db')
const { crearEnlaceTelegram, desvincularTelegram, enviarMensajeTelegram, habilitado } = require('../services/telegramBot')

const TIPOS_PERMITIDOS = new Set([
  'fp1',
  'fp2',
  'fp3',
  'clasificacion_sprint',
  'sprint',
  'clasificacion',
  'carrera'
])

function convertirSesiones (valor) {
  try {
    const lista = typeof valor === 'string' ? JSON.parse(valor) : valor
    return Array.isArray(lista) ? lista.filter(s => TIPOS_PERMITIDOS.has(s)) : []
  } catch (_) {
    return []
  }
}

const consultarPreferencias = async (req, res) => {
  try {
    const [filas] = await pool.execute(
      'SELECT activo, minutos_antes, sesiones, correo_activo, telegram_activo FROM preferencias_notificaciones WHERE id_usuario = ?',
      [req.idUsuario]
    )
    const datos = filas[0]
    res.json({
      activo: Boolean(datos?.activo),
      minutos_antes: datos ? Number(datos.minutos_antes) : 10,
      sesiones: datos ? convertirSesiones(datos.sesiones) : [],
      canales: { correo: !datos || Boolean(datos.correo_activo), telegram: Boolean(datos?.telegram_activo) }
    })
  } catch (error) {
    console.error('Error consultando preferencias de notificación:', error.message)
    res.status(500).json({ mensaje: 'No se pudieron cargar tus recordatorios' })
  }
}

const guardarPreferencias = async (req, res) => {
  try {
    const { activo, minutos_antes, sesiones } = req.body || {}
    if (
      typeof activo !== 'boolean' ||
      ![5, 10].includes(minutos_antes) ||
      !Array.isArray(sesiones) ||
      sesiones.length > TIPOS_PERMITIDOS.size ||
      sesiones.some(s => typeof s !== 'string' || !TIPOS_PERMITIDOS.has(s)) ||
      new Set(sesiones).size !== sesiones.length ||
      (activo && sesiones.length === 0)
    ) {
      return res.status(400).json({ mensaje: 'Preferencias de recordatorios inválidas' })
    }

    // Solo se configura la cuenta autenticada: el cliente no elige ni el id ni el correo.
    await pool.execute(
      `INSERT INTO preferencias_notificaciones (id_usuario, activo, minutos_antes, sesiones)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE activo = VALUES(activo),
         minutos_antes = VALUES(minutos_antes), sesiones = VALUES(sesiones)`,
      [req.idUsuario, activo ? 1 : 0, minutos_antes, JSON.stringify(sesiones)]
    )

    res.json({ activo, minutos_antes, sesiones, mensaje: 'Preferencias guardadas' })
  } catch (error) {
    console.error('Error guardando preferencias de notificación:', error.message)
    res.status(500).json({ mensaje: 'No se pudieron guardar tus recordatorios' })
  }
}

// Las preferencias de canales se guardan por separado para que la campanita
// (que sigue enviando activo/minutos/sesiones) no las sobrescriba.
const consultarCanales = async (req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT p.activo, p.sesiones, p.correo_activo, p.telegram_activo, t.chat_id
         FROM usuarios u
         LEFT JOIN preferencias_notificaciones p ON p.id_usuario=u.id_usuario
         LEFT JOIN telegram_vinculaciones t ON t.id_usuario=u.id_usuario
        WHERE u.id_usuario=?`,
      [req.idUsuario]
    )
    if (!filas.length) return res.status(401).json({ mensaje: 'La cuenta no existe' })
    const datos = filas[0]
    res.set('Cache-Control', 'no-store')
    res.json({
      correo: datos.correo_activo == null ? true : Boolean(datos.correo_activo),
      telegram: Boolean(datos.telegram_activo),
      vinculado: datos.chat_id != null,
      activo: Boolean(datos.activo),
      sesiones_configuradas: convertirSesiones(datos.sesiones).length > 0,
      bot_disponible: habilitado(),
      envio_habilitado: process.env.RECORDATORIOS_HABILITADOS === 'true'
    })
  } catch (error) {
    console.error('Telegram: error consultando canales:', error.message)
    res.status(500).json({ mensaje: 'No se pudieron consultar los canales' })
  }
}

const guardarCanales = async (req, res) => {
  const { correo, telegram } = req.body || {}
  if (typeof correo !== 'boolean' || typeof telegram !== 'boolean') {
    return res.status(400).json({ mensaje: 'Elegí correctamente los canales de notificación' })
  }
  try {
    if (telegram) {
      if (!habilitado()) return res.status(503).json({ mensaje: 'Telegram aún no está configurado' })
      const [vinculos] = await pool.execute(
        'SELECT chat_id FROM telegram_vinculaciones WHERE id_usuario=?', [req.idUsuario]
      )
      if (vinculos[0]?.chat_id == null) {
        return res.status(409).json({ mensaje: 'Primero vinculá tu cuenta de Telegram' })
      }
    }
    await pool.execute(
      `INSERT INTO preferencias_notificaciones
        (id_usuario, activo, minutos_antes, sesiones, correo_activo, telegram_activo)
       VALUES (?, 0, 10, '[]', ?, ?)
       ON DUPLICATE KEY UPDATE correo_activo=VALUES(correo_activo),
         telegram_activo=VALUES(telegram_activo)`,
      [req.idUsuario, correo ? 1 : 0, telegram ? 1 : 0]
    )
    res.json({ correo, telegram, mensaje: 'Canales de avisos guardados' })
  } catch (error) {
    console.error('Telegram: error guardando canales:', error.message)
    res.status(500).json({ mensaje: 'No se pudieron guardar los canales' })
  }
}

const generarEnlace = async (req, res) => {
  try {
    const enlace = await crearEnlaceTelegram(req.idUsuario)
    res.set('Cache-Control', 'no-store')
    res.json(enlace)
  } catch (error) {
    console.error('Telegram: no se pudo generar el enlace:', error.message)
    res.status(error.status || (habilitado() ? 500 : 503))
      .json({ mensaje: error.status ? error.message : 'No se pudo crear el enlace de Telegram' })
  }
}

const probarTelegram = async (req, res) => {
  if (!habilitado()) return res.status(503).json({ mensaje: 'Telegram no está configurado' })
  try {
    // Límite atómico por usuario: un único mensaje de prueba por minuto.
    const [reserva] = await pool.execute(
      `UPDATE telegram_vinculaciones SET ultimo_test=UTC_TIMESTAMP()
        WHERE id_usuario=? AND chat_id IS NOT NULL
          AND (ultimo_test IS NULL OR ultimo_test < UTC_TIMESTAMP() - INTERVAL 60 SECOND)`,
      [req.idUsuario]
    )
    if (!reserva.affectedRows) {
      return res.status(429).json({ mensaje: 'No hay un chat vinculado o ya enviaste una prueba. Esperá 1 minuto.' })
    }
    const [filas] = await pool.execute(
      'SELECT chat_id FROM telegram_vinculaciones WHERE id_usuario=?', [req.idUsuario]
    )
    if (!filas[0]?.chat_id) return res.status(409).json({ mensaje: 'Vinculá tu Telegram primero' })
    await enviarMensajeTelegram({
      chatId: String(filas[0].chat_id),
      texto: 'Neumático Rojo: mensaje de prueba recibido. La vinculación de Telegram funciona correctamente.'
    })
    res.json({ mensaje: 'Mensaje de prueba enviado a Telegram' })
  } catch (error) {
    console.error('Telegram: error en prueba:', error.message)
    res.status(502).json({ mensaje: 'No se pudo enviar el mensaje de prueba. Comprobá que no bloqueaste el bot.' })
  }
}

const quitarTelegram = async (req, res) => {
  try {
    await desvincularTelegram(req.idUsuario)
    res.json({ mensaje: 'Telegram desvinculado correctamente' })
  } catch (error) {
    console.error('Telegram: error desvinculando:', error.message)
    res.status(500).json({ mensaje: 'No se pudo desvincular Telegram' })
  }
}

module.exports = {
  consultarPreferencias, guardarPreferencias,
  consultarCanales, guardarCanales, generarEnlace, probarTelegram, quitarTelegram
}
