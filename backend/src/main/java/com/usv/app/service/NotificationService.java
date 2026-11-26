package com.usv.app.service;

import com.usv.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ro.usv.sport.dto.Notification;
import ro.usv.sport.dto.NotificationType;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

/**
 * Notificări in-app: generare (la evenimentele rezervării/plății și memento-uri programate)
 * și citire/marcare pentru utilizatorul curent. Respectă preferința {@code users.notify_in_app}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final ZoneId BUCHAREST_ZONE = ZoneId.of("Europe/Bucharest");
    private static final String ACTIVE_BOOKING_STATUSES = "('in_asteptare','aprobata')";

    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;

    /**
     * Creează o notificare pentru proprietarul rezervării, dacă acesta are activate
     * notificările in-app. Rulează în tranzacția apelantului: dacă operația eșuează,
     * notificarea nu rămâne salvată.
     */
    public void notifyBookingOwner(long bookingId, NotificationType type, String message) {
        jdbcTemplate.update(
                "INSERT INTO notifications (user_id, booking_id, type, message, created_at) " +
                "SELECT b.user_id, b.id, ?, ?, ? FROM bookings b JOIN users u ON u.id = b.user_id " +
                "WHERE b.id = ? AND u.notify_in_app = TRUE",
                type.getValue(), message, Timestamp.valueOf(now()), bookingId);
    }

    @Transactional(readOnly = true)
    public List<Notification> listMine(Boolean unreadOnly) {
        Long userId = getCurrentUserId();
        String unreadFilter = Boolean.TRUE.equals(unreadOnly) ? " AND is_read = FALSE" : "";
        return jdbcTemplate.queryForList(
                        "SELECT id, booking_id, type, message, is_read, created_at FROM notifications " +
                        "WHERE user_id = ?" + unreadFilter + " ORDER BY created_at DESC, id DESC LIMIT 100",
                        userId)
                .stream()
                .map(NotificationService::toNotification)
                .toList();
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        Long userId = getCurrentUserId();
        List<Long> owners = jdbcTemplate.queryForList(
                "SELECT user_id FROM notifications WHERE id = ?", Long.class, notificationId);
        if (owners.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificarea nu a fost găsită.");
        }
        if (!owners.getFirst().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nu aveți acces la această notificare.");
        }
        jdbcTemplate.update("UPDATE notifications SET is_read = TRUE WHERE id = ?", notificationId);
    }

    /**
     * Trimite memento-urile scadente: rezervări active care încep în următoarele
     * {@code users.reminder_minutes} minute și nu au primit încă memento.
     * Fiecare rezervare este „revendicată” atomic prin {@code reminder_sent_at}, deci
     * nu se trimite de două ori nici dacă rulează două instanțe simultan.
     *
     * @return numărul de memento-uri procesate
     */
    @Transactional
    public int sendDueReminders() {
        Timestamp nowTs = Timestamp.valueOf(now());
        List<Map<String, Object>> due = jdbcTemplate.queryForList(
                "SELECT b.id, b.start_at, f.name AS facility_name FROM bookings b " +
                "JOIN users u ON u.id = b.user_id JOIN facilities f ON f.id = b.facility_id " +
                "WHERE b.status IN " + ACTIVE_BOOKING_STATUSES + " AND b.reminder_sent_at IS NULL " +
                "AND b.start_at > ? AND b.start_at <= DATE_ADD(?, INTERVAL u.reminder_minutes MINUTE)",
                nowTs, nowTs);

        int sent = 0;
        for (Map<String, Object> row : due) {
            long bookingId = FacilityMapper.toLong(row.get("id"));
            int claimed = jdbcTemplate.update(
                    "UPDATE bookings SET reminder_sent_at = ? WHERE id = ? AND reminder_sent_at IS NULL",
                    nowTs, bookingId);
            if (claimed == 1) {
                notifyBookingOwner(bookingId, NotificationType.REMINDER, NotificationMessages.reminder(
                        bookingId,
                        row.get("facility_name").toString(),
                        FacilityMapper.toLocalDateTime(row.get("start_at"))));
                sent++;
            }
        }
        if (sent > 0) {
            log.info("Memento-uri trimise: {}", sent);
        }
        return sent;
    }

    private static Notification toNotification(Map<String, Object> row) {
        Object bookingId = row.get("booking_id");
        return new Notification()
                .id(FacilityMapper.toLong(row.get("id")))
                .bookingId(bookingId == null ? null : FacilityMapper.toLong(bookingId))
                .type(NotificationType.fromValue(row.get("type").toString()))
                .message(row.get("message").toString())
                .isRead(Boolean.TRUE.equals(row.get("is_read")))
                .createdAt(FacilityMapper.toLocalDateTime(row.get("created_at"))
                        .atZone(BUCHAREST_ZONE).toOffsetDateTime());
    }

    private static LocalDateTime now() {
        return LocalDateTime.now(BUCHAREST_ZONE);
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autentificare necesară.");
        }
        return userRepository.findByEmail(auth.getName())
                .map(user -> user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilizator negăsit."));
    }
}
