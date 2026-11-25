-- Ejecutar con la conexión administradora (root) en ambas bases:
-- LOCAL: USE neumaticorojo;
-- RAILWAY: USE railway;
-- IMPORTANTE: no ejecutar el CREATE TABLE con el usuario nr_app.

CREATE TABLE IF NOT EXISTS jolpica_cache (
  url_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  url VARCHAR(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  contenido MEDIUMTEXT NOT NULL,
  tipo VARCHAR(120) NOT NULL DEFAULT 'application/json; charset=utf-8',
  guardado_ms BIGINT UNSIGNED NOT NULL,
  expira_ms BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (url_hash),
  KEY idx_jolpica_cache_guardado (guardado_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comprobación (debería devolver la tabla, aunque esté vacía):
SHOW TABLES LIKE 'jolpica_cache';
-- Tras algunas consultas a Jolpica se llenará automáticamente.
-- SELECT LEFT(url, 100) AS url, FROM_UNIXTIME(guardado_ms/1000) AS fecha
-- FROM jolpica_cache ORDER BY guardado_ms DESC LIMIT 10;
