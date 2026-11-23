const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { origenFrontend } = require('./config');
const verificarOrigen = require('./middlewares/verificarOrigen');

const app = express();

// Mismos middlewares que el proyecto original.
app.use(cors({ origin: origenFrontend, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(verificarOrigen);

// En produccion React y Express comparten un unico dominio.
const esProduccion = process.env.NODE_ENV === 'production';
const carpetaFrontend = path.resolve(__dirname, '../frontend/dist');
const archivoInicio = path.join(carpetaFrontend, 'index.html');

if (esProduccion) {
  if (!fs.existsSync(archivoInicio)) {
    throw new Error(
      'No se encontro frontend/dist/index.html. Ejecuta la compilacion del frontend antes de iniciar el servidor.'
    );
  }

  // Imagenes, JS, CSS y demas archivos generados por Vite.
  app.use(express.static(carpetaFrontend, { index: false }));

  // Mostrar React en / aun si existe alguna antigua ruta raiz.
  app.get('/', (req, res) => res.sendFile(archivoInicio));
}

// Endpoints originales, conservando su orden.
app.use(require('./routes/favoritos'));
app.use(require('./routes/general'));
app.use(require('./routes/calendario'));
app.use(require('./routes/clasificaciones'));
app.use(require('./routes/pilotos'));
app.use(require('./routes/resultados'));
app.use(require('./routes/escuderias'));
app.use(require('./routes/importaciones'));
app.use(require('./routes/auth'));
app.use(require('./routes/resumenes'));
app.use(require('./routes/notificaciones'));

if (esProduccion) {
  // Permite abrir directamente /resultados, /escuderias/..., etc.
  // No convertir un error de API en una pagina HTML.
  app.get('/{*splat}', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) {
      return next();
    }
    if (!req.accepts('html')) {
      return next();
    }
    return res.sendFile(archivoInicio);
  });
}

// Mantener los manejadores de errores al final.
app.use(require('./middlewares/rutaNoEncontrada'));
app.use(require('./middlewares/manejarErrores'));

module.exports = app;
