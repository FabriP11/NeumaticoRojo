// Consultas MySQL para auth.
const pool = require('./db')

function registrarUsuario (nombre, email, contrasenaHash) {
  return pool.execute(
    `INSERT INTO usuarios
        (nombre_usuario, correo, contrasena_hash)
       VALUES (?, ?, ?)`,
    [nombre, email, contrasenaHash]
  )
}

function buscarCredenciales (identificador) {
  return pool.execute(
    `SELECT
        id_usuario,
        nombre_usuario,
        correo,
        contrasena_hash,
        rol
      FROM usuarios
      WHERE correo = ?
          OR nombre_usuario = ?
      LIMIT 1`,
    [identificador, identificador]
  )
}

function buscarUsuarioActual (idUsuario) {
  // La misma respuesta completa se utiliza en sesión, perfil, avatar y favoritos.
  // Nunca incluye contrasena_hash.
  return pool.execute(
    `SELECT
       u.id_usuario,
       u.nombre_usuario,
       u.correo,
       u.rol,
       u.id_piloto_favorito,
       u.id_escuderia_favorita,
       u.id_piloto_avatar,
       (
         SELECT CONCAT(p.nombre, ' ', p.apellido)
         FROM pilotos p
         WHERE p.id_piloto = u.id_piloto_avatar
         LIMIT 1
       ) AS nombre_avatar,
       (
         SELECT pa.id_escuderia
         FROM participaciones pa
         WHERE pa.id_piloto = u.id_piloto_avatar
           AND pa.anio = 2026
         ORDER BY pa.id_participacion DESC
         LIMIT 1
       ) AS id_escuderia_avatar
     FROM usuarios u
     WHERE u.id_usuario = ?
     LIMIT 1`,
    [idUsuario]
  )
}

function buscarRolUsuario (idUsuario) {
  return pool.execute('SELECT rol FROM usuarios WHERE id_usuario = ? LIMIT 1', [
    idUsuario
  ])
}

function guardarAvatar (idUsuario, idPilotoAvatar) {
  return pool.execute(
    `UPDATE usuarios
     SET id_piloto_avatar = ?
     WHERE id_usuario = ?`,
    [idPilotoAvatar, idUsuario]
  )
}

module.exports = {
  registrarUsuario,
  buscarCredenciales,
  buscarUsuarioActual,
  buscarRolUsuario,
  guardarAvatar
}
