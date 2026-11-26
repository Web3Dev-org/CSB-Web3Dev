package com.usv.app.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationMessagesTest {

    private static final OffsetDateTime START =
            OffsetDateTime.of(2026, 11, 27, 15, 0, 0, 0, ZoneOffset.ofHours(2));

    @Test
    void bookingCreatedMentionsPendingApproval() {
        assertThat(NotificationMessages.bookingCreated(12L, "Sala Polivalentă", START))
                .isEqualTo("Rezervarea #12 la Sala Polivalentă (27.11.2026, 15:00) a fost înregistrată "
                        + "și așteaptă aprobarea.");
    }

    @Test
    void bookingApproved() {
        assertThat(NotificationMessages.bookingApproved(12L, "Sala Polivalentă", START))
                .isEqualTo("Rezervarea #12 la Sala Polivalentă (27.11.2026, 15:00) a fost aprobată.");
    }

    @Test
    void bookingRejectedIncludesReasonWhenPresent() {
        assertThat(NotificationMessages.bookingRejected(12L, "Sala Polivalentă", START, "Sala e în renovare"))
                .isEqualTo("Rezervarea #12 la Sala Polivalentă (27.11.2026, 15:00) a fost respinsă. "
                        + "Motiv: Sala e în renovare");
    }

    @Test
    void bookingRejectedWithoutReason() {
        assertThat(NotificationMessages.bookingRejected(12L, "Sala Polivalentă", START, "  "))
                .isEqualTo("Rezervarea #12 la Sala Polivalentă (27.11.2026, 15:00) a fost respinsă.");
    }

    @Test
    void bookingCancelled() {
        assertThat(NotificationMessages.bookingCancelled(12L, "Sala Polivalentă", START))
                .isEqualTo("Rezervarea #12 la Sala Polivalentă (27.11.2026, 15:00) a fost anulată.");
    }

    @Test
    void paymentSucceededShowsAmountWithTwoDecimals() {
        assertThat(NotificationMessages.paymentSucceeded(12L, new BigDecimal("15"), "RON"))
                .isEqualTo("Plata de 15.00 RON pentru rezervarea #12 a fost confirmată.");
    }

    @Test
    void reminderUsesLocalStartTime() {
        assertThat(NotificationMessages.reminder(12L, "Teren de tenis", LocalDateTime.of(2026, 11, 27, 9, 0)))
                .isEqualTo("Memento: rezervarea #12 la Teren de tenis începe pe 27.11.2026, la 09:00.");
    }

    @Test
    void startTimeIsShownInBucharestZoneRegardlessOfOffset() {
        OffsetDateTime utcStart = OffsetDateTime.of(2026, 11, 27, 13, 0, 0, 0, ZoneOffset.UTC);

        assertThat(NotificationMessages.bookingApproved(12L, "Sala", utcStart))
                .contains("(27.11.2026, 15:00)");
    }

    @Test
    void messagesAreCappedAtColumnLength() {
        String longReason = "x".repeat(1000);

        assertThat(NotificationMessages.bookingRejected(12L, "Sala", START, longReason))
                .hasSize(NotificationMessages.MAX_LENGTH)
                .endsWith("…");
    }
}
