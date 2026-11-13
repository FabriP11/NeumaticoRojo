// NeumaticoRojo: funciones de validacion reutilizables.
// No dependen de Express, MySQL ni de servicios externos.

function temporadaValida (valor) {
  return (
    typeof valor === 'string' &&
    /^\d{4}$/.test(valor) &&
    Number(valor) >= 1950 &&
    Number(valor) <= 2100
  )
}

function rondaValida (valor) {
  return (
    typeof valor === 'string' && /^[1-9]\d*$/.test(valor) && Number(valor) <= 30
  )
}

function identificadorF1Valido (valor) {
  return typeof valor === 'string' && /^[a-z0-9_]{1,50}$/i.test(valor)
}

function tipoSesionValido (valor) {
  return valor === 'clasificacion' || valor === 'sprint'
}

function fechaISOValida (valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false
  }

  const fecha = new Date(`${valor}T12:00:00Z`)
  return (
    !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
  )
}

module.exports = {
  temporadaValida,
  rondaValida,
  identificadorF1Valido,
  tipoSesionValido,
  fechaISOValida
}
