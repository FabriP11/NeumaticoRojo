// Validacion previa de parametros en las rutas.
// Se aplica solamente a los endpoints que la necesitan.
const {
  temporadaValida,
  rondaValida,
  identificadorF1Valido,
  tipoSesionValido,
  fechaISOValida
} = require('../utils/validaciones')

function error400 (res, mensaje) {
  return res.status(400).json({ mensaje })
}

// 'current' se admite solo en calendario y clasificaciones de Jolpica.
function validarTemporada ({
  permitirCurrent = false,
  obligatoria = false
} = {}) {
  return (req, res, next) => {
    const valor = req.query?.temporada

    if (valor === undefined) {
      return obligatoria ? error400(res, 'Temporada inválida') : next()
    }

    if (temporadaValida(valor) || (permitirCurrent && valor === 'current')) {
      return next()
    }

    return error400(res, 'Temporada inválida')
  }
}

function validarRonda ({ obligatoria = false } = {}) {
  return (req, res, next) => {
    const valor = req.query?.ronda

    if (valor === undefined) {
      return obligatoria ? error400(res, 'Ronda inválida') : next()
    }

    return rondaValida(valor) ? next() : error400(res, 'Ronda inválida')
  }
}

function validarIdentificador (tipo) {
  const mensaje =
    tipo === 'escuderia'
      ? 'Identificador de escudería inválido'
      : 'Identificador de piloto inválido'

  return (req, res, next) => {
    return identificadorF1Valido(req.params?.id)
      ? next()
      : error400(res, mensaje)
  }
}

function validarTipoSesion (req, res, next) {
  const valor = req.query?.tipo
  if (valor === undefined || tipoSesionValido(valor)) return next()
  return error400(res, 'Tipo de sesión inválido')
}

function validarFecha (req, res, next) {
  return fechaISOValida(req.query?.fecha)
    ? next()
    : error400(res, 'Fecha inválida')
}

module.exports = {
  validarTemporada,
  validarRonda,
  validarIdentificador,
  validarTipoSesion,
  validarFecha
}
