package com.usv.app.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import ro.usv.sport.dto.PaymentDetail;
import ro.usv.sport.dto.PaymentMethod;
import ro.usv.sport.dto.PaymentStatus;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.Set;

/**
 * Reguli de business pure (fără acces la DB) pentru plăți, plus maparea rândului SQL în DTO.
 *
 * <p>Nu există încă un procesator de plăți real: plata cu cardul este simulată și reușește
 * imediat (datele cardului sunt validate doar în UI și NU ajung la server), plata prin link
 * și cea în numerar rămân {@code initiata} până la confirmare.
 */
final class PaymentRules {

    private static final ZoneId BUCHAREST_ZONE = ZoneId.of("Europe/Bucharest");
    private static final Set<String> PAYABLE_BOOKING_STATUSES = Set.of("in_asteptare", "aprobata");

    private PaymentRules() {
    }

    static void ensurePayable(String bookingStatus, LocalDateTime startAt, LocalDateTime now, boolean alreadyPaid) {
        if (!PAYABLE_BOOKING_STATUSES.contains(bookingStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Rezervarea nu mai poate fi achitată (status: " + bookingStatus + ").");
        }
        if (!startAt.isAfter(now)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Rezervarea a început deja și nu mai poate fi achitată online.");
        }
        if (alreadyPaid) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Rezervarea este deja achitată.");
        }
    }

    static void ensureLinkPayable(PaymentMethod method, PaymentStatus status) {
        if (method != PaymentMethod.LINK_PLATA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Această plată nu se efectuează prin link.");
        }
        if (status != PaymentStatus.INITIATA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Link-ul de plată nu mai este valabil (status: " + status.getValue() + ").");
        }
    }

    static PaymentStatus initialStatus(PaymentMethod method) {
        return method == PaymentMethod.CARD_ONLINE ? PaymentStatus.REUSITA : PaymentStatus.INITIATA;
    }

    static boolean needsPaymentLink(PaymentMethod method) {
        return method == PaymentMethod.LINK_PLATA;
    }

    static PaymentDetail toPaymentDetail(Map<String, Object> row) {
        Object link = row.get("payment_link");
        return new PaymentDetail()
                .id(FacilityMapper.toLong(row.get("id")))
                .bookingId(FacilityMapper.toLong(row.get("booking_id")))
                .amount(toBigDecimal(row.get("amount")))
                .currency(row.get("currency").toString())
                .method(PaymentMethod.fromValue(row.get("method").toString()))
                .status(PaymentStatus.fromValue(row.get("status").toString()))
                .cardLast4(asNullableString(row.get("card_last4")))
                .paymentLink(link == null ? null : URI.create(link.toString()))
                .failureReason(asNullableString(row.get("failure_reason")))
                .createdAt(toBucharestOffset(row.get("created_at")))
                .paidAt(row.get("paid_at") == null ? null : toBucharestOffset(row.get("paid_at")));
    }

    private static OffsetDateTime toBucharestOffset(Object rawValue) {
        return FacilityMapper.toLocalDateTime(rawValue).atZone(BUCHAREST_ZONE).toOffsetDateTime();
    }

    private static String asNullableString(Object value) {
        return value == null ? null : value.toString();
    }

    private static BigDecimal toBigDecimal(Object value) {
        return value instanceof BigDecimal bd ? bd : new BigDecimal(value.toString());
    }
}
