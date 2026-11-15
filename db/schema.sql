-- =====================================================================
--  Rezervări Sport USV — schemă MySQL 8.0+
--  (versiunea convertită din PostgreSQL)
--
--  Cerințe: MySQL 8.0.16 sau mai nou (pentru CHECK și CTE recursive).
--  Rulare: se execută o singură dată, de sus în jos, pe un server gol.
-- =====================================================================

-- DROP DATABASE IF EXISTS rezervari_sport_usv;
-- CREATE DATABASE rezervari_sport_usv
--     CHARACTER SET utf8mb4
--     COLLATE utf8mb4_unicode_ci;
-- USE rezervari_sport_usv;

-- ---------------------------------------------------------------------
-- 1. STATUTURI UTILIZATOR + REDUCERI
-- ---------------------------------------------------------------------
CREATE TABLE user_statuses (
    code              VARCHAR(20)  NOT NULL PRIMARY KEY,   -- 'student', 'cadru', 'extern'
    label             VARCHAR(60)  NOT NULL,
    discount_percent  DECIMAL(5,2) NOT NULL DEFAULT 0,
    CONSTRAINT chk_discount CHECK (discount_percent BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. UTILIZATORI
--    (colația utf8mb4_unicode_ci face email-ul case-insensitive, ca CITEXT)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email             VARCHAR(255) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,              -- bcrypt/argon2, NICIODATĂ parola în clar
    full_name         VARCHAR(150) NOT NULL,
    phone             VARCHAR(30),
    role              ENUM('user','admin') NOT NULL DEFAULT 'user',
    status_code       VARCHAR(20)  NOT NULL DEFAULT 'student',
    status_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    notify_in_app     BOOLEAN NOT NULL DEFAULT TRUE,
    notify_email      BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_minutes  INT NOT NULL DEFAULT 60,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at     DATETIME NULL,
    CONSTRAINT fk_users_status FOREIGN KEY (status_code) REFERENCES user_statuses(code),
    CONSTRAINT chk_reminder CHECK (reminder_minutes IN (30, 60, 120, 1440))
) ENGINE=InnoDB;

CREATE TABLE password_reset_tokens (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  DATETIME NOT NULL,
    used_at     DATETIME NULL,
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. FACILITĂȚI
-- ---------------------------------------------------------------------
CREATE TABLE facilities (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(100) NOT NULL UNIQUE,
    description      TEXT,
    price_per_hour   DECIMAL(10,2) NOT NULL,
    game_multiplier  DECIMAL(4,2)  NOT NULL DEFAULT 1.50,   -- „pe joc" = 1.5 × tariful orar
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fac_price CHECK (price_per_hour >= 0),
    CONSTRAINT chk_fac_mult  CHECK (game_multiplier > 0)
) ENGINE=InnoDB;

CREATE TABLE facility_blocks (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    facility_id  BIGINT UNSIGNED NOT NULL,
    starts_at    DATETIME NOT NULL,
    ends_at      DATETIME NOT NULL,
    reason       VARCHAR(255),
    created_by   BIGINT UNSIGNED NULL,
    CONSTRAINT fk_fb_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
    CONSTRAINT fk_fb_user     FOREIGN KEY (created_by)  REFERENCES users(id),
    CONSTRAINT chk_fb_range   CHECK (ends_at > starts_at),
    INDEX ix_facility_blocks_range (facility_id, starts_at, ends_at)
) ENGINE=InnoDB;

CREATE TABLE facility_hours (
    facility_id  BIGINT UNSIGNED NOT NULL,
    weekday      TINYINT NOT NULL,                          -- 1 = luni ... 7 = duminică
    open_hour    TINYINT NOT NULL,
    close_hour   TINYINT NOT NULL,
    PRIMARY KEY (facility_id, weekday),
    CONSTRAINT fk_fh_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
    CONSTRAINT chk_fh_weekday CHECK (weekday BETWEEN 1 AND 7),
    CONSTRAINT chk_fh_open    CHECK (open_hour BETWEEN 0 AND 23),
    CONSTRAINT chk_fh_close   CHECK (close_hour BETWEEN 1 AND 24),
    CONSTRAINT chk_fh_order   CHECK (close_hour > open_hour)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. ECHIPAMENT EXTRA
-- ---------------------------------------------------------------------
CREATE TABLE equipment (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    price      DECIMAL(10,2) NOT NULL,
    stock      INT NULL,                                    -- NULL = nelimitat
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_eq_price CHECK (price >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. TERMENI ȘI CONDIȚII (versionați)
--    Coloana generată current_key permite un singur rând „curent":
--    UNIQUE acceptă mai multe NULL, deci doar un rând poate avea 1.
-- ---------------------------------------------------------------------
CREATE TABLE terms_versions (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    body          TEXT NOT NULL,
    published_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_current    BOOLEAN NOT NULL DEFAULT FALSE,
    current_key   TINYINT GENERATED ALWAYS AS (IF(is_current, 1, NULL)) STORED,
    UNIQUE KEY ux_terms_single_current (current_key)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. SETĂRI GLOBALE
-- ---------------------------------------------------------------------
CREATE TABLE app_settings (
    setting_key    VARCHAR(60)  NOT NULL PRIMARY KEY,
    setting_value  VARCHAR(255) NOT NULL,
    note           VARCHAR(255)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. REZERVĂRI
-- ---------------------------------------------------------------------
CREATE TABLE bookings (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT UNSIGNED NOT NULL,
    facility_id         BIGINT UNSIGNED NOT NULL,
    type                ENUM('ora','joc') NOT NULL DEFAULT 'ora',
    status              ENUM('in_asteptare','aprobata','respinsa','anulata','finalizata')
                        NOT NULL DEFAULT 'in_asteptare',

    start_at            DATETIME NOT NULL,
    hours_count         SMALLINT NOT NULL,

    unit_price          DECIMAL(10,2) NOT NULL,
    base_amount         DECIMAL(10,2) NOT NULL,
    equipment_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_percent    DECIMAL(5,2)  NOT NULL DEFAULT 0,
    discount_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount        DECIMAL(10,2) NOT NULL,

    terms_version_id    BIGINT UNSIGNED NOT NULL,
    terms_accepted_at   DATETIME NOT NULL,

    approved_by         BIGINT UNSIGNED NULL,
    approved_at         DATETIME NULL,
    cancelled_at        DATETIME NULL,
    cancel_reason       VARCHAR(255),
    reminder_sent_at    DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_b_user      FOREIGN KEY (user_id)          REFERENCES users(id),
    CONSTRAINT fk_b_facility  FOREIGN KEY (facility_id)      REFERENCES facilities(id),
    CONSTRAINT fk_b_terms     FOREIGN KEY (terms_version_id) REFERENCES terms_versions(id),
    CONSTRAINT fk_b_approver  FOREIGN KEY (approved_by)      REFERENCES users(id),
    CONSTRAINT chk_b_hours    CHECK (hours_count > 0),
    CONSTRAINT chk_b_total    CHECK (total_amount >= 0),
    CONSTRAINT chk_b_cancel   CHECK (status <> 'anulata' OR cancelled_at IS NOT NULL),
    INDEX ix_bookings_user     (user_id, start_at),
    INDEX ix_bookings_facility (facility_id, start_at),
    INDEX ix_bookings_status   (status)
) ENGINE=InnoDB;

-- Sloturile orare. UNIQUE (facility_id, active_slot) împiedică dubla rezervare:
-- active_slot = slot_start cât timp slotul e activ, altfel NULL (iar NULL-urile
-- nu se consideră duplicate), deci sloturile anulate nu blochează reprogramarea.
CREATE TABLE booking_slots (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    booking_id   BIGINT UNSIGNED NOT NULL,
    facility_id  BIGINT UNSIGNED NOT NULL,
    slot_start   DATETIME NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    active_slot  DATETIME GENERATED ALWAYS AS (IF(is_active, slot_start, NULL)) STORED,
    CONSTRAINT fk_bs_booking  FOREIGN KEY (booking_id)  REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_bs_facility FOREIGN KEY (facility_id) REFERENCES facilities(id),
    CONSTRAINT chk_bs_hour    CHECK (MINUTE(slot_start) = 0 AND SECOND(slot_start) = 0),
    UNIQUE KEY ux_slot_no_double_booking (facility_id, active_slot),
    INDEX ix_slots_calendar (facility_id, slot_start)
) ENGINE=InnoDB;

CREATE TABLE booking_equipment (
    booking_id    BIGINT UNSIGNED NOT NULL,
    equipment_id  BIGINT UNSIGNED NOT NULL,
    quantity      INT NOT NULL DEFAULT 1,
    unit_price    DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (booking_id, equipment_id),
    CONSTRAINT fk_be_booking   FOREIGN KEY (booking_id)   REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_be_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id),
    CONSTRAINT chk_be_qty      CHECK (quantity > 0)
) ENGINE=InnoDB;

-- Trigger: la anulare/respingere, sloturile se eliberează automat.
-- (o singură instrucțiune, deci nu are nevoie de DELIMITER)
CREATE TRIGGER trg_release_slots
AFTER UPDATE ON bookings
FOR EACH ROW
    UPDATE booking_slots
       SET is_active = FALSE
     WHERE booking_id = NEW.id
       AND NEW.status IN ('anulata', 'respinsa')
       AND OLD.status NOT IN ('anulata', 'respinsa');

-- ---------------------------------------------------------------------
-- 8. PLĂȚI
--    Nu stocați niciodată numărul cardului, expirarea sau CVV-ul.
-- ---------------------------------------------------------------------
CREATE TABLE payments (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    booking_id      BIGINT UNSIGNED NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'RON',
    method          ENUM('card_online','link_plata','numerar') NOT NULL DEFAULT 'card_online',
    status          ENUM('initiata','reusita','esuata','rambursata') NOT NULL DEFAULT 'initiata',
    provider_ref    VARCHAR(120),
    card_last4      CHAR(4),
    payment_link    VARCHAR(255) UNIQUE,
    failure_reason  VARCHAR(255),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at         DATETIME NULL,
    refunded_at     DATETIME NULL,
    CONSTRAINT fk_pay_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
    CONSTRAINT chk_pay_amount CHECK (amount >= 0),
    INDEX ix_payments_booking (booking_id),
    INDEX ix_payments_status  (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. FACTURI
-- ---------------------------------------------------------------------
CREATE TABLE invoices (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    booking_id    BIGINT UNSIGNED NOT NULL,
    payment_id    BIGINT UNSIGNED NULL,
    series        VARCHAR(10) NOT NULL DEFAULT 'USV',
    number        INT NOT NULL,
    total_amount  DECIMAL(10,2) NOT NULL,
    pdf_path      VARCHAR(255),
    issued_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    emailed_at    DATETIME NULL,
    CONSTRAINT fk_inv_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
    CONSTRAINT fk_inv_payment FOREIGN KEY (payment_id) REFERENCES payments(id),
    UNIQUE KEY ux_invoice_number (series, number)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. NOTIFICĂRI
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    booking_id  BIGINT UNSIGNED NULL,
    type        ENUM('confirmare','reminder','anulare','plata','factura','info') NOT NULL DEFAULT 'info',
    message     VARCHAR(500) NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_n_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_n_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    INDEX ix_notifications_user (user_id, is_read, created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 11. AUDIT
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    actor_id    BIGINT UNSIGNED NULL,
    action      VARCHAR(60) NOT NULL,
    entity      VARCHAR(60) NOT NULL,
    entity_id   BIGINT UNSIGNED NULL,
    details     JSON,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- =====================================================================
--  VIEW-URI
-- =====================================================================

-- Ore ocupate: rezervări + blocări (blocările sunt desfăcute pe ore)
CREATE VIEW v_occupied_slots AS
WITH RECURSIVE blk AS (
    SELECT facility_id,
           TIMESTAMP(DATE_FORMAT(starts_at, '%Y-%m-%d %H:00:00')) AS h,
           ends_at
      FROM facility_blocks
    UNION ALL
    SELECT facility_id, h + INTERVAL 1 HOUR, ends_at
      FROM blk
     WHERE h + INTERVAL 1 HOUR < ends_at
)
SELECT facility_id, slot_start AS slot_start, 'rezervare' AS source
  FROM booking_slots WHERE is_active
UNION ALL
SELECT facility_id, h, 'blocat' FROM blk;

-- „Rezervările mele": activ/istoric + dacă se mai poate anula
CREATE VIEW v_my_bookings AS
SELECT b.*, f.name AS facility_name,
       (b.status IN ('in_asteptare','aprobata')) AS is_active_booking,
       (b.status IN ('in_asteptare','aprobata')
        AND TIMESTAMPDIFF(HOUR, NOW(), b.start_at) >=
            (SELECT CAST(setting_value AS UNSIGNED)
               FROM app_settings WHERE setting_key = 'cancellation_hours')) AS can_cancel
  FROM bookings b
  JOIN facilities f ON f.id = b.facility_id;

-- Panou admin: cereri + Plătit / Neplătit
CREATE VIEW v_admin_requests AS
SELECT b.id AS booking_id, u.full_name AS client, f.name AS facility,
       b.start_at, b.hours_count, b.total_amount, b.status,
       CASE WHEN EXISTS (SELECT 1 FROM payments p
                          WHERE p.booking_id = b.id AND p.status = 'reusita')
            THEN 'Plătit' ELSE 'Neplătit' END AS payment_state
  FROM bookings b
  JOIN users u      ON u.id = b.user_id
  JOIN facilities f ON f.id = b.facility_id;

-- =====================================================================
--  DATE INIȚIALE
-- =====================================================================
INSERT INTO user_statuses (code, label, discount_percent) VALUES
    ('student', 'Student',        50),
    ('cadru',   'Cadru didactic', 25),
    ('extern',  'Extern',          0);

INSERT INTO facilities (name, description, price_per_hour) VALUES
    ('Sala Polivalentă', 'Ideală pentru antrenamente, meciuri și activități sportive cu echipă.', 40),
    ('Teren de tenis',   'Teren de tenis exterior.',                                              30),
    ('Sala de fitness',  'Spațiu pregătit pentru antrenament individual.',                        20),
    ('Bază sportivă',    'Spațiu extins pentru antrenamente, jocuri și activități de grup.',      50);

-- Program implicit 08:00–21:00, toate zilele (4 facilități × 7 zile)
INSERT INTO facility_hours (facility_id, weekday, open_hour, close_hour)
SELECT f.id, d.n, 8, 21
  FROM facilities f
  CROSS JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
              UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7) AS d;

INSERT INTO equipment (name, price) VALUES
    ('Mingi', 10), ('Veste', 5), ('Plasă volei', 15);

INSERT INTO app_settings (setting_key, setting_value, note) VALUES
    ('cancellation_hours',   '12',  'Anulare gratuită cu cel puțin N ore înainte'),
    ('arrival_minutes',      '10',  'Acces cu legitimația USV cu N minute înainte'),
    ('booking_horizon_days', '7',   'Câte zile în avans se poate rezerva'),
    ('currency',             'RON', NULL);

INSERT INTO terms_versions (body, is_current) VALUES
    ('1. Rezervarea este personală și nu poate fi cedată.
2. Anularea gratuită este posibilă cu cel puțin 12 ore înainte de începere.
3. Echipamentul deteriorat se achită de utilizator.
4. Accesul se face cu legitimația USV, cu 10 minute înainte de oră.
5. Reducerile (Student 50%, Cadru didactic 25%) se aplică pe baza statutului din Cont.', TRUE);