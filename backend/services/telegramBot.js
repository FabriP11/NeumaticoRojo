// Telegram Bot API sin dependencias adicionales (Node.js 20+).
// Solo procesa chats privados; no se solicitan ni guardan teléfonos.
const crypto = require('node:crypto')
const pool = require('../models/db')

let nombreBot = null
let revisando = false

function habilitado () {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim())
}

function hashToken (token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function telegramApi (metodo, datos = {}, timeoutMs = 15000) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) throw new Error('Telegram no está configurado en el servidor')

  let respuesta
  try {
    respuesta = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
      signal: AbortSignal.timeout(timeoutMs)
    })
  } catch (_) {
    // No propagar errores que pudieran contener la URL con el token privado.
    throw new Error('No se pudo conectar con la API de Telegram')
  }

  let resultado
  try {
    resultado = await respuesta.json()
  } catch (_) {
    throw new Error('Telegram devolvió una respuesta inválida')
  }
  if (!respuesta.ok || !resultado.ok) {
    const descripcion = String(resultado.description || 'Error en Telegram')
      .replaceAll(token, '[oculto]')
      .slice(0, 220)
    throw new Error(`Telegram: ${descripcion}`)
  }
  return resultado.result
}

async function obtenerNombreBot () {
  if (nombreBot) return nombreBot
  const datos = await telegramApi('getMe')
  if (!/^[a-zA-Z0-9_]{5,32}$/.test(datos?.username || '')) {
    throw new Error('El bot no tiene un nombre de usuario válido')
  }
  nombreBot = datos.username
  return nombreBot
}

async function enviarMensajeTelegram ({ chatId, texto }) {
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text: texto,
    link_preview_options: { is_disabled: true }
  })
}

// Un enlace nuevo invalida el anterior. El token solo se muestra una vez y
// únicamente se almacena su hash SHA-256, con vencimiento a los 10 minutos.
async function crearEnlaceTelegram (idUsuario) {
  if (!habilitado()) throw new Error('Telegram no está configurado en el servidor')
  const nombre = await obtenerNombreBot()
  const [vinculos] = await pool.execute(
    'SELECT chat_id FROM telegram_vinculaciones WHERE id_usuario=?', [idUsuario]
  )
  if (vinculos[0]?.chat_id != null) {
    const err = new Error('Tu cuenta ya está vinculada a Telegram')
    err.status = 409
    throw err
  }

  const token = crypto.randomBytes(24).toString('base64url')
  await pool.execute(
    `INSERT INTO telegram_vinculaciones (id_usuario, token_hash, token_expira)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE))
     ON DUPLICATE KEY UPDATE token_hash=VALUES(token_hash),
       token_expira=VALUES(token_expira)`,
    [idUsuario, hashToken(token)]
  )
  return { url: `https://t.me/${nombre}?start=${token}`, caduca_en_segundos: 600 }
}

async function vincularChat (chatId, token) {
  if (!/^[a-zA-Z0-9_-]{32}$/.test(token)) return false
  try {
    const [resultado] = await pool.execute(
      `UPDATE telegram_vinculaciones
       SET chat_id=?, vinculado_en=UTC_TIMESTAMP(), token_hash=NULL, token_expira=NULL
       WHERE token_hash=? AND token_expira>UTC_TIMESTAMP()
         AND (chat_id IS NULL OR chat_id=?)`,
      [chatId, hashToken(token), chatId]
    )
    return resultado.affectedRows === 1
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return false // Chat ya ligado a otra cuenta.
    throw error
  }
}

async function desvincularTelegram (idUsuario) {
  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    await conexion.execute('DELETE FROM telegram_vinculaciones WHERE id_usuario=?', [idUsuario])
    await conexion.execute(
      'UPDATE preferencias_notificaciones SET telegram_activo=0 WHERE id_usuario=?',
      [idUsuario]
    )
    await conexion.commit()
  } catch (error) {
    await conexion.rollback()
    throw error
  } finally {
    conexion.release()
  }
}

