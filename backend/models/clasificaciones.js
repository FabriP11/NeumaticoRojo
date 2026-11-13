// Consultas MySQL para clasificaciones.
const pool = require('./db')

function topPilotos (temporada) {
  return pool.execute(
      `SELECT
        cp.posicion,
        p.id_piloto,
        CONCAT(p.nombre, ' ', p.apellido) AS nombre,
        cp.puntos,
        cp.victorias,

        (
          SELECT pa.numero
          FROM participaciones pa
          WHERE pa.anio = cp.anio
            AND pa.id_piloto = p.id_piloto
          ORDER BY pa.id_participacion DESC
          LIMIT 1
        ) AS numero,

        (
          SELECT pa.id_escuderia
          FROM participaciones pa
          WHERE pa.anio = cp.anio
            AND pa.id_piloto = p.id_piloto
          ORDER BY pa.id_participacion DESC
          LIMIT 1
        ) AS id_escuderia

      FROM clasificacion_pilotos cp
      INNER JOIN pilotos p
        ON cp.id_piloto = p.id_piloto
      WHERE cp.anio = ?
      ORDER BY cp.posicion ASC
      LIMIT 10`,
      [Number(temporada)]
    )
}

function topEscuderias (temporada) {
  return pool.execute(
      `SELECT
        ce.posicion,
        e.id_escuderia,
        e.nombre,
        ce.puntos,
        ce.victorias
      FROM clasificacion_escuderias ce
      INNER JOIN escuderias e
        ON ce.id_escuderia = e.id_escuderia
      WHERE ce.anio = ?
      ORDER BY ce.posicion ASC
      LIMIT 10`,
      [Number(temporada)]
    )
}

function dorsales (temporada) {
  return pool.execute(
      `SELECT
        id_piloto,
        id_escuderia,
        numero
      FROM participaciones
      WHERE anio = ?
      ORDER BY id_participacion DESC`,
      [Number(temporada)]
    )
}

module.exports = { topPilotos, topEscuderias, dorsales }
