-- Emotilens · MySQL / MariaDB (phpMyAdmin → Import)
CREATE DATABASE IF NOT EXISTS emotilens CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE emotilens;

DROP VIEW  IF EXISTS v_history;
DROP VIEW  IF EXISTS v_stats;
DROP TABLE IF EXISTS detections;
DROP TABLE IF EXISTS emotions;

-- Master label emosi
CREATE TABLE emotions (
  label VARCHAR(20) NOT NULL PRIMARY KEY,
  name  VARCHAR(30) NOT NULL,
  color CHAR(7)     NOT NULL
) ENGINE=InnoDB;

INSERT INTO emotions (label, name, color) VALUES
('happy','Senang','#f59e0b'),('neutral','Netral','#8492a6'),('sad','Sedih','#3b82f6'),
('angry','Marah','#ef4444'),('surprise','Terkejut','#8b5cf6'),('fear','Takut','#14b8a6'),
('disgust','Jijik','#84cc16');

-- Hasil tiap deteksi (otomatis / tombol Capture)
CREATE TABLE detections (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  emotion    VARCHAR(20)  NOT NULL,
  confidence DECIMAL(4,3) NOT NULL,
  source     ENUM('model','demo') NOT NULL DEFAULT 'model',
  image_data MEDIUMTEXT   NULL COMMENT 'thumbnail wajah (data URL JPEG), NULL bila tidak disimpan',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_created (created_at),
  KEY idx_emotion (emotion),
  CONSTRAINT fk_det_emotion FOREIGN KEY (emotion) REFERENCES emotions(label)
) ENGINE=InnoDB;

-- Rekap statistik per emosi
CREATE VIEW v_stats AS
SELECT e.label, e.name, COUNT(d.id) AS total, ROUND(AVG(d.confidence),3) AS avg_confidence
FROM emotions e LEFT JOIN detections d ON d.emotion = e.label
GROUP BY e.label, e.name ORDER BY total DESC;

-- Riwayat terbaru dulu
CREATE VIEW v_history AS
SELECT d.id, d.created_at, e.name AS emotion, d.confidence, d.source
FROM detections d JOIN emotions e ON e.label = d.emotion
ORDER BY d.created_at DESC;

-- Contoh data awal (boleh dihapus)
INSERT INTO detections (emotion, confidence, source, created_at) VALUES
('happy',0.912,'demo',NOW() - INTERVAL 10 MINUTE),('neutral',0.801,'demo',NOW() - INTERVAL 40 MINUTE),
('happy',0.874,'demo',NOW() - INTERVAL 3 HOUR),('sad',0.688,'demo',NOW() - INTERVAL 5 HOUR),
('surprise',0.756,'demo',NOW() - INTERVAL 1 DAY),('neutral',0.833,'demo',NOW() - INTERVAL 1 DAY - INTERVAL 2 HOUR),
('angry',0.702,'demo',NOW() - INTERVAL 2 DAY),('happy',0.941,'demo',NOW() - INTERVAL 2 DAY - INTERVAL 4 HOUR),
('fear',0.611,'demo',NOW() - INTERVAL 3 DAY),('neutral',0.790,'demo',NOW() - INTERVAL 4 DAY),
('happy',0.885,'demo',NOW() - INTERVAL 5 DAY),('disgust',0.644,'demo',NOW() - INTERVAL 6 DAY);
