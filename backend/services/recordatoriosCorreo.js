// Neumático Rojo - correo HTML personalizado. Solo backend.
function escaparHtml (texto) {
  return String(texto).replace(
    /[&<>"']/g,
    s =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[s])
  )
}

function prepararMensaje ({ gp, nombre, inicio, minutos }) {
  const gpSeguro = escaparHtml(gp)
  const nombreSeguro = escaparHtml(nombre)

  const hora = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(inicio)

  const url = 'https://neumaticorojo-production.up.railway.app/'

  return {
    subject: `🏁  ${nombre} del ${gp} comienza en ${minutos} minutos`,

    html: `
      <!doctype html>
      <html lang="es">
      <body style="margin:0;background:#101116;color:#fff;font-family:Arial,Helvetica,sans-serif;padding:28px 12px">

        <!-- VISTA PREVIA DE GMAIL -->
        <div style="display:none!important;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;mso-hide:all;">
          ¡Preparate! Faltan solo ${minutos} minutos para ${nombreSeguro} del ${gpSeguro}.
        </div>

        <!-- CONTENEDOR PRINCIPAL -->
        <div style="max-width:530px;margin:auto;background:#1b1c25;border-radius:12px;overflow:hidden">

          <div style="height:5px;background:#e10600"></div>

          <div style="padding:28px">

            <h1 style="margin:0;font-size:25px">
              NEUMÁTICO <span style="color:#e10600">ROJO</span>
            </h1>

            <p style="font-size:12px;color:#aeb0bb">
              FÓRMULA 1 · RECORDATORIOS
            </p>

            <h2 style="margin-top:28px;font-size:21px">
              🏁 ¡${nombreSeguro} comienza en ${minutos} minutos!
            </h2>

            <p style="color:#e3e3e7;line-height:1.7">
              ${gpSeguro}
            </p>

            <p style="color:#e3e3e7;line-height:1.7">
              Inicio: ${escaparHtml(hora)} (Argentina)
            </p>

            <a
              href="${url}"
              style="display:inline-block;margin-top:14px;border-radius:7px;background:#e10600;color:#fff;padding:13px 18px;text-decoration:none;font-weight:bold"
            >
              VER NEUMÁTICO ROJO
            </a>

            <p style="margin-top:28px;color:#adb0bb;font-size:12px;line-height:1.6">
              Recibiste este aviso porque activaste recordatorios en Neumático Rojo.
              Podés desactivarlos desde la campanita de Race Week.
            </p>

          </div>
        </div>

      </body>
      </html>
    `,

    text: `Neumático Rojo: ${nombre} del ${gp} empieza en ${minutos} minutos. Inicio: ${hora} (Argentina). ${url}. Para desactivar recordatorios, ingresá a la campanita de Race Week.`
  }
}

async function enviarCorreo ({ destinatario, sesion, minutos, clave }) {
  if (!process.env.RESEND_API_KEY) throw new Error('Falta RESEND_API_KEY')
  const remitente =
    process.env.RESEND_FROM || 'Neumático Rojo <onboarding@resend.dev>'
  const { Resend } = require('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const contenido = prepararMensaje({ ...sesion, minutos })
  const { data, error } = await resend.emails.send(
    {
      from: remitente,
      to: [destinatario],
      ...contenido
    },
    { idempotencyKey: clave }
  )
  if (error) throw new Error(error.message || 'Resend rechazó el envío')
  if (!data?.id) throw new Error('Resend no devolvió id del mensaje')
  return data.id
}

// El remitente de prueba de Resend solo puede enviar a la cuenta propia.
function destinatarioPermitido (destinatario) {
  const remitente =
    process.env.RESEND_FROM || 'Neumático Rojo <onboarding@resend.dev>'
  if (!/onboarding@resend\.dev/i.test(remitente)) return true
  const correoPrueba = (process.env.RESEND_CORREO_PRUEBA || '')
    .trim()
    .toLowerCase()
  return Boolean(correoPrueba) && destinatario.toLowerCase() === correoPrueba
}

module.exports = { prepararMensaje, enviarCorreo, destinatarioPermitido }
