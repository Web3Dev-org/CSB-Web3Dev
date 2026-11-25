package com.usv.app.service;

import com.usv.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ro.usv.sport.dto.PaymentDetail;
import ro.usv.sport.dto.PaymentInitiateRequest;
import ro.usv.sport.dto.PaymentInitiateResponse;
import ro.usv.sport.dto.PaymentMethod;
import ro.usv.sport.dto.PaymentStatus;

import java.math.BigDecimal;
import java.net.URI;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final ZoneId BUCHAREST_ZONE = ZoneId.of("Europe/Bucharest");
    private static final String REPLACED_REASON = "Înlocuită de o nouă inițiere a plății.";
    private static final String LINK_TOKEN_CONDITION = "p.payment_link LIKE ?";

    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final AppService appService;

    @Value("${app.payments.link-base-url}")
    private String paymentLinkBaseUrl;

    /**
     * Inițiază plata pentru o rezervare a utilizatorului curent.
     * Rândul rezervării este blocat (FOR UPDATE) ca două cereri simultane să nu creeze două plăți.
     * O reîncercare cu aceeași metodă cât plata e încă {@code initiata} întoarce plata existentă.
     */
    @Transactional
    public PaymentInitiateResponse initiate(PaymentInitiateRequest request) {
        Long userId = getCurrentUserId();
        Map<String, Object> booking = lockOwnedBooking(request.getBookingId(), userId);

        boolean alreadyPaid = hasPaymentWithStatus(request.getBookingId(), PaymentStatus.REUSITA);
        LocalDateTime now = LocalDateTime.now(BUCHAREST_ZONE);
        PaymentRules.ensurePayable(
                booking.get("status").toString(),
                FacilityMapper.toLocalDateTime(booking.get("start_at")),
                now,
                alreadyPaid
        );

        PaymentMethod method = request.getMethod();
        Map<String, Object> pending = findPendingPayment(request.getBookingId());
        if (pending != null && method.getValue().equals(pending.get("method").toString())) {
            return toInitiateResponse(PaymentRules.toPaymentDetail(pending));
        }
        if (pending != null) {
            jdbcTemplate.update(
                    "UPDATE payments SET status = 'esuata', failure_reason = ? WHERE id = ?",
                    REPLACED_REASON, pending.get("id"));
        }

        long paymentId = insertPayment(request.getBookingId(), (BigDecimal) booking.get("total_amount"), method, now);
        return toInitiateResponse(getPaymentRow(paymentId));
    }

    @Transactional(readOnly = true)
    public PaymentDetail getMyPayment(Long paymentId) {
        return PaymentRules.toPaymentDetail(findOwnedPayment("p.id = ?", paymentId, false));
    }

    @Transactional(readOnly = true)
    public PaymentDetail getMyPaymentByLink(UUID token) {
        return PaymentRules.toPaymentDetail(findOwnedPayment(LINK_TOKEN_CONDITION, linkSuffix(token), false));
    }

    /**
     * Finalizează simulat o plată prin link. Plata și rezervarea sunt blocate (FOR UPDATE),
     * iar rezervarea trebuie să fie încă plătibilă (activă, viitoare, neachitată).
     */
    @Transactional
    public PaymentDetail payByLink(UUID token) {
        Map<String, Object> payment = findOwnedPayment(LINK_TOKEN_CONDITION, linkSuffix(token), true);
        PaymentRules.ensureLinkPayable(
                PaymentMethod.fromValue(payment.get("method").toString()),
                PaymentStatus.fromValue(payment.get("status").toString()));

        Long bookingId = FacilityMapper.toLong(payment.get("booking_id"));
        Map<String, Object> booking = lockOwnedBooking(bookingId, FacilityMapper.toLong(payment.get("user_id")));
        LocalDateTime now = LocalDateTime.now(BUCHAREST_ZONE);
        PaymentRules.ensurePayable(
                booking.get("status").toString(),
                FacilityMapper.toLocalDateTime(booking.get("start_at")),
                now,
                hasPaymentWithStatus(bookingId, PaymentStatus.REUSITA));

        long paymentId = FacilityMapper.toLong(payment.get("id"));
        jdbcTemplate.update(
                "UPDATE payments SET status = 'reusita', paid_at = ?, provider_ref = ? WHERE id = ?",
                Timestamp.valueOf(now), "SIM-" + UUID.randomUUID(), paymentId);
        return getPaymentRow(paymentId);
    }

    /** Caută o plată după condiție și verifică faptul că aparține utilizatorului curent. */
    private Map<String, Object> findOwnedPayment(String condition, Object param, boolean forUpdate) {
        Long userId = getCurrentUserId();
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT p.*, b.user_id FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE "
                        + condition + (forUpdate ? " FOR UPDATE" : ""),
                param);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Plata nu a fost găsită.");
        }
        Map<String, Object> row = rows.getFirst();
        if (FacilityMapper.toLong(row.get("user_id")) != userId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nu aveți acces la această plată.");
        }
        return row;
    }

    /** Token-ul e un UUID validat, deci nu poate conține caracterele speciale ale lui LIKE. */
    private static String linkSuffix(UUID token) {
        return "%/" + token;
    }

    private Map<String, Object> lockOwnedBooking(Long bookingId, Long userId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, user_id, status, start_at, total_amount FROM bookings WHERE id = ? FOR UPDATE",
                bookingId);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Rezervarea nu a fost găsită.");
        }
        Map<String, Object> booking = rows.getFirst();
        if (FacilityMapper.toLong(booking.get("user_id")) != userId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nu aveți acces la această rezervare.");
        }
        return booking;
    }

    private boolean hasPaymentWithStatus(Long bookingId, PaymentStatus status) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM payments WHERE booking_id = ? AND status = ?",
                Integer.class, bookingId, status.getValue());
        return count != null && count > 0;
    }

    private Map<String, Object> findPendingPayment(Long bookingId) {
        return jdbcTemplate.queryForList(
                        "SELECT * FROM payments WHERE booking_id = ? AND status = 'initiata' ORDER BY id DESC LIMIT 1",
                        bookingId)
                .stream().findFirst().orElse(null);
    }

    private long insertPayment(Long bookingId, BigDecimal amount, PaymentMethod method, LocalDateTime now) {
        PaymentStatus status = PaymentRules.initialStatus(method);
        String link = PaymentRules.needsPaymentLink(method)
                ? paymentLinkBaseUrl.replaceAll("/+$", "") + "/" + UUID.randomUUID()
                : null;
        String providerRef = method == PaymentMethod.NUMERAR ? null : "SIM-" + UUID.randomUUID();
        Timestamp paidAt = status == PaymentStatus.REUSITA ? Timestamp.valueOf(now) : null;
        String currency = appService.getSettings().getCurrency();

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO payments (booking_id, amount, currency, method, status, provider_ref, " +
                    "payment_link, created_at, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, bookingId);
            ps.setBigDecimal(2, amount);
            ps.setString(3, currency);
            ps.setString(4, method.getValue());
            ps.setString(5, status.getValue());
            ps.setString(6, providerRef);
            ps.setString(7, link);
            ps.setTimestamp(8, Timestamp.valueOf(now));
            ps.setTimestamp(9, paidAt);
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Inserarea plății nu a întors un ID.");
        }
        return key.longValue();
    }

    private PaymentDetail getPaymentRow(long paymentId) {
        return PaymentRules.toPaymentDetail(
                jdbcTemplate.queryForMap("SELECT * FROM payments WHERE id = ?", paymentId));
    }

    private static PaymentInitiateResponse toInitiateResponse(PaymentDetail detail) {
        URI link = detail.getPaymentLink();
        return new PaymentInitiateResponse()
                .paymentId(detail.getId())
                .status(detail.getStatus())
                .paymentLink(link);
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
