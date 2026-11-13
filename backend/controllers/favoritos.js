// NeumaticoRojo — controlador favoritos.
const model = require('../models/favoritos')

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

    // Verificar que la cuenta siga existiendo
    const [usuarios] = await model.comprobarUsuario(req.idUsuario)

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensaje: 'La cuenta ya no existe'
      })
    }

    // Guardar los favoritos en MySQL
    await model.guardarFavoritos(id_piloto_favorito, id_escuderia_favorita, req.idUsuario)

    // Consultar los datos actualizados
    const [usuariosActualizados] = await model.consultarUsuarioFavoritos(req.idUsuario)

    res.json({
      mensaje: 'Favoritos guardados correctamente',
      usuario: usuariosActualizados[0]
    })
  } catch (error) {
    // MySQL impide guardar pilotos o escuderías
    // que no existen en sus tablas
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

const obtenerResumenFavoritos = async (req, res) => {
  try {
    const temporada = req.query.temporada || '2026'

    // Validar temporada
    if (!/^\d{4}$/.test(temporada)) {
      return res.status(400).json({
        mensaje: 'Temporada inválida'
      })
    }

    // Consultar favoritos y sus estadísticas
    const [filas] = await model.consultarResumenFavoritos(temporada, req.idUsuario)

    // Comprobar que existe el usuario
    if (filas.length === 0) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado'
      })
    }

    const datos = filas[0]

    // Buscar la participación del piloto favorito en la temporada seleccionada
    let participacionPiloto = null

    if (datos.id_piloto) {
      const [participaciones] = await model.consultarParticipacion(temporada, datos.id_piloto)

      participacionPiloto = participaciones[0] || null
    }

    // Preparar información del piloto favorito
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

    // Preparar información de la escudería favorita
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

    // Enviar información a React
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

const opcionesFavoritos = async (req, res) => {
  try {
    // Obtener pilotos desde MySQL
    const [pilotos] = await model.opcionesPilotos()

    // Obtener escuderías desde MySQL
    const [escuderias] = await model.opcionesEscuderias()

    res.json({
      pilotos,
      escuderias
    })
  } catch (error) {
    console.error('Error al obtener favoritos:', error.message)

    res.status(500).json({
      mensaje: 'No se pudieron obtener las opciones'
    })
  }
}

module.exports = { actualizarFavoritos, obtenerResumenFavoritos, opcionesFavoritos }
