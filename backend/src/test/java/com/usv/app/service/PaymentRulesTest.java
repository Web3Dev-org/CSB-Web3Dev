package com.usv.app.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import ro.usv.sport.dto.PaymentDetail;
import ro.usv.sport.dto.PaymentMethod;
import ro.usv.sport.dto.PaymentStatus;

import java.math.BigDecimal;
import java.net.URI;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PaymentRulesTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 25, 12, 0);
    private static final LocalDateTime TOMORROW = NOW.plusDays(1);

    // ---------- ensurePayable ----------

    @ParameterizedTest
    @ValueSource(strings = {"in_asteptare", "aprobata"})
    void allowsPaymentForActiveFutureBooking(String status) {
        assertThatCode(() -> PaymentRules.ensurePayable(status, TOMORROW, NOW, false))
                .doesNotThrowAnyException();
    }

    @ParameterizedTest
    @ValueSource(strings = {"respinsa", "anulata", "finalizata"})
    void rejectsPaymentForInactiveBooking(String status) {
        assertThatThrownBy(() -> PaymentRules.ensurePayable(status, TOMORROW, NOW, false))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void rejectsPaymentForBookingThatAlreadyStarted() {
        assertThatThrownBy(() -> PaymentRules.ensurePayable("aprobata", NOW.minusMinutes(1), NOW, false))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("început");
    }

    @Test
    void rejectsPaymentForBookingAlreadyPaid() {
        assertThatThrownBy(() -> PaymentRules.ensurePayable("aprobata", TOMORROW, NOW, true))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("achitată");
    }

    // ---------- initialStatus ----------

    @Test
    void simulatedCardPaymentSucceedsImmediately() {
        assertThat(PaymentRules.initialStatus(PaymentMethod.CARD_ONLINE)).isEqualTo(PaymentStatus.REUSITA);
    }

    @Test
    void linkAndCashPaymentsStartAsInitiated() {
        assertThat(PaymentRules.initialStatus(PaymentMethod.LINK_PLATA)).isEqualTo(PaymentStatus.INITIATA);
        assertThat(PaymentRules.initialStatus(PaymentMethod.NUMERAR)).isEqualTo(PaymentStatus.INITIATA);
    }

    @Test
    void onlyPaymentLinkMethodGetsALink() {
        assertThat(PaymentRules.needsPaymentLink(PaymentMethod.LINK_PLATA)).isTrue();
        assertThat(PaymentRules.needsPaymentLink(PaymentMethod.CARD_ONLINE)).isFalse();
        assertThat(PaymentRules.needsPaymentLink(PaymentMethod.NUMERAR)).isFalse();
    }

    // ---------- ensureLinkPayable ----------

    @Test
    void allowsPayingInitiatedLinkPayment() {
        assertThatCode(() -> PaymentRules.ensureLinkPayable(PaymentMethod.LINK_PLATA, PaymentStatus.INITIATA))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsPayingNonLinkPaymentThroughLink() {
        assertThatThrownBy(() -> PaymentRules.ensureLinkPayable(PaymentMethod.NUMERAR, PaymentStatus.INITIATA))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @ParameterizedTest
    @ValueSource(strings = {"reusita", "esuata", "rambursata"})
    void rejectsPayingLinkThatIsNoLongerInitiated(String status) {
        assertThatThrownBy(() -> PaymentRules.ensureLinkPayable(
                PaymentMethod.LINK_PLATA, PaymentStatus.fromValue(status)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    // ---------- toPaymentDetail ----------

    @Test
    void mapsPaidCardPaymentRow() {
        Map<String, Object> row = paymentRow("card_online", "reusita");
        row.put("paid_at", Timestamp.valueOf(LocalDateTime.of(2026, 11, 16, 14, 26, 12)));

        PaymentDetail detail = PaymentRules.toPaymentDetail(row);

        assertThat(detail.getId()).isEqualTo(501L);
        assertThat(detail.getBookingId()).isEqualTo(101L);
        assertThat(detail.getAmount()).isEqualByComparingTo("50");
        assertThat(detail.getCurrency()).isEqualTo("RON");
        assertThat(detail.getMethod()).isEqualTo(PaymentMethod.CARD_ONLINE);
        assertThat(detail.getStatus()).isEqualTo(PaymentStatus.REUSITA);
        assertThat(detail.getPaymentLink()).isNull();
        assertThat(detail.getCreatedAt())
                .isEqualTo(OffsetDateTime.of(2026, 11, 16, 14, 25, 0, 0, ZoneOffset.ofHours(2)));
        assertThat(detail.getPaidAt())
                .isEqualTo(OffsetDateTime.of(2026, 11, 16, 14, 26, 12, 0, ZoneOffset.ofHours(2)));
    }

    @Test
    void mapsPendingLinkPaymentRowWithNullableFields() {
        Map<String, Object> row = paymentRow("link_plata", "initiata");
        row.put("payment_link", "http://localhost:5173/plata/abc");

        PaymentDetail detail = PaymentRules.toPaymentDetail(row);

        assertThat(detail.getPaymentLink()).isEqualTo(URI.create("http://localhost:5173/plata/abc"));
        assertThat(detail.getPaidAt()).isNull();
        assertThat(detail.getCardLast4()).isNull();
        assertThat(detail.getFailureReason()).isNull();
    }

    private static Map<String, Object> paymentRow(String method, String status) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", 501L);
        row.put("booking_id", 101L);
        row.put("amount", new BigDecimal("50.00"));
        row.put("currency", "RON");
        row.put("method", method);
        row.put("status", status);
        row.put("card_last4", null);
        row.put("payment_link", null);
        row.put("failure_reason", null);
        row.put("created_at", Timestamp.valueOf(LocalDateTime.of(2026, 11, 16, 14, 25)));
        row.put("paid_at", null);
        return row;
    }
}
