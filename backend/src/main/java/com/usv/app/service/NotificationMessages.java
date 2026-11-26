package com.usv.app.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** Textele notificărilor in-app (funcții pure, fără acces la DB). */
final class NotificationMessages {

    /** Lungimea coloanei {@code notifications.message}. */
    static final int MAX_LENGTH = 500;

    private static final ZoneId BUCHAREST_ZONE = ZoneId.of("Europe/Bucharest");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private NotificationMessages() {
    }

    static String bookingCreated(long bookingId, String facility, OffsetDateTime startAt) {
        return cap(bookingPrefix(bookingId, facility, startAt) + " a fost înregistrată și așteaptă aprobarea.");
    }

    static String bookingApproved(long bookingId, String facility, OffsetDateTime startAt) {
        return cap(bookingPrefix(bookingId, facility, startAt) + " a fost aprobată.");
    }

    static String bookingRejected(long bookingId, String facility, OffsetDateTime startAt, String reason) {
        String base = bookingPrefix(bookingId, facility, startAt) + " a fost respinsă.";
        return cap(reason == null || reason.isBlank() ? base : base + " Motiv: " + reason.trim());
    }

    static String bookingCancelled(long bookingId, String facility, OffsetDateTime startAt) {
        return cap(bookingPrefix(bookingId, facility, startAt) + " a fost anulată.");
    }

    static String paymentSucceeded(long bookingId, BigDecimal amount, String currency) {
        return cap("Plata de " + amount.setScale(2, RoundingMode.HALF_UP).toPlainString() + " " + currency
                + " pentru rezervarea #" + bookingId + " a fost confirmată.");
    }

    static String reminder(long bookingId, String facility, LocalDateTime startLocal) {
        return cap("Memento: rezervarea #" + bookingId + " la " + facility + " începe pe "
                + startLocal.format(DATE) + ", la " + startLocal.format(TIME) + ".");
    }

    private static String bookingPrefix(long bookingId, String facility, OffsetDateTime startAt) {
        LocalDateTime local = startAt.atZoneSameInstant(BUCHAREST_ZONE).toLocalDateTime();
        return "Rezervarea #" + bookingId + " la " + facility
                + " (" + local.format(DATE) + ", " + local.format(TIME) + ")";
    }

    private static String cap(String message) {
        return message.length() <= MAX_LENGTH ? message : message.substring(0, MAX_LENGTH - 1) + "…";
    }
}