async function detenerChat (chatId) {
  const [filas] = await pool.execute(
    'SELECT id_usuario FROM telegram_vinculaciones WHERE chat_id=?', [chatId]
  )
  if (!filas.length) return false
  await desvincularTelegram(filas[0].id_usuario)
  return true
}

async function manejarActualizacion (actualizacion) {
  const mensaje = actualizacion.message
  if (!mensaje || mensaje.chat?.type !== 'private' || !mensaje.from || mensaje.from.is_bot) return
  const chatId = mensaje.chat.id
  if (!Number.isSafeInteger(Number(chatId))) return
  const texto = String(mensaje.text || '').trim()

  if (/^\/stop(?:@\w+)?$/i.test(texto)) {
    const estabaVinculado = await detenerChat(chatId)
    await enviarMensajeTelegram({
      chatId,
      texto: estabaVinculado
        ? 'Tu cuenta de Neumático Rojo fue desvinculada. No recibirás más avisos por Telegram.'
        : 'Este chat no tiene una cuenta vinculada. Podés vincularla desde Mi Perfil.'
    })
    return
  }

  const inicio = /^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]+))?$/i.exec(texto)
  if (!inicio) return
  if (!inicio[1]) {
    await enviarMensajeTelegram({
      chatId,
      texto: 'Bienvenido a Neumático Rojo. Entrá a Mi Perfil en la web y elegí «Vincular Telegram» para activar los recordatorios.'
    })
    return
  }

  const vinculado = await vincularChat(chatId, inicio[1])
  await enviarMensajeTelegram({
    chatId,
    texto: vinculado
      ? '¡Telegram vinculado correctamente con Neumático Rojo! Volvé a Mi Perfil y activá los avisos de Telegram. Configurá las sesiones desde la campanita de Race Week.'
      : 'Este enlace ya venció, fue utilizado o el chat está vinculado a otra cuenta. Generá uno nuevo desde Mi Perfil.'
  })
}

// getUpdates se consulta desde un único proceso de Railway. El desplazamiento
// se conserva en MySQL, por lo que los reinicios no reenvían comandos antiguos.
async function procesarActualizacionesTelegram () {
  const [filas] = await pool.execute(
    'SELECT ultimo_update_id FROM telegram_bot_estado WHERE clave=?', ['principal']
  )
  const ultimo = filas.length ? Number(filas[0].ultimo_update_id) : -1
  const actualizaciones = await telegramApi('getUpdates', {
    offset: ultimo >= 0 ? ultimo + 1 : undefined,
    limit: 100,
    timeout: 5,
    allowed_updates: ['message']
  }, 12000)

  for (const actualizacion of actualizaciones) {
    try {
      await manejarActualizacion(actualizacion)
    } catch (error) {
      console.error('Telegram: error procesando actualización:', error.message)
      // El siguiente ciclo puede volver a intentar este mensaje.
      break
    }
    await pool.execute(
      `INSERT INTO telegram_bot_estado (clave, ultimo_update_id) VALUES ('principal', ?)
       ON DUPLICATE KEY UPDATE ultimo_update_id=GREATEST(ultimo_update_id, VALUES(ultimo_update_id))`,
      [actualizacion.update_id]
    )
  }
}

function iniciarBotTelegram () {
  if (!habilitado()) return () => {}
  let activo = true
  async function revisar () {
    if (!activo || revisando) return
    revisando = true
    try {
      await procesarActualizacionesTelegram()
    } catch (error) {
      console.error('Telegram: error de conexión o consulta:', error.message)
    } finally {
      revisando = false
    }
  }
  void revisar()
  const intervalo = setInterval(revisar, 7000)
  return () => { activo = false; clearInterval(intervalo) }
}

module.exports = {
  habilitado,
  crearEnlaceTelegram,
  desvincularTelegram,
  enviarMensajeTelegram,
  iniciarBotTelegram,
  // Expuestos para pruebas unitarias.
  hashToken,
  vincularChat
}
