const mysql = require('mysql2/promise')
const path = require('path')

// Cargar variables del archivo .env
require('dotenv').config({
  path: path.join(__dirname, '.env')
})

// Crear un grupo de conexiones a MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

module.exports = pool
