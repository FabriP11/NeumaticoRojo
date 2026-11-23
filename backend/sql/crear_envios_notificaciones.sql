-- Neumático Rojo: ejecutar primero en tu MySQL LOCAL, no en Railway.
USE neumaticorojo;

-- Una sola notificación por usuario, Gran Premio y sesión, sin duplicados.
CREATE TABLE IF NOT EXISTS notificaciones_enviadas (
  id_envio BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  temporada SMALLINT UNSIGNED NOT NULL,
  ronda SMALLINT UNSIGNED NOT NULL,
  tipo VARCHAR(32) NOT NULL,
  minutos_antes TINYINT UNSIGNED NOT NULL,
  inicio_utc DATETIME NOT NULL,
  estado ENUM('pendiente','procesando','enviado','error') NOT NULL DEFAULT 'pendiente',
  intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ultimo_intento DATETIME NULL,
  enviado_en DATETIME NULL,
  resend_id VARCHAR(120) NULL,
  ultimo_error VARCHAR(400) NULL,
  PRIMARY KEY (id_envio),
  UNIQUE KEY uq_usuario_sesion (id_usuario, temporada, ronda, tipo),
  CONSTRAINT fk_envio_notif_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT id_envio, id_usuario, temporada, ronda, tipo, minutos_antes, estado, intentos, enviado_en
FROM notificaciones_enviadas ORDER BY id_envio DESC LIMIT 20;
