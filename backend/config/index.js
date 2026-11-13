// Configuración del servidor, conservando los valores actuales como predeterminados.
module.exports = {
  puerto: Number(process.env.PORT || 3001),
  origenFrontend: process.env.FRONTEND_URL || 'http://localhost:5173'
}
