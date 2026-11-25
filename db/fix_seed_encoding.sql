-- =====================================================================
--  Reparare diacritice în datele inițiale (double-encoding latin1 -> utf8mb4)
--
--  Problema: schema.sql a fost rulat de clientul mysql din container cu
--  character_set_client = latin1, așa că textele UTF-8 ("Plasă") au fost
--  salvate ca mojibake ("PlasÄƒ"). Scriptul e idempotent: modifică doar
--  valorile care sunt reversibil mojibake, deci rularea repetată nu strică
--  textele deja corecte (inclusiv datele introduse din aplicație).
--
--  Rulare (din folderul proiectului):
--    docker exec -i mysql_db_dev sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" \
--      --default-character-set=utf8mb4 "$MYSQL_DATABASE"' < db/fix_seed_encoding.sql
--
--  Nu e necesar pe o bază nouă: schema.sql setează acum SET NAMES utf8mb4.
-- =====================================================================

SET NAMES utf8mb4;

START TRANSACTION;

-- O valoare e reparată doar dacă: conține caractere non-ASCII ȘI conversia
-- inversă latin1 -> octeți -> utf8mb4 este fără pierderi (round-trip identic).
UPDATE user_statuses
   SET label = CONVERT(CAST(CONVERT(label USING latin1) AS BINARY) USING utf8mb4)
 WHERE label REGEXP '[^ -~\n\r\t]'
   AND CONVERT(CONVERT(label USING latin1) USING utf8mb4) = label COLLATE utf8mb4_bin
   AND CONVERT(CAST(CONVERT(label USING latin1) AS BINARY) USING utf8mb4) IS NOT NULL;

UPDATE facilities
   SET name = CONVERT(CAST(CONVERT(name USING latin1) AS BINARY) USING utf8mb4)
 WHERE name REGEXP '[^ -~\n\r\t]'
   AND CONVERT(CONVERT(name USING latin1) USING utf8mb4) = name COLLATE utf8mb4_bin
   AND CONVERT(CAST(CONVERT(name USING latin1) AS BINARY) USING utf8mb4) IS NOT NULL;

UPDATE facilities
   SET description = CONVERT(CAST(CONVERT(description USING latin1) AS BINARY) USING utf8mb4)
 WHERE description REGEXP '[^ -~\n\r\t]'
   AND CONVERT(CONVERT(description USING latin1) USING utf8mb4) = description COLLATE utf8mb4_bin
   AND CONVERT(CAST(CONVERT(description USING latin1) AS BINARY) USING utf8mb4) IS NOT NULL;

UPDATE equipment
   SET name = CONVERT(CAST(CONVERT(name USING latin1) AS BINARY) USING utf8mb4)
 WHERE name REGEXP '[^ -~\n\r\t]'
   AND CONVERT(CONVERT(name USING latin1) USING utf8mb4) = name COLLATE utf8mb4_bin
   AND CONVERT(CAST(CONVERT(name USING latin1) AS BINARY) USING utf8mb4) IS NOT NULL;

UPDATE app_settings
   SET note = CONVERT(CAST(CONVERT(note USING latin1) AS BINARY) USING utf8mb4)
 WHERE note REGEXP '[^ -~\n\r\t]'
   AND CONVERT(CONVERT(note USING latin1) USING utf8mb4) = note COLLATE utf8mb4_bin
   AND CONVERT(CAST(CONVERT(note USING latin1) AS BINARY) USING utf8mb4) IS NOT NULL;

UPDATE terms_versions
   SET body = CONVERT(CAST(CONVERT(body USING latin1) AS BINARY) USING utf8mb4)
 WHERE body REGEXP '[^ -~\n\r\t]'
   AND CONVERT(CONVERT(body USING latin1) USING utf8mb4) = body COLLATE utf8mb4_bin
   AND CONVERT(CAST(CONVERT(body USING latin1) AS BINARY) USING utf8mb4) IS NOT NULL;

COMMIT;

-- View-ul conține literalii 'Plătit' / 'Neplătit', salvați și ei greșit:
-- îl recreăm cu conexiunea în utf8mb4 (definiție identică cu schema.sql).
CREATE OR REPLACE VIEW v_admin_requests AS
SELECT b.id AS booking_id, u.full_name AS client, f.name AS facility,
       b.start_at, b.hours_count, b.total_amount, b.status,
       CASE WHEN EXISTS (SELECT 1 FROM payments p
                          WHERE p.booking_id = b.id AND p.status = 'reusita')
            THEN 'Plătit' ELSE 'Neplătit' END AS payment_state
  FROM bookings b
  JOIN users u      ON u.id = b.user_id
  JOIN facilities f ON f.id = b.facility_id;
