# NeumaticoRojo — backend modular

La migración se generó a partir de la versión `server.js` con caché Jolpica que ya utiliza el proyecto. Conserva los 27 endpoints, nombres de parámetros, middleware y respuestas existentes. No modifica la base de datos.

## Instalación

1. Guardar una copia del `backend/` actual (o crear un commit).
2. Copiar los archivos de esta carpeta `backend/` sobre la carpeta `backend/` existente del proyecto.
3. **Conservar** el `backend/db.js` original, `backend/.env`, `backend/package.json`, `backend/.gitignore` y `node_modules/`: no están incluidos en el ZIP.
4. Arrancar desde `backend`: `node --watch server.js`.
5. Ejecutar las pruebas sin dependencias externas nuevas: `node --test tests/*.test.js`.
6. Verificar `/api/health`, `/api/carreras?temporada=2026`, `/api/clasificaciones?temporada=2026`, login, favoritos, resultados y resúmenes.

## Carpetas

- `server.js`: solo arranca el servidor.
- `app.js`: configuración Express y montaje de rutas.
- `config/`: puerto y origen CORS.
- `routes/`: rutas Express agrupadas.
- `controllers/`: handlers originales por funcionalidad (en `/controllers/importaciones/` hay un archivo por operación grande).
- `middlewares/`: control de sesión JWT.
- `services/`: caché Jolpica y cliente OpenF1.
- `models/db.js`: punto central de acceso al pool MySQL actual (`backend/db.js`).
- `models/auth.js`, `models/favoritos.js`, `models/clasificaciones.js`: consultas MySQL reales, extraídas de sus controladores.
- `utils/`: validaciones reutilizables.
- `tests/`: pruebas automatizadas con `node:test`.

La extracción **no ha cambiado las consultas SQL**. Las consultas de autenticación, favoritos y clasificaciones del Inicio ya están en `models/`. Las consultas más extensas de importación continúan dentro de sus controladores para preservar la funcionalidad; se pueden mover por separado después de verificar esta primera refactorización.

## Seguridad antes de hacer pública la web

Las rutas `POST /api/importar-*` conservan su comportamiento anterior y **no requieren autenticación**. No se debe publicar este backend sin protegerlas o deshabilitarlas en producción.

La configuración de CORS también necesita ajustarse a la URL real del frontend en producción (`FRONTEND_URL`). La caché en memoria se reinicia con Node.
