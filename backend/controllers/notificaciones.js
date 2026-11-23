const pool = require('../models/db')

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
      'SELECT activo, minutos_antes, sesiones FROM preferencias_notificaciones WHERE id_usuario = ?',
      [req.idUsuario]
    )
    const datos = filas[0]
    res.json({
      activo: Boolean(datos?.activo),
      minutos_antes: datos ? Number(datos.minutos_antes) : 10,
      sesiones: datos ? convertirSesiones(datos.sesiones) : []
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

module.exports = { consultarPreferencias, guardarPreferencias }
