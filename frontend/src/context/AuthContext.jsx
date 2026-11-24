import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const revisionSesion = useRef(0);
  const [usuario, setUsuario] = useState(null);
  const [comprobandoSesion, setComprobandoSesion] = useState(true);

  const invalidarSesion = useCallback(() => {
    // Invalidar solicitudes de verificación iniciadas con una sesión anterior.
    revisionSesion.current += 1;
    // La sesión expiró o el servidor rechazó la cookie: limpiar datos privados.
    queryClient.removeQueries({ queryKey: ["privado"] });
    setUsuario(null);
    setComprobandoSesion(false);
  }, [queryClient]);

  const verificarSesion = useCallback(async (signal) => {
    const revisionInicial = revisionSesion.current;
    try {
      const respuesta = await fetch("/api/usuario-actual", {
        credentials: "include",
        cache: "no-store",
        signal,
      });
      if (signal?.aborted || revisionInicial !== revisionSesion.current) return;
      if (respuesta.status === 401) {
        invalidarSesion();
        return;
      }
      if (!respuesta.ok) throw new Error("No se pudo verificar la sesión");
      const datos = await respuesta.json();
      if (!signal?.aborted && revisionInicial === revisionSesion.current) {
        setUsuario(datos.usuario ?? null);
      }
    } catch (error) {
      // Un problema de red no significa que la sesión haya caducado.
      if (error.name !== "AbortError") console.error(error.message);
    } finally {
      if (!signal?.aborted) setComprobandoSesion(false);
    }
  }, [invalidarSesion]);

  useEffect(() => {
    const controller = new AbortController();
    verificarSesion(controller.signal);
    return () => controller.abort();
  }, [verificarSesion]);

  useEffect(() => {
    window.addEventListener("nr:sesion-expirada", invalidarSesion);
    return () => window.removeEventListener("nr:sesion-expirada", invalidarSesion);
  }, [invalidarSesion]);

  // Revalidar al volver a la pestaña y periódicamente si permanece abierta.
  // Se limita la frecuencia para evitar solicitudes duplicadas por focus/visibilitychange.
  useEffect(() => {
    let ultimaComprobacion = Date.now();
    let controlador = null;
    function revalidar() {
      if (document.hidden || Date.now() - ultimaComprobacion < 30_000) return;
      ultimaComprobacion = Date.now();
      controlador?.abort();
      controlador = new AbortController();
      verificarSesion(controlador.signal);
    }
    window.addEventListener("focus", revalidar);
    document.addEventListener("visibilitychange", revalidar);
    const intervalo = window.setInterval(revalidar, 2 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", revalidar);
      document.removeEventListener("visibilitychange", revalidar);
      window.clearInterval(intervalo);
      controlador?.abort();
    };
  }, [verificarSesion]);

  function iniciarSesion(datosUsuario) {
    revisionSesion.current += 1;
    queryClient.removeQueries({ queryKey: ["privado"] });
    setUsuario(datosUsuario);
    setComprobandoSesion(false);
  }

  async function cerrarSesion() {
    const respuesta = await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });
    if (!respuesta.ok && respuesta.status !== 401) {
      throw new Error("No se pudo cerrar la sesión");
    }
    invalidarSesion();
  }

  return (
    <AuthContext.Provider
      value={{ usuario, comprobandoSesion, iniciarSesion, cerrarSesion }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  }
  return contexto;
}
