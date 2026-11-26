import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { get, set, del } from "idb-keyval";
import { VIDA_CACHE } from "./utils/cachePublica";

import { AuthProvider } from "./context/AuthContext";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";

// IndexedDB: solo información pública para evitar consultas repetidas tras cerrar el navegador.
const CLAVE_CACHE = "neumaticorojo-publico-v1";
const persister = {
  // Si iOS bloquea IndexedDB (modo privado, almacenamiento lleno),
  // la aplicación continúa funcionando con la caché en memoria.
  persistClient: async (cliente) => {
    try { await set(CLAVE_CACHE, cliente); } catch { /* Caché no disponible */ }
  },
  restoreClient: async () => {
    try { return await get(CLAVE_CACHE); } catch { return undefined; }
  },
  removeClient: async () => {
    try { await del(CLAVE_CACHE); } catch { /* Caché no disponible */ }
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: VIDA_CACHE,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: VIDA_CACHE,
        buster: "publico-v1",
        dehydrateOptions: {
          shouldDehydrateQuery: (consulta) => {
            if (consulta.state.status !== "success" ||
                consulta.queryKey[0] !== "publico" ||
                consulta.meta?.persist !== true) return false;
            // No persistimos estados temporales de error ni resúmenes vacíos.
            if (consulta.queryKey[1] === "disponibilidad-sesiones") {
              return !Object.values(consulta.state.data ?? {}).includes("error");
            }
            if (["resumen-sesiones", "resumen-practicas"].includes(consulta.queryKey[1])) {
              return Object.values(consulta.state.data?.resultados ?? {})
                .some((valores) => Array.isArray(valores) && valores.length > 0);
            }
            return true;
          },
          shouldDehydrateMutation: () => false,
        },
      }}
    >
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>,
);
