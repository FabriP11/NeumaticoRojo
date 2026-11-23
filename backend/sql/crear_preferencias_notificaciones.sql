-- Ejecutar SOLO en MySQL LOCAL para probar la campanita.
-- La base de Railway es independiente: allí se ejecutará al publicar.
USE neumaticorojo;

CREATE TABLE IF NOT EXISTS preferencias_notificaciones (
  id_usuario INT NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 0,
  minutos_antes TINYINT UNSIGNED NOT NULL DEFAULT 10,
  sesiones JSON NOT NULL,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  CONSTRAINT fk_pref_notif_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
  CONSTRAINT chk_pref_notif_minutos CHECK (minutos_antes IN (5, 10))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT * FROM preferencias_notificaciones;
