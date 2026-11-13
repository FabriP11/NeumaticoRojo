// Ultima capa para errores que llegan mediante next(error) o desde Express.
// Conserva mensajes genericos para no exponer consultas SQL ni secretos.
const mensajes = {
  400: 'Solicitud no valida',
  401: 'No autorizado',
  403: 'Acceso denegado',
  404: 'Recurso no encontrado',
  405: 'Metodo no permitido',
  409: 'Conflicto en la solicitud',
  413: 'La solicitud es demasiado grande',
  415: 'Formato de contenido no admitido',
  429: 'Demasiadas solicitudes',
  502: 'Error al comunicarse con un servicio externo',
  503: 'Servicio temporalmente no disponible'
}

function manejarErrores (error, req, res, next) {
  // Si Express ya envio encabezados, su manejador por defecto debe terminar la respuesta.
  if (res.headersSent) return next(error)

  const estadoOriginal = Number(error?.status ?? error?.statusCode)
  let estado =
    Number.isInteger(estadoOriginal) &&
    estadoOriginal >= 400 &&
    estadoOriginal <= 599
      ? estadoOriginal
      : 500

  let mensaje =
    mensajes[estado] ||
    (estado >= 500
      ? 'Error interno del servidor'
      : 'No se pudo procesar la solicitud')

  // express.json() propaga este error antes de que se ejecute el controlador.
  if (error?.type === 'entity.parse.failed') {
    estado = 400
    mensaje = 'El cuerpo de la solicitud no contiene un JSON valido'
  }

  if (error?.type === 'entity.too.large') {
    estado = 413
    mensaje = mensajes[413]
  }

  // Detalles tecnicos solo en la terminal, nunca en la respuesta de la API.
  if (estado >= 500) {
    console.error(`Error ${estado} en ${req.method} ${req.path}:`, error)
  }

  return res.status(estado).json({ mensaje })
}

module.exports = manejarErrores
