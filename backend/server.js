// Cargar .env antes de importar app.js o config/index.js.
// En Railway se usan sus variables de entorno, sin necesidad de subir un .env.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = require('./app');
const { puerto } = require('./config');

app.listen(puerto, '0.0.0.0', () => {
  console.log(`NeumaticoRojo escuchando en el puerto ${puerto}`);
});
