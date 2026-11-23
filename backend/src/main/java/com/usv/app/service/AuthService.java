package com.usv.app.service;

import com.usv.app.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ro.usv.sport.dto.AuthResponse;
import ro.usv.sport.dto.ForgotPasswordRequest;
import ro.usv.sport.dto.LoginRequest;
import ro.usv.sport.dto.RegisterRequest;
import ro.usv.sport.dto.ResetPasswordRequest;
import ro.usv.sport.dto.User;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final ZoneId BUCHAREST_ZONE = ZoneId.of("Europe/Bucharest");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim();

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT u.id, u.email, u.password_hash, u.full_name, u.phone, u.role, " +
                "u.status_code, us.label AS status_label, us.discount_percent, " +
                "u.status_verified, u.notify_in_app, u.notify_email, u.reminder_minutes, " +
                "u.is_active, u.created_at " +
                "FROM users u " +
                "JOIN user_statuses us ON us.code = u.status_code " +
                "WHERE u.email = ?",
                email
        );

        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email sau parolă incorectă.");
        }

        Map<String, Object> row = rows.getFirst();
        String passwordHash = row.get("password_hash").toString();

        if (!passwordEncoder.matches(request.getPassword(), passwordHash)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email sau parolă incorectă.");
        }

        if (!Boolean.TRUE.equals(row.get("is_active"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Contul este dezactivat.");
        }

        long userId = ((Number) row.get("id")).longValue();
        Timestamp nowTs = Timestamp.valueOf(LocalDateTime.now(BUCHAREST_ZONE));
        jdbcTemplate.update("UPDATE users SET last_login_at = ? WHERE id = ?", nowTs, userId);

        User userDto = mapUserDto(row);
        String token = jwtService.generateToken(userDto.getEmail(), row.get("role").toString());

        return new AuthResponse()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpirationSeconds())
                .user(userDto);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);

        Integer existing = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email = ?",
                Integer.class,
                email
        );
        if (existing != null && existing > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Există deja un cont înregistrat cu această adresă de e-mail."
            );
        }

        String passwordHash = passwordEncoder.encode(request.getPassword());
        String fullName = request.getFullName().trim();
        String phone = (request.getPhone() != null && !request.getPhone().isBlank())
                ? request.getPhone().trim()
                : null;

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO users (email, password_hash, full_name, phone) VALUES (?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, email);
            ps.setString(2, passwordHash);
            ps.setString(3, fullName);
            if (phone != null) {
                ps.setString(4, phone);
            } else {
                ps.setNull(4, Types.VARCHAR);
            }
            return ps;
        }, keyHolder);

        long userId = Objects.requireNonNull(keyHolder.getKey()).longValue();

        Map<String, Object> createdRow = jdbcTemplate.queryForList(
                "SELECT u.id, u.email, u.full_name, u.phone, u.role, " +
                "u.status_code, us.label AS status_label, us.discount_percent, " +
                "u.status_verified, u.notify_in_app, u.notify_email, u.reminder_minutes, " +
                "u.created_at " +
                "FROM users u " +
                "JOIN user_statuses us ON us.code = u.status_code " +
                "WHERE u.id = ?",
                userId
        ).getFirst();

        User userDto = mapUserDto(createdRow);
        String token = jwtService.generateToken(userDto.getEmail(), createdRow.get("role").toString());

        return new AuthResponse()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpirationSeconds())
                .user(userDto);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().trim();

        List<Map<String, Object>> users = jdbcTemplate.queryForList(
                "SELECT id, is_active FROM users WHERE email = ?",
                email
        );

        // Răspundem 204 indiferent dacă adresa există sau nu, pentru a evita enumerarea conturilor
        if (users.isEmpty() || !Boolean.TRUE.equals(users.getFirst().get("is_active"))) {
            return;
        }

        long userId = ((Number) users.getFirst().get("id")).longValue();
        String rawToken = generateResetToken();
        String tokenHash = sha256Hex(rawToken);
        Timestamp expiresAt = Timestamp.valueOf(LocalDateTime.now(BUCHAREST_ZONE).plusHours(1));

        jdbcTemplate.update(
                "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
                userId, tokenHash, expiresAt
        );

        // TODO: Trimite `rawToken` pe e-mail
        log.info("Token de resetare parolă generat pentru userId={}", userId);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String tokenHash = sha256Hex(request.getToken().trim());

        List<Map<String, Object>> tokens = jdbcTemplate.queryForList(
                "SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?",
                tokenHash
        );

        if (tokens.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token de resetare invalid.");
        }

        Map<String, Object> tokenRow = tokens.getFirst();
        LocalDateTime nowLocal = LocalDateTime.now(BUCHAREST_ZONE);
        LocalDateTime expiresAt = switch (tokenRow.get("expires_at")) {
            case LocalDateTime ldt -> ldt;
            case Timestamp ts -> ts.toLocalDateTime();
            case Object obj -> LocalDateTime.parse(obj.toString().replace(" ", "T"));
        };

        if (tokenRow.get("used_at") != null || !expiresAt.isAfter(nowLocal)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Token-ul de resetare a expirat sau a fost deja utilizat."
            );
        }

        long tokenId = ((Number) tokenRow.get("id")).longValue();
        long userId = ((Number) tokenRow.get("user_id")).longValue();
        String newPasswordHash = passwordEncoder.encode(request.getNewPassword());
        Timestamp usedAtTs = Timestamp.valueOf(nowLocal);

        jdbcTemplate.update("UPDATE users SET password_hash = ? WHERE id = ?", newPasswordHash, userId);
        jdbcTemplate.update("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?", usedAtTs, tokenId);
    }

    private User mapUserDto(Map<String, Object> row) {
        return new User()
                .id(((Number) row.get("id")).longValue())
                .email(row.get("email").toString())
                .fullName(row.get("full_name").toString())
                .phone(row.get("phone") != null ? row.get("phone").toString() : null)
                .role(User.RoleEnum.fromValue(row.get("role").toString()))
                .statusCode(row.get("status_code").toString())
                .statusLabel(row.get("status_label").toString())
                .discountPercent(new BigDecimal(row.get("discount_percent").toString()))
                .statusVerified(Boolean.TRUE.equals(row.get("status_verified")))
                .notifyInApp(Boolean.TRUE.equals(row.get("notify_in_app")))
                .notifyEmail(Boolean.TRUE.equals(row.get("notify_email")))
                .reminderMinutes(User.ReminderMinutesEnum.fromValue(
                        ((Number) row.get("reminder_minutes")).intValue()
                ))
                .createdAt(toOffsetDateTime(row.get("created_at")));
    }

    private OffsetDateTime toOffsetDateTime(Object rawValue) {
        return switch (rawValue) {
            case null -> null;
            case LocalDateTime ldt -> ldt.atZone(BUCHAREST_ZONE).toOffsetDateTime();
            case Timestamp ts -> ts.toLocalDateTime().atZone(BUCHAREST_ZONE).toOffsetDateTime();
            case OffsetDateTime odt -> odt.atZoneSameInstant(BUCHAREST_ZONE).toOffsetDateTime();
            default -> LocalDateTime.parse(rawValue.toString().replace(" ", "T"))
                    .atZone(BUCHAREST_ZONE)
                    .toOffsetDateTime();
        };
    }

    private String generateResetToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponibil", e);
        }
    }
}