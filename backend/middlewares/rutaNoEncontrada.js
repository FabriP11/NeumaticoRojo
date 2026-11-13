// Responde 404 cuando ninguna ruta de Express coincide.
// Debe registrarse despues de todos los routers.
function rutaNoEncontrada (req, res) {
  return res.status(404).json({
    mensaje: 'Ruta no encontrada'
  })
}

module.exports = rutaNoEncontrada
