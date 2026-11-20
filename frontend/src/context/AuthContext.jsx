import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [usuario, setUsuario] = useState(null);
  const [comprobandoSesion, setComprobandoSesion] = useState(true);

  // Consultar la sesión al abrir o recargar la web
  useEffect(() => {
    const controller = new AbortController();

    async function verificarSesion() {
      try {
        const respuesta = await fetch("/api/usuario-actual", {
          credentials: "include",
          signal: controller.signal,
        });

        if (respuesta.status === 401) {
          setUsuario(null);
          return;
        }

        if (!respuesta.ok) {
          throw new Error("No se pudo verificar la sesión");
        }

        const datos = await respuesta.json();
        setUsuario(datos.usuario);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setComprobandoSesion(false);
        }
      }
    }

    verificarSesion();

    return () => controller.abort();
  }, []);

  // Actualizar el usuario cuando hace login
  function iniciarSesion(datosUsuario) {
    // Evitar compartir cachés privados entre cuentas distintas.
    queryClient.removeQueries({ queryKey: ["privado"] });
    setUsuario(datosUsuario);
    setComprobandoSesion(false);
  }

  // Cerrar sesión en el backend
  async function cerrarSesion() {
    const respuesta = await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!respuesta.ok) {
      throw new Error("No se pudo cerrar la sesión");
    }

    queryClient.removeQueries({ queryKey: ["privado"] });
    setUsuario(null);
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        comprobandoSesion,
        iniciarSesion,
        cerrarSesion,
      }}
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
