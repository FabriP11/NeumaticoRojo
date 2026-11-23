const { sincronizarClasificaciones } = require('./importaciones/clasificaciones')
const model = require('../models/favoritos')

// Guardar los favoritos del usuario
const actualizarFavoritos = async (req, res) => {
  try {
    const { id_piloto_favorito, id_escuderia_favorita } = req.body || {}

    // Validar identificadores
    function identificadorValido (valor) {
      return (
        valor === null ||
        (typeof valor === 'string' && /^[a-zA-Z0-9_]{1,50}$/.test(valor))
      )
    }

    if (
      !identificadorValido(id_piloto_favorito) ||
      !identificadorValido(id_escuderia_favorita)
    ) {
      return res.status(400).json({
        mensaje: 'Datos de favoritos inválidos'
      })
    }

    // Verificar que el usuario exista
    const [usuarios] = await model.comprobarUsuario(req.idUsuario)

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensaje: 'La cuenta ya no existe'
      })
    }

    // Obtener únicamente participantes de 2026
    const [respuestaPilotos, respuestaEscuderias] = await Promise.all([
      model.opcionesPilotos(),
      model.opcionesEscuderias()
    ])

    const pilotos2026 = respuestaPilotos[0]
    const escuderias2026 = respuestaEscuderias[0]

    // Comprobar que el piloto pertenezca a 2026
    const pilotoValido =
      id_piloto_favorito === null ||
      pilotos2026.some(piloto => piloto.id_piloto === id_piloto_favorito)

    if (!pilotoValido) {
      return res.status(400).json({
        mensaje: 'El piloto seleccionado no participa en 2026'
      })
    }

    // Comprobar que la escudería pertenezca a 2026
    const escuderiaValida =
      id_escuderia_favorita === null ||
      escuderias2026.some(
        escuderia => escuderia.id_escuderia === id_escuderia_favorita
      )

    if (!escuderiaValida) {
      return res.status(400).json({
        mensaje: 'La escudería seleccionada no participa en 2026'
      })
    }

    // Guardar favoritos en MySQL
    await model.guardarFavoritos(
      id_piloto_favorito,
      id_escuderia_favorita,
      req.idUsuario
    )

    // Obtener usuario actualizado
    const [usuariosActualizados] = await model.consultarUsuarioFavoritos(
      req.idUsuario
    )

    res.json({
      mensaje: 'Favoritos guardados correctamente',
      usuario: usuariosActualizados[0]
    })
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        mensaje: 'El piloto o la escudería seleccionados no existen'
      })
    }

    console.error('Error al guardar favoritos:', error.message)

    res.status(500).json({
      mensaje: 'No se pudieron guardar los favoritos'
    })
  }
}

// Obtener estadísticas de los favoritos
const obtenerResumenFavoritos = async (req, res) => {
  try {
    const temporada = req.query.temporada || '2026'

    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    // Sincronizar la temporada actual antes de leer posiciones, puntos y victorias.
    // Ante un fallo externo, conservar los datos ya guardados en MySQL.
    if (temporada === String(new Date().getUTCFullYear())) {
      try {
        await sincronizarClasificaciones(temporada)
      } catch (error) {
        console.warn('Favoritos: se usarán los últimos datos guardados:', error.message)
      }
    }

    const [filas] = await model.consultarResumenFavoritos(
      temporada,
      req.idUsuario
    )

    if (filas.length === 0) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado'
      })
    }

    const datos = filas[0]

    let participacionPiloto = null

    if (datos.id_piloto) {
      const [participaciones] = await model.consultarParticipacion(
        temporada,
        datos.id_piloto
      )

      participacionPiloto = participaciones[0] || null
    }

    const piloto = datos.id_piloto
      ? {
          id: datos.id_piloto,
          nombre: `${datos.piloto_nombre} ${datos.piloto_apellido}`,
          posicion: datos.piloto_posicion,
          puntos:
            datos.piloto_puntos !== null ? Number(datos.piloto_puntos) : null,
          victorias: datos.piloto_victorias,
          numero: participacionPiloto?.numero ?? null,
          id_escuderia: participacionPiloto?.id_escuderia ?? null
        }
      : null

    const escuderia = datos.id_escuderia
      ? {
          id: datos.id_escuderia,
          nombre: datos.escuderia_nombre,
          posicion: datos.escuderia_posicion,
          puntos:
            datos.escuderia_puntos !== null
              ? Number(datos.escuderia_puntos)
              : null,
          victorias: datos.escuderia_victorias
        }
      : null

    res.json({
      temporada,
      piloto,
      escuderia
    })
  } catch (error) {
    console.error('Error al obtener resumen de favoritos:', error.message)

    res.status(500).json({
      mensaje: 'No se pudo obtener el resumen de favoritos'
    })
  }
}

// Opciones del selector: únicamente temporada 2026
const opcionesFavoritos = async (req, res) => {
  try {
    const [respuestaPilotos, respuestaEscuderias] = await Promise.all([
      model.opcionesPilotos(),
      model.opcionesEscuderias()
    ])

    res.json({
      pilotos: respuestaPilotos[0],
      escuderias: respuestaEscuderias[0]
    })
  } catch (error) {
    console.error('Error al obtener favoritos:', error.message)

    res.status(500).json({
      mensaje: 'No se pudieron obtener las opciones'
    })
  }
}

module.exports = {
  actualizarFavoritos,
  obtenerResumenFavoritos,
  opcionesFavoritos
}
