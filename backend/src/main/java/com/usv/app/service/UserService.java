package com.usv.app.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ro.usv.sport.dto.UpdateUserRequest;
import ro.usv.sport.dto.User;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final ZoneId BUCHAREST_ZONE = ZoneId.of("Europe/Bucharest");

    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public User getCurrentUserProfile() {
        String email = getCurrentUserEmail();

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT u.id, u.email, u.full_name, u.phone, u.role, " +
                "u.status_code, us.label AS status_label, us.discount_percent, " +
                "u.status_verified, u.notify_in_app, u.notify_email, u.reminder_minutes, " +
                "u.is_active, u.created_at " +
                "FROM users u " +
                "JOIN user_statuses us ON us.code = u.status_code " +
                "WHERE u.email = ?",
                email
        );

        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilizator negăsit.");
        }

        Map<String, Object> row = rows.getFirst();
        if (!Boolean.TRUE.equals(row.get("is_active"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Contul este dezactivat.");
        }

        return mapUserDto(row);
    }

    @Transactional
    public User updateCurrentUserProfile(UpdateUserRequest request) {
        // Verificăm mai întâi că utilizatorul există și este activ (aruncă 401 / 403 dacă nu)
        User current = getCurrentUserProfile();

        if (request == null) {
            return current;
        }

        List<String> setClauses = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        if (request.getFullName() != null) {
            String trimmedName = request.getFullName().trim();
            if (trimmedName.length() < 2) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Numele complet trebuie să conțină cel puțin 2 caractere."
                );
            }
            setClauses.add("full_name = ?");
            params.add(trimmedName);
        }

        if (request.getPhone() != null) {
            String trimmedPhone = request.getPhone().trim();
            setClauses.add("phone = ?");
            // Cu openApiNullable=false, un string gol ("") permite ștergerea numărului (NULL în DB)
            params.add(trimmedPhone.isEmpty() ? null : trimmedPhone);
        }

        if (request.getNotifyInApp() != null) {
            setClauses.add("notify_in_app = ?");
            params.add(request.getNotifyInApp());
        }

        if (request.getNotifyEmail() != null) {
            setClauses.add("notify_email = ?");
            params.add(request.getNotifyEmail());
        }

        if (request.getReminderMinutes() != null) {
            setClauses.add("reminder_minutes = ?");
            params.add(request.getReminderMinutes().getValue());
        }

        if (!setClauses.isEmpty()) {
            params.add(current.getId());
            String sql = "UPDATE users SET " + String.join(", ", setClauses) + " WHERE id = ?";
            jdbcTemplate.update(sql, params.toArray());
        }

        return getCurrentUserProfile();
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

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autentificare necesară.");
        }
        return auth.getName();
    }
}