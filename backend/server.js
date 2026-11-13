const app = require('./app')
const { puerto } = require('./config')

app.listen(puerto, () => {
  console.log(`Servidor funcionando en http://localhost:${puerto}`)
})
