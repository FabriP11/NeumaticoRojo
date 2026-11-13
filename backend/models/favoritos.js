// Consultas MySQL para favoritos.
const pool = require('./db')

function comprobarUsuario (idUsuario) {
  return pool.execute(
      `SELECT id_usuario
         FROM usuarios
         WHERE id_usuario = ?`,
      [idUsuario]
    )
}

function guardarFavoritos (id_piloto_favorito, id_escuderia_favorita, idUsuario) {
  return pool.execute(
      `UPDATE usuarios
         SET
           id_piloto_favorito = ?,
           id_escuderia_favorita = ?
         WHERE id_usuario = ?`,
      [id_piloto_favorito, id_escuderia_favorita, idUsuario]
    )
}

function consultarUsuarioFavoritos (idUsuario) {
  return pool.execute(
      `SELECT
          id_usuario,
          nombre_usuario,
          correo,
          rol,
          id_piloto_favorito,
          id_escuderia_favorita
         FROM usuarios
         WHERE id_usuario = ?`,
      [idUsuario]
    )
}

function consultarResumenFavoritos (temporada, idUsuario) {
  return pool.execute(
      `SELECT
          p.id_piloto,
          p.nombre AS piloto_nombre,
          p.apellido AS piloto_apellido,

          cp.posicion AS piloto_posicion,
          cp.puntos AS piloto_puntos,
          cp.victorias AS piloto_victorias,

          e.id_escuderia,
          e.nombre AS escuderia_nombre,

          ce.posicion AS escuderia_posicion,
          ce.puntos AS escuderia_puntos,
          ce.victorias AS escuderia_victorias

        FROM usuarios u

        LEFT JOIN pilotos p
          ON u.id_piloto_favorito = p.id_piloto

        LEFT JOIN escuderias e
          ON u.id_escuderia_favorita = e.id_escuderia

        LEFT JOIN clasificacion_pilotos cp
          ON cp.id_piloto = p.id_piloto
          AND cp.anio = ?

        LEFT JOIN clasificacion_escuderias ce
          ON ce.id_escuderia = e.id_escuderia
          AND ce.anio = ?

        WHERE u.id_usuario = ?
        LIMIT 1`,
      [Number(temporada), Number(temporada), idUsuario]
    )
}

function consultarParticipacion (temporada, idPiloto) {
  return pool.execute(
        `SELECT
            numero,
            id_escuderia
          FROM participaciones
          WHERE anio = ?
            AND id_piloto = ?
          ORDER BY id_participacion DESC
          LIMIT 1`,
        [Number(temporada), idPiloto]
      )
}

function opcionesPilotos () {
  return pool.execute(
      `SELECT
        id_piloto,
        nombre,
        apellido,
        nacionalidad
       FROM pilotos
       ORDER BY nombre ASC, apellido ASC`
    )
}

function opcionesEscuderias () {
  return pool.execute(
      `SELECT
        id_escuderia,
        nombre,
        nacionalidad
       FROM escuderias
       ORDER BY nombre`
    )
}

module.exports = { comprobarUsuario, guardarFavoritos, consultarUsuarioFavoritos, consultarResumenFavoritos, consultarParticipacion, opcionesPilotos, opcionesEscuderias }
