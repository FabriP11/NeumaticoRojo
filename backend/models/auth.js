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
  return pool.execute(
    `SELECT
        id_usuario,
        nombre_usuario,
        correo,
        rol,
        id_piloto_favorito,
        id_escuderia_favorita
       FROM usuarios
       WHERE id_usuario = ?
       LIMIT 1`,
    [idUsuario]
  )
}

function buscarRolUsuario (idUsuario) {
  return pool.execute('SELECT rol FROM usuarios WHERE id_usuario = ? LIMIT 1', [
    idUsuario
  ])
}

module.exports = {
  registrarUsuario,
  buscarCredenciales,
  buscarUsuarioActual,
  buscarRolUsuario
}
