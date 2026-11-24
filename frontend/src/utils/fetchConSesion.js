// Utilizar para endpoints que requieren una sesión activa.
// Los endpoints públicos /api/login y /api/registro mantienen fetch normal:
// un 401 allí no debe cerrar otra sesión por accidente.
export async function fetchConSesion(url, opciones = {}) {
  const respuesta = await fetch(url, { credentials: "include", ...opciones });
  if (respuesta.status === 401 && !opciones.signal?.aborted) {
    window.dispatchEvent(new Event("nr:sesion-expirada"));
  }
  return respuesta;
}
