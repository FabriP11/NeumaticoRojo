// NeumaticoRojo — controlador general.
const pool = require('../models/db')

const health = (req, res) => {
  res.json({
    mensaje: 'Backend de NeumaticoRojo funcionando',
    estado: 'OK'
  })
}

const inicioApi = (req, res) => {
  res.json({
    proyecto: 'NeumaticoRojo',
    mensaje: 'Bienvenido a la API de NeumaticoRojo',
    estado: 'Servidor funcionando'
  })
}

const probarBase = async (req, res) => {
  try {
    const [filas] = await pool.query('SELECT DATABASE() AS baseDatos')

    res.json({
      mensaje: 'Conexión con MySQL correcta',
      baseDatos: filas[0].baseDatos
    })
  } catch (error) {
    console.error('Error de MySQL:', error.message)

    res.status(500).json({
      mensaje: 'No se pudo conectar con MySQL'
    })
  }
}

module.exports = { health, inicioApi, probarBase }
