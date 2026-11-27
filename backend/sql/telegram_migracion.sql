-- Ejecutar UNA VEZ en la base de datos Railway `railway` (y en local `neumaticorojo` para pruebas).
-- Confirmá previamente la conexión correcta en Workbench. No elimina datos existentes.
-- Si ya ejecutaste estas sentencias, no las repitas.

ALTER TABLE preferencias_notificaciones
  ADD COLUMN correo_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN telegram_activo TINYINT(1) NOT NULL DEFAULT 0;

-- No se define FK en esta migración: el tipo exacto de usuarios.id_usuario
-- debe verificarse en la base real antes de agregar una referencia.
CREATE TABLE telegram_vinculaciones (
  id_usuario INT NOT NULL PRIMARY KEY,
  chat_id BIGINT NULL UNIQUE,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL UNIQUE,
  token_expira DATETIME NULL,
  vinculado_en DATETIME NULL,
  ultimo_test DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE telegram_bot_estado (
  clave VARCHAR(32) NOT NULL PRIMARY KEY,
  ultimo_update_id BIGINT NOT NULL DEFAULT -1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notificaciones_enviadas_telegram (
  id_usuario INT NOT NULL,
  temporada SMALLINT NOT NULL,
  ronda SMALLINT NOT NULL,
  tipo VARCHAR(32) NOT NULL,
  minutos_antes TINYINT NOT NULL,
  inicio_utc DATETIME NOT NULL,
  estado VARCHAR(16) NOT NULL DEFAULT 'pendiente',
  intentos SMALLINT NOT NULL DEFAULT 0,
  ultimo_intento DATETIME NULL,
  enviado_en DATETIME NULL,
  mensaje_id BIGINT NULL,
  ultimo_error VARCHAR(400) NULL,
  PRIMARY KEY (id_usuario, temporada, ronda, tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Estado inicial para el cursor de actualizaciones del bot.
INSERT IGNORE INTO telegram_bot_estado (clave, ultimo_update_id) VALUES ('principal', -1);
